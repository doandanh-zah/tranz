import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { codexAI } from '../apps/server/codex';

// Uses tests/fixtures/fake-codex.mjs, a synthetic stand-in for `codex app-server`. This checks the
// protocol handling and lock-down, not the real ChatGPT service (see docs/evidence for that).
const fake = resolve('tests/fixtures/fake-codex.mjs');
chmodSync(fake, 0o755);
const schema = z.object({ value: z.string(), schemaSeen: z.boolean(), sandbox: z.string() });

function adapter(signedIn: boolean) {
  const home = mkdtempSync(join(tmpdir(), 'tranz-codex-home-'));
  process.env.FAKE_CODEX_SIGNED_IN = signedIn ? '1' : '0';
  const ai = codexAI({ bin: fake, home, effort: 'low' });
  return { ai, done: () => (ai.close(), rmSync(home, { recursive: true, force: true })) };
}

test('ChatGPT sign-in goes through the Codex login RPC and is required before any request', async () => {
  const { ai, done } = adapter(false);
  try {
    const before = await ai.account!();
    assert.equal(before.provider, 'chatgpt');
    assert.equal(before.ready, false);
    await assert.rejects(ai.json('test', { value: 'x' }, schema), /đăng nhập ChatGPT/);
    const { authUrl } = await ai.login!();
    assert.match(authUrl, /^https:\/\/auth\.openai\.com\//);
    await new Promise((r) => setTimeout(r, 150));
    const after = await ai.account!();
    assert.equal(after.signedIn, true);
    assert.equal(after.plan, 'plus');
    await ai.logout!();
    assert.equal((await ai.account!()).signedIn, false);
  } finally {
    done();
  }
});

test('requests use a structured output schema and return validated JSON', async () => {
  const { ai, done } = adapter(true);
  try {
    const result = await ai.json('test', { value: 'hello' }, schema);
    assert.deepEqual(result, { value: 'echo:hello', schemaSeen: true, sandbox: 'read-only' });
  } finally {
    done();
  }
});

test('tool use is refused and any tool item discards the answer', async () => {
  const { ai, done } = adapter(true);
  try {
    await assert.rejects(ai.json('test', { value: 'TOOL' }, schema), /cố dùng công cụ/);
  } finally {
    done();
  }
});

test('failed turns and a missing Codex binary fail with actionable errors', async () => {
  const { ai, done } = adapter(true);
  try {
    await assert.rejects(ai.json('test', { value: 'FAIL' }, schema), /không hoàn tất/);
  } finally {
    done();
  }
  const missing = codexAI({ bin: '/nonexistent/codex', home: mkdtempSync(join(tmpdir(), 'tranz-codex-home-')), effort: 'low' });
  await assert.rejects(missing.account!(), /Chưa cài Codex CLI/);
  missing.close();
});
