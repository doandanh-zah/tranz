import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldAutoFinalize } from '../apps/server/app';
import { configSchema } from '../apps/server/config';
import { Store } from '../apps/server/store';
import { listeningSession, mockAI, testApp, TOKEN } from './helpers';

// Synthetic transcript and MOCK notes only; these tests cover lifecycle and privacy contracts, not note quality.
const notes = {
  summary: 'Synthetic summary text',
  decisions: ['Synthetic decision'],
  actions: [],
  improvedReplies: ['Could we confirm next week?'],
  vocabulary: [{ phrase: 'sign-off', meaning: 'phê duyệt', example: 'We need QA sign-off.' }],
};

function gatedAI() {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const mock = mockAI(async () => {
    await gate;
    return notes;
  });
  return { ...mock, release };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

test('ChatGPT sessions automatically generate notes after stop without an API key', () => {
  const base = { ACCESS_TOKEN: TOKEN, DATA_KEY: 'f'.repeat(64) };
  assert.equal(shouldAutoFinalize(configSchema.parse({ ...base, AI_PROVIDER: 'chatgpt' })), true);
  assert.equal(shouldAutoFinalize(configSchema.parse({ ...base, AI_PROVIDER: 'openai' })), false);
  assert.equal(shouldAutoFinalize(configSchema.parse({ ...base, AI_PROVIDER: 'openai', AI_API_KEY: 'synthetic' })), true);
});

test('stop returns before notes finish and duplicate finalize calls share one provider job', async () => {
  const { ai, calls, release } = gatedAI();
  const { request, close } = await testApp({ ai });
  try {
    const { id } = await listeningSession(request, ['Synthetic line one.', 'Synthetic line two?']);
    const stopped = await request('POST', `/api/sessions/${id}/stop`);
    assert.equal(stopped.status, 200);
    assert.equal(stopped.body.state, 'stopped');
    assert.equal(stopped.body.processing, 'processing');

    const duplicates = [request('POST', `/api/sessions/${id}/finalize`), request('POST', `/api/sessions/${id}/finalize`)];
    await tick();
    release();
    const [first, second] = await Promise.all(duplicates);
    assert.equal(first.body.processing, 'ready');
    assert.deepEqual(first.body.artifact, second.body.artifact);
    assert.equal(calls.length, 1);
    assert.equal((await request('POST', `/api/sessions/${id}/finalize`)).body.artifact.summary, notes.summary);
    assert.equal(calls.length, 1);
  } finally {
    await close();
  }
});

test('a failed notes job leaves the session stopped and can be retried', async () => {
  let fail = true;
  const { ai, calls } = mockAI(() => (fail ? { unexpected: true } : notes));
  const { request, close } = await testApp({ ai });
  try {
    const { id } = await listeningSession(request, ['Synthetic line.']);
    assert.equal((await request('POST', `/api/sessions/${id}/stop`)).status, 200);
    await tick();
    const failed = (await request('GET', `/api/sessions/${id}`)).body;
    assert.equal(failed.state, 'stopped');
    assert.equal(failed.processing, 'error');
    assert.match(failed.processingError, /thử lại/);
    fail = false;
    const retried = await request('POST', `/api/sessions/${id}/finalize`);
    assert.equal(retried.body.processing, 'ready');
    assert.equal(retried.body.processingError, undefined);
    assert.equal(calls.length, 2);
  } finally {
    await close();
  }
});

test('temporary sessions never reach disk while kept sessions survive a restart', async () => {
  const { ai } = mockAI(() => notes);
  const first = await testApp({ ai });
  let temporary = '';
  let kept = '';
  let savedLater = '';
  try {
    temporary = (await listeningSession(first.request, ['Synthetic temporary line.'])).id;
    await first.request('POST', `/api/sessions/${temporary}/stop`);
    await first.request('POST', `/api/sessions/${temporary}/finalize`);
    kept = (await listeningSession(first.request, ['Synthetic kept line.'], true)).id;
    await first.request('POST', `/api/sessions/${kept}/stop`);
    await first.request('POST', `/api/sessions/${kept}/finalize`);
    savedLater = (await listeningSession(first.request, ['Synthetic saved-later line.'])).id;
    await first.request('POST', `/api/sessions/${savedLater}/stop`);
    const saved = await first.request('POST', `/api/sessions/${savedLater}/save`);
    assert.equal(saved.body.retain, true);
  } finally {
    await first.close(false);
  }
  const disk = new Store(first.dir, 'f'.repeat(64));
  const onDisk = disk.sessions.get(temporary);
  assert.deepEqual(onDisk?.segments, []);
  assert.equal(onDisk?.artifact, undefined);
  assert.equal(onDisk?.context.facts, '');
  assert.equal(disk.sessions.get(kept)?.artifact?.summary, notes.summary);
  assert.equal(disk.sessions.get(kept)?.segments[0].text, 'Synthetic kept line.');
  assert.equal(disk.sessions.get(savedLater)?.segments[0].text, 'Synthetic saved-later line.');

  const second = await testApp({ ai, dir: first.dir });
  try {
    const listed = (await second.request('GET', '/api/sessions')).body.map((s: { id: string }) => s.id);
    assert.deepEqual(new Set(listed), new Set([kept, savedLater]));
    const nothing = await second.request('POST', `/api/sessions/${temporary}/save`);
    assert.equal(nothing.status, 409);
  } finally {
    await second.close();
  }
});

test('deleting a session while notes are generating removes source and derived data for good', async () => {
  const { ai, release } = gatedAI();
  const app = await testApp({ ai });
  let id = '';
  try {
    id = (await listeningSession(app.request, ['Synthetic confidential line.'], true)).id;
    await app.request('POST', `/api/sessions/${id}/stop`);
    const pending = app.request('POST', `/api/sessions/${id}/finalize`);
    await tick();
    assert.equal((await app.request('DELETE', `/api/sessions/${id}`)).status, 200);
    release();
    // 409 if this call ran the job, 404 if it queued behind the automatic job and found the session gone.
    assert.ok([404, 409].includes((await pending).status));
    assert.equal((await app.request('GET', `/api/sessions/${id}`)).status, 404);
    assert.equal((await app.request('POST', `/api/sessions/${id}/finalize`)).status, 404);
  } finally {
    await app.close(false);
  }
  assert.equal(new Store(app.dir, 'f'.repeat(64)).sessions.has(id), false);
});

test('a notes job interrupted by a restart becomes a retryable error', async () => {
  const { ai } = mockAI(() => notes);
  const first = await testApp({ ai });
  const { id } = await listeningSession(first.request, ['Synthetic line.'], true);
  await first.close(false);
  const store = new Store(first.dir, 'f'.repeat(64));
  const record = store.sessions.get(id)!;
  record.state = 'stopped';
  record.processing = 'processing';
  record.artifact = undefined;
  record.segments[0].translationState = 'pending';
  store.save();

  const second = await testApp({ ai, dir: first.dir });
  try {
    const session = (await second.request('GET', `/api/sessions/${id}`)).body;
    assert.equal(session.processing, 'error');
    assert.match(session.processingError, /khởi động lại/);
    assert.equal(session.segments[0].translationState, undefined);
    assert.equal((await second.request('POST', `/api/sessions/${id}/finalize`)).body.processing, 'ready');
  } finally {
    await second.close();
  }
});

test('notes require a stopped session, a final transcript and a bounded length', async () => {
  const { ai, calls } = mockAI(() => notes);
  const { request, close } = await testApp({ ai });
  try {
    const empty = await listeningSession(request, []);
    assert.equal((await request('POST', `/api/sessions/${empty.id}/finalize`)).status, 409);
    const stopped = await request('POST', `/api/sessions/${empty.id}/stop`);
    assert.equal(stopped.body.processing, 'idle');
    assert.equal((await request('POST', `/api/sessions/${empty.id}/finalize`)).status, 409);

    const long = await listeningSession(request, Array.from({ length: 20 }, () => 'x'.repeat(3500)));
    await request('POST', `/api/sessions/${long.id}/stop`);
    await tick();
    const session = (await request('GET', `/api/sessions/${long.id}`)).body;
    assert.equal(session.processing, 'error');
    assert.match(session.processingError, /quá dài/);
    assert.equal(calls.length, 0);
  } finally {
    await close();
  }
});
