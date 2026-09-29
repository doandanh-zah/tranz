import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import { createApp } from '../apps/server/app';
import { configSchema } from '../apps/server/config';
import type { TextAI } from '../apps/server/ai';
import type { VoiceProvider } from '../apps/server/agora';

/** Synthetic test-only token; never a real credential. */
export const TOKEN = 'synthetic-token-'.repeat(4);
export const headers = { authorization: `Bearer ${TOKEN}` };
export const syntheticProfile = {
  name: 'Synthetic profile',
  role: 'Engineer',
  facts: 'The launch date is undecided.',
  goal: 'Plan the next sprint',
  glossary: 'Orbit: synthetic codename',
  tone: 'clear' as const,
};

export const silentVoice: VoiceProvider = {
  start: async () => 'synthetic-agent',
  stop: async () => {},
  credentials: () => {
    throw new Error('unused in tests');
  },
};

export type AiCall = { instruction: string; data: unknown };

/** Mock OpenAI-compatible adapter: returns `respond(call)` validated against the route's schema. */
export function mockAI(respond: (call: AiCall) => unknown | Promise<unknown>) {
  const calls: AiCall[] = [];
  const ai: TextAI = {
    async json<T>(instruction: string, data: unknown, schema: z.ZodType<T>) {
      const call = { instruction, data };
      calls.push(call);
      return schema.parse(await respond(call));
    },
  };
  return { ai, calls };
}

export async function testApp(options: { ai?: TextAI; voice?: VoiceProvider; dir?: string } = {}) {
  const dir = options.dir ?? mkdtempSync(join(tmpdir(), 'tranz-test-'));
  const app = await createApp(
    configSchema.parse({ ACCESS_TOKEN: TOKEN, DATA_KEY: 'f'.repeat(64), DATA_DIR: dir }),
    options.voice ?? silentVoice,
    options.ai,
  );
  const request = async (method: string, url: string, payload?: unknown) => {
    const response = await app.inject({
      method: method as 'GET',
      url,
      headers,
      ...(payload === undefined ? {} : { payload: payload as object }),
    });
    return { status: response.statusCode, body: response.json() };
  };
  return {
    app,
    dir,
    request,
    async close(removeDir = true) {
      await app.close();
      if (removeDir) rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Creates a profile and a listening session carrying the given final segments. */
export async function listeningSession(
  request: Awaited<ReturnType<typeof testApp>>['request'],
  texts: string[],
  retain = false,
) {
  const profile = (await request('POST', '/api/profiles', syntheticProfile)).body;
  const id = randomUUID();
  await request('POST', '/api/sessions', { id, profileId: profile.id, retain });
  await request('POST', `/api/sessions/${id}/heartbeat`, { state: 'listening' });
  await request(
    'PUT',
    `/api/sessions/${id}/segments`,
    texts.map((text, index) => ({ id: `s${index + 1}`, text, final: true, revision: 1, at: index })),
  );
  return { id, profile };
}
