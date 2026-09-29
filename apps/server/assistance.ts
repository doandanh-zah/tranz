import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import {
  assistInput,
  profileInput,
  type AssistKind,
  type Profile,
  type ReplyStyle,
  type Suggestion,
} from '../../packages/shared/contracts';
import type { Lifecycle } from './sessions';
import type { TextAI } from './ai';
import { ApiError } from './app';

const MAX_PROFILES = 50;
const SESSION_AI_LIMIT = 500;
const CLARIFICATION = 'Could you clarify that so I can give you an accurate answer?';

/** How many recent final segments each task may send to the provider (data minimisation). */
const segmentWindow: Record<AssistKind, number> = { reply: 30, 'catch-up': 12, compose: 6 };

const instructions: Record<AssistKind, string> = {
  reply:
    'Suggest one concise, speakable English reply to the question. Ground every project claim only in the context and segments. ' +
    'If they do not support an answer, write a polite clarification question instead and set uncertain true. ' +
    'Never present an unsupported or inferred fact as confirmed.',
  'catch-up':
    'Explain in Vietnamese, in at most four short sentences, what was just discussed in the segments. ' +
    'Do not add facts. Say which parts are unclear. Set uncertain true when the segments are fragmentary.',
  compose:
    'Rewrite the Vietnamese draft as natural spoken English in the requested tone. Keep its meaning. ' +
    'Do not add facts, numbers or commitments that are not in the draft. Set uncertain true if the draft is ambiguous.',
};

const styleWording: Record<ReplyStyle, string> = {
  clear: 'clear and natural',
  shorter: 'shorter than usual',
  simple: 'simple English with common words',
  professional: 'more professional',
  clarify: 'a clarification question rather than an answer',
};

const modelOutput = z.object({
  text: z.string().trim().min(1).max(2000),
  evidence: z.array(z.string().max(120)).max(30),
  uncertain: z.boolean(),
});

const idParams = z.object({ id: z.string().uuid() });

function hasProfileContent(profile: Profile) {
  return [profile.role, profile.facts, profile.goal, profile.glossary].some((value) => value.trim());
}

/** Only user-authored fields are sent; storage identifiers stay local. */
function groundingContext(profile: Profile) {
  const { name, role, facts, goal, glossary, tone } = profile;
  return { name, role, facts, goal, glossary, tone };
}

export function assistanceRoutes(app: FastifyInstance, life: Lifecycle, ai: TextAI) {
  const { store } = life;

  app.get('/api/profiles', async () =>
    [...store.profiles.values()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  app.post('/api/profiles', async (req) => {
    if (store.profiles.size >= MAX_PROFILES) {
      throw new ApiError(409, 'Đã đạt giới hạn số ngữ cảnh. Hãy xoá bớt ngữ cảnh không dùng.');
    }
    const profile: Profile = { ...profileInput.parse(req.body), id: randomUUID(), version: 1 };
    store.profiles.set(profile.id, profile);
    store.save();
    return profile;
  });

  app.put('/api/profiles/:id', async (req) => {
    const { id } = idParams.parse(req.params);
    const previous = store.profiles.get(id);
    if (!previous) throw new ApiError(404, 'Không tìm thấy ngữ cảnh này. Có thể nó đã bị xoá.');
    // Sessions hold their own snapshot, so editing never changes an existing session.
    const profile: Profile = { ...profileInput.parse(req.body), id, version: previous.version + 1 };
    store.profiles.set(id, profile);
    store.save();
    return profile;
  });

  app.delete('/api/profiles/:id', async (req) => {
    const { id } = idParams.parse(req.params);
    store.profiles.delete(id);
    store.save();
    return { ok: true };
  });

  app.post('/api/sessions/:id/assist', async (req): Promise<Suggestion> => {
    const { id } = idParams.parse(req.params);
    const session = life.get(id);
    const input = assistInput.parse(req.body);
    const { kind } = input;
    const draft = input.text.trim();
    if (kind === 'compose' && !draft) throw new ApiError(400, 'Hãy viết điều bạn muốn nói bằng tiếng Việt trước.');

    const segments = session.segments
      .filter((segment) => segment.final)
      .slice(-segmentWindow[kind])
      .map(({ id: segmentId, text }) => ({ id: segmentId, text }));
    if (!segments.length && kind !== 'compose') {
      throw new ApiError(409, 'Chưa có câu nào được ghi lại hoàn chỉnh. Hãy chờ người nói hết câu.');
    }
    if (session.aiCalls >= SESSION_AI_LIMIT) {
      throw new ApiError(429, 'Phiên này đã dùng hết giới hạn yêu cầu AI.');
    }
    session.aiCalls++;

    const question = kind === 'reply' ? draft || undefined : undefined;
    const result = await ai.json(
      `${instructions[kind]} Return {"text":string,"evidence":string[],"uncertain":boolean}. ` +
        'Evidence entries must be IDs of segments you relied on, or "profile" when you relied on the context. Never invent IDs. ' +
        'The style changes wording only.',
      {
        task: kind,
        style: styleWording[input.style],
        question: question ?? (kind === 'reply' ? 'the most recent question in the segments' : undefined),
        draft: kind === 'compose' ? draft : undefined,
        context: groundingContext(session.context),
        segments,
      },
      modelOutput,
    );

    // A late completion must not resurrect a deleted session's content.
    if (store.sessions.get(id) !== session) throw new ApiError(409, 'Phiên này đã bị xoá.');

    const known = new Set(segments.map((segment) => segment.id));
    if (hasProfileContent(session.context)) known.add('profile');
    const evidence = [...new Set(result.evidence.filter((item) => known.has(item)))];

    if (kind === 'reply' && !evidence.length) {
      return { kind, text: CLARIFICATION, evidence: [], uncertain: true, question };
    }
    return { kind, text: result.text, evidence, uncertain: result.uncertain, question };
  });
}
