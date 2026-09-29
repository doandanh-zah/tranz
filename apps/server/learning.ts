import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Artifact } from '../../packages/shared/contracts';
import type { Lifecycle } from './sessions';
import { publicSession } from './sessions';
import type { TextAI } from './ai';
import { ApiError } from './app';
import type { RecordSession } from './store';

const SESSION_AI_LIMIT = 500;
/** Single-request MVP processor; longer transcripts need chunking (not implemented). */
export const MAX_NOTES_CHARACTERS = 60000;

const list = z.array(z.string().max(1200)).max(30);
export const artifactSchema = z.object({
  summary: z.string().max(4000),
  decisions: list,
  actions: list,
  improvedReplies: list,
  vocabulary: z
    .array(z.object({ phrase: z.string().max(180), meaning: z.string().max(600), example: z.string().max(600) }))
    .max(20),
}) satisfies z.ZodType<Artifact>;

const NOTES_INSTRUCTION =
  'Summarize only the supplied transcript. The transcript mixes every participant; never infer who said what. ' +
  'Return {"summary":string,"decisions":string[],"actions":string[],"improvedReplies":string[],' +
  '"vocabulary":[{"phrase":string,"meaning":string,"example":string}]}. ' +
  'Write summary and meanings in Vietnamese; phrases, examples and improved replies in English. ' +
  'Use empty arrays when the transcript does not support an item. ' +
  'Improved replies are illustrative rewrites of useful moments, never attributed to the user.';

const idParams = z.object({ id: z.string().uuid() });

export function learningRoutes(
  app: FastifyInstance,
  life: Lifecycle,
  ai: TextAI,
  options: { autoFinalize: boolean },
) {
  const { store } = life;

  const transcriptOf = (session: RecordSession) =>
    session.segments
      .filter((segment) => segment.final)
      .map((segment) => segment.text)
      .join('\n');

  /** Exactly one notes job per session at a time; a finished artifact is returned as-is. */
  function finalize(id: string) {
    return life.exclusive(`finalize:${id}`, async () => {
      const session = life.get(id);
      if (session.state !== 'stopped') throw new ApiError(409, 'Hãy dừng phiên trước khi tạo ghi chú.');
      if (session.artifact) return publicSession(session);
      const transcript = transcriptOf(session);
      if (!transcript) throw new ApiError(409, 'Chưa có câu nào hoàn chỉnh để tóm tắt.');
      if (transcript.length > MAX_NOTES_CHARACTERS) {
        throw fail(session, 413, 'Cuộc họp quá dài để tạo ghi chú ở phiên bản này. Bản ghi hội thoại vẫn còn nguyên.');
      }
      if (session.aiCalls >= SESSION_AI_LIMIT) throw fail(session, 429, 'Phiên này đã dùng hết giới hạn yêu cầu AI.');
      session.aiCalls++;
      session.processing = 'processing';
      session.processingError = undefined;
      store.save();
      try {
        const artifact = await ai.json(NOTES_INSTRUCTION, { transcript }, artifactSchema);
        // Deleted while the provider was working: drop the result so nothing is recreated.
        if (store.sessions.get(id) !== session) throw new ApiError(409, 'Phiên này đã bị xoá.');
        session.artifact = artifact;
        session.processing = 'ready';
        store.save();
        return publicSession(session);
      } catch (error) {
        if (store.sessions.get(id) === session) {
          throw error instanceof ApiError
            ? fail(session, error.statusCode, error.message)
            : fail(session, 502, 'Không tạo được ghi chú từ câu trả lời của AI. Vui lòng thử lại.');
        }
        throw error;
      }
    });
  }

  function fail(session: RecordSession, status: number, message: string) {
    session.processing = 'error';
    session.processingError = message;
    store.save();
    return new ApiError(status, message);
  }

  // Stopping never waits for the AI: notes start in the background once the session is stopped.
  if (options.autoFinalize) {
    life.onStopped((session) => {
      if (life.closing || session.artifact || !transcriptOf(session)) return;
      session.processing = 'processing';
      void finalize(session.id).catch(() => {});
    });
  }

  app.post('/api/sessions/:id/finalize', async (req) => finalize(idParams.parse(req.params).id));

  app.post('/api/sessions/:id/save', async (req) => {
    const { id } = idParams.parse(req.params);
    const session = life.get(id);
    if (!session.retain && !session.segments.length && !session.artifact) {
      throw new ApiError(409, 'Không còn nội dung để lưu: phiên tạm thời đã bị xoá khi Tranz khởi động lại.');
    }
    session.retain = true;
    store.save();
    return publicSession(session);
  });
}
