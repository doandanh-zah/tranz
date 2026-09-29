import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { textAI } from '../apps/server/ai';
import { configSchema } from '../apps/server/config';
import { HEARTBEAT_TIMEOUT, Lifecycle, MAX_SESSION_DURATION, TEMPORARY_RETENTION } from '../apps/server/sessions';
import { Store } from '../apps/server/store';
import type { VoiceProvider } from '../apps/server/agora';
import { listeningSession, syntheticProfile, testApp } from './helpers';

const line = (id: string, text: string, final = true, revision = 1) => ({ id, text, final, revision, at: 0 });

test('lines finalised before a pause or reconnect are still accepted; a stopped session rejects them', async () => {
  const { request, close } = await testApp();
  try {
    const { id } = await listeningSession(request, []);
    await request('POST', `/api/sessions/${id}/heartbeat`, { state: 'paused' });
    assert.equal((await request('PUT', `/api/sessions/${id}/segments`, [line('a', 'Synthetic before pause.')])).status, 200);
    await request('POST', `/api/sessions/${id}/heartbeat`, { state: 'reconnecting' });
    assert.equal((await request('PUT', `/api/sessions/${id}/segments`, [line('b', 'Synthetic during reconnect.')])).status, 200);
    await request('POST', `/api/sessions/${id}/stop`);
    assert.equal((await request('PUT', `/api/sessions/${id}/segments`, [line('c', 'Too late.')])).status, 409);
    assert.equal((await request('GET', `/api/sessions/${id}`)).body.segments.length, 2);
  } finally {
    await close();
  }
});

test('a final line never regresses and stale revisions are ignored', async () => {
  const { request, close } = await testApp();
  try {
    const { id } = await listeningSession(request, []);
    await request('PUT', `/api/sessions/${id}/segments`, [line('a', 'Synthetic draft', false, 1)]);
    await request('PUT', `/api/sessions/${id}/segments`, [line('a', 'Synthetic final.', true, 3)]);
    await request('PUT', `/api/sessions/${id}/segments`, [line('a', 'Synthetic partial again', false, 4), line('a', 'Old', true, 2)]);
    const [segment] = (await request('GET', `/api/sessions/${id}`)).body.segments;
    assert.equal(segment.text, 'Synthetic final.');
    assert.equal(segment.final, true);
    assert.equal(segment.revision, 3);
  } finally {
    await close();
  }
});

test('the first stop reason is kept and unknown reasons are rejected', async () => {
  const { request, close } = await testApp();
  try {
    const { id } = await listeningSession(request, []);
    assert.equal((await request('POST', `/api/sessions/${id}/stop`, { reason: 'made-up' })).status, 400);
    assert.equal((await request('POST', `/api/sessions/${id}/stop`, { reason: 'tab-closed' })).body.endedReason, 'tab-closed');
    assert.equal((await request('POST', `/api/sessions/${id}/stop`, { reason: 'user' })).body.endedReason, 'tab-closed');
  } finally {
    await close();
  }
});

test('the watchdog stops silent and over-long sessions and forgets expired temporary ones', async () => {
  const stops: string[] = [];
  const voice: VoiceProvider = {
    start: async () => 'agent',
    stop: async (agent) => void stops.push(agent),
    credentials: () => {
      throw new Error('unused');
    },
  };
  const dir = mkdtempSync(join(tmpdir(), 'tranz-reap-'));
  try {
    const store = new Store(dir, 'a'.repeat(64));
    const life = new Lifecycle(store, voice);
    const now = Date.now();
    const base = { channel: 'c', uid: 1, aiCalls: 0, context: { id: 'p', version: 1, ...syntheticProfile }, segments: [], processing: 'idle' as const };
    store.sessions.set('quiet', { ...base, id: 'quiet', retain: false, state: 'listening', startedAt: now, lastSeen: now - HEARTBEAT_TIMEOUT - 1, agentId: 'agent-quiet' });
    store.sessions.set('long', { ...base, id: 'long', retain: true, state: 'listening', startedAt: now - MAX_SESSION_DURATION - 1, lastSeen: now });
    store.sessions.set('fresh', { ...base, id: 'fresh', retain: false, state: 'listening', startedAt: now, lastSeen: now });
    store.sessions.set('old', { ...base, id: 'old', retain: false, state: 'stopped', startedAt: 0, lastSeen: now - TEMPORARY_RETENTION - 1 });
    store.sessions.set('kept', { ...base, id: 'kept', retain: true, state: 'stopped', startedAt: 0, lastSeen: 0 });
    await life.reap(now);
    assert.equal(store.sessions.get('quiet')?.endedReason, 'inactive');
    assert.equal(store.sessions.get('quiet')?.state, 'stopped');
    assert.deepEqual(stops, ['agent-quiet']);
    assert.equal(store.sessions.get('long')?.endedReason, 'time-limit');
    assert.equal(store.sessions.get('fresh')?.state, 'listening');
    assert.equal(store.sessions.has('old'), false);
    assert.equal(store.sessions.has('kept'), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a failed agent start cleans up the channel, surfaces an error and does not block the next session', async () => {
  const cleaned: string[] = [];
  const voice: VoiceProvider = {
    start: async () => {
      throw new Error('synthetic provider failure');
    },
    stop: async () => {},
    credentials: () => {
      throw new Error('unused');
    },
    cleanupChannel: async (channel) => void cleaned.push(channel),
  };
  const { request, close } = await testApp({ voice });
  try {
    const profile = (await request('POST', '/api/profiles', syntheticProfile)).body;
    const id = randomUUID();
    await request('POST', '/api/sessions', { id, profileId: profile.id, retain: false });
    const started = await request('POST', `/api/sessions/${id}/start`);
    assert.equal(started.status, 502);
    assert.deepEqual(cleaned, [`tranz_${id}`]);
    assert.equal((await request('GET', `/api/sessions/${id}`)).body.state, 'error');
    assert.equal((await request('POST', `/api/sessions/${id}/stop`, { reason: 'start-failed' })).body.state, 'stopped');
    assert.equal((await request('POST', '/api/sessions', { id: randomUUID(), profileId: profile.id, retain: false })).status, 200);
  } finally {
    await close();
  }
});

test('transcript growth is bounded and the limit is reported', async () => {
  const { request, close } = await testApp();
  try {
    const { id } = await listeningSession(request, []);
    for (let batch = 0; batch < 30; batch++) {
      await request('PUT', `/api/sessions/${id}/segments`, Array.from({ length: 100 }, (_, i) => line(`l${batch * 100 + i}`, 'Synthetic.')));
    }
    const overflow = await request('PUT', `/api/sessions/${id}/segments`, [line('extra', 'Synthetic overflow.')]);
    assert.equal(overflow.body.dropped, 1);
    const session = (await request('GET', `/api/sessions/${id}`)).body;
    assert.equal(session.segments.length, 3000);
    assert.match(session.error, /limit/);
  } finally {
    await close();
  }
});

test('provider failures map to specific, secret-free errors', async () => {
  let status = 200;
  let content = '{"value":"ok"}';
  const server = http.createServer((req, res) => {
    req.resume();
    req.on('end', () => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(status === 200 ? JSON.stringify({ choices: [{ message: { content } }] }) : '{"error":"synthetic"}');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const key = 'synthetic-provider-key';
  const ai = textAI(configSchema.parse({ ACCESS_TOKEN: 'x'.repeat(32), DATA_KEY: 'a'.repeat(64), AI_API_KEY: key, AI_BASE_URL: `http://127.0.0.1:${port}/v1` }));
  const schema = z.object({ value: z.string() });
  const failure = async () => {
    try {
      await ai.json('test', {}, schema);
      return undefined;
    } catch (error) {
      return error as { statusCode: number; message: string };
    }
  };
  try {
    assert.deepEqual(await ai.json('test', {}, schema), { value: 'ok' });
    const cases: [number, number, RegExp][] = [
      [401, 503, /API key/],
      [404, 503, /not found/],
      [429, 429, /rate-limiting/],
      [500, 502, /HTTP 500/],
    ];
    for (const [providerStatus, expected, message] of cases) {
      status = providerStatus;
      const error = await failure();
      assert.equal(error?.statusCode, expected);
      assert.match(error!.message, message);
      assert.equal(error!.message.includes(key), false);
    }
    status = 200;
    content = 'not json';
    assert.match((await failure())!.message, /required format/);
    content = '{"value":42}';
    assert.equal((await failure())?.statusCode, 502);
  } finally {
    server.close();
  }
});
