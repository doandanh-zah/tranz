import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Segment } from '../../packages/shared/contracts';
import type { Lifecycle } from './sessions';
import type { TextAI } from './ai';
import { ApiError } from './app';
import type { RecordSession } from './store';

const SESSION_AI_LIMIT = 500;
/** Lines per provider request; batching keeps slower providers (ChatGPT via Codex) from falling behind. */
export const MAX_BATCH = 8;

const INSTRUCTION =
  'Translate each English line into natural Vietnamese, preserving uncertainty and technical terms from the glossary. ' +
  'Return {"translations":[{"id":string,"translation":string}]} with exactly one entry per input line, using the same ids.';
const output = z.object({
  translations: z.array(z.object({ id: z.string().max(120), translation: z.string().min(1).max(8000) })).max(MAX_BATCH),
});
const idParams = z.object({ id: z.string().uuid() });
const target = z.object({ segmentId: z.string(), revision: z.number().int() });
const deviceTranslation = target.extend({ translation: z.string().trim().min(1).max(8000) });

/**
 * Translates final segments, each tied to the revision it was requested for. A completion is dropped
 * if the session was deleted or the segment changed meanwhile, so a stale translation never shows.
 */
export function translationRoutes(app: FastifyInstance, life: Lifecycle, ai: TextAI) {
  const pending = new Map<string, Promise<unknown>>();
  const keyOf = (sessionId: string, segment: { id: string }, revision: number) => `${sessionId}:${segment.id}:${revision}`;

  function translate(sessionId: string, session: RecordSession, batch: { segment: Segment; revision: number }[]) {
    session.aiCalls++;
    for (const { segment } of batch) segment.translationState = 'pending';
    const job = (async () => {
      try {
        const result = await ai.json(
          INSTRUCTION,
          { lines: batch.map(({ segment }) => ({ id: segment.id, text: segment.text })), glossary: session.context.glossary },
          output,
        );
        if (life.store.sessions.get(sessionId) !== session) throw new ApiError(409, 'Phiên này đã bị xoá.');
        const byId = new Map(result.translations.map((item) => [item.id, item.translation]));
        for (const { segment, revision } of batch) {
          if (segment.revision !== revision) continue; // corrected meanwhile; a new request will follow
          const translation = byId.get(segment.id);
          segment.translation = translation;
          segment.translationState = translation ? 'ready' : 'error';
        }
        life.store.save();
        return batch.map(({ segment }) => segment);
      } catch (error) {
        if (life.store.sessions.get(sessionId) === session) {
          for (const { segment, revision } of batch) if (segment.revision === revision) segment.translationState = 'error';
          life.store.save();
        }
        throw error;
      } finally {
        for (const { segment, revision } of batch) pending.delete(keyOf(sessionId, segment, revision));
      }
    })();
    for (const { segment, revision } of batch) pending.set(keyOf(sessionId, segment, revision), job);
    return job;
  }

  function limitReached(session: RecordSession) {
    if (session.aiCalls >= SESSION_AI_LIMIT) throw new ApiError(429, 'Phiên này đã dùng hết giới hạn yêu cầu AI.');
  }

  app.post('/api/sessions/:id/translate', async (req) => {
    const { id } = idParams.parse(req.params);
    const session = life.get(id);
    const { segmentId, revision } = target.parse(req.body);
    const segment = session.segments.find((x) => x.id === segmentId);
    if (!segment || segment.revision !== revision || !segment.final) throw new ApiError(409, 'Câu này đã thay đổi hoặc chưa nói xong.');
    if (segment.translation) return segment;
    const existing = pending.get(keyOf(id, segment, revision));
    if (existing) {
      await existing;
      return segment;
    }
    limitReached(session);
    await translate(id, session, [{ segment, revision }]);
    if (segment.revision !== revision) throw new ApiError(409, 'Câu này đã thay đổi hoặc phiên đã bị xoá.');
    return segment;
  });

  app.post('/api/sessions/:id/translate-batch', async (req) => {
    const { id } = idParams.parse(req.params);
    const session = life.get(id);
    const { items } = z.object({ items: z.array(target).min(1).max(MAX_BATCH) }).parse(req.body);
    // Skip lines that changed, are not final, are done, or already have a request in flight.
    const batch = items.flatMap(({ segmentId, revision }) => {
      const segment = session.segments.find((x) => x.id === segmentId);
      if (!segment || !segment.final || segment.revision !== revision || segment.translation) return [];
      return pending.has(keyOf(id, segment, revision)) ? [] : [{ segment, revision }];
    });
    if (!batch.length) return { segments: [] };
    limitReached(session);
    return { segments: await translate(id, session, batch) };
  });

  /**
   * Persists translations produced by the browser's on-device model. The panel is trusted only as
   * an authenticated client: ids, final state, revision and output bounds are checked again here.
   */
  app.put('/api/sessions/:id/translations', async (req) => {
    const { id } = idParams.parse(req.params);
    const session = life.get(id);
    const { items } = z.object({ items: z.array(deviceTranslation).min(1).max(MAX_BATCH) }).parse(req.body);
    const segments = items.flatMap(({ segmentId, revision, translation }) => {
      const segment = session.segments.find((candidate) => candidate.id === segmentId);
      if (!segment || !segment.final || segment.revision !== revision) return [];
      segment.translation = translation;
      segment.translationState = 'ready';
      return [segment];
    });
    if (segments.length) life.store.save();
    return { segments };
  });
}
