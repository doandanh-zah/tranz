// Serves the side-panel UI as a plain web page for design review, against a throwaway backend.
// Everything here is synthetic and nothing from .env is read:
// - the backend runs on 4338 with its own demo token, data key and a temporary data directory;
// - the AI provider is an in-process MOCK (every output is prefixed "[MOCK]");
// - no Agora credentials, so nothing can be captured or sent; the page is a preview, not the extension.
// Usage: npm run demo:ui [-- --live]   (--live also simulates a meeting with synthetic lines arriving)
// Open http://127.0.0.1:5173 and connect with the demo token printed below.
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BACKEND_PORT = 4338;
const PROVIDER_PORT = 4339;
const backendApi = `http://127.0.0.1:${BACKEND_PORT}/api`;
// Not a secret: it only unlocks the throwaway demo backend below, which holds synthetic data.
const DEMO_TOKEN = 'tranz-demo-token-synthetic-not-a-secret';
const live = process.argv.includes('--live');
const dataDir = mkdtempSync(join(tmpdir(), 'tranz-demo-'));
const children = [];

function mockProvider() {
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const body = JSON.parse(raw || '{}');
      const system = body.messages?.[0]?.content ?? '';
      const data = JSON.parse(body.messages?.[1]?.content ?? '{}');
      let content;
      if (system.includes('Translate')) content = { translations: data.lines.map((line) => ({ id: line.id, translation: `[MOCK] Bản dịch mô phỏng: ${line.text}` })) };
      else if (system.includes('Summarize')) {
        content = {
          summary: '[MOCK] Nhóm rà lại tiến độ bản beta và thống nhất cập nhật vào thứ Sáu.',
          decisions: ['[MOCK] Giữ lịch phát hành beta sau khi QA ký duyệt'],
          actions: ['[MOCK] Gửi cập nhật tiến độ vào thứ Sáu'],
          improvedReplies: ['[MOCK] Could we confirm the timeline next week?'],
          vocabulary: [{ phrase: 'sign-off', meaning: '[MOCK] sự phê duyệt chính thức', example: '[MOCK] We need QA sign-off before launch.' }],
        };
      } else if (data.task === 'catch-up') {
        content = { text: '[MOCK] Mọi người đang bàn về lịch phát hành bản beta.', evidence: data.segments.map((s) => s.id), uncertain: false };
      } else if (data.task === 'compose') {
        content = { text: '[MOCK] I need a little more time to confirm this.', evidence: [], uncertain: false };
      } else {
        content = { text: '[MOCK] Based on our plan, we can share an update on Friday.', evidence: [data.segments.at(-1)?.id, 'profile'], uncertain: false };
      }
      // A short delay so loading states are visible.
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }));
      }, 900);
    });
  });
  return new Promise((resolveServer) => server.listen(PROVIDER_PORT, '127.0.0.1', () => resolveServer(server)));
}

function start(command, args, env, readyText) {
  const child = spawn(command, args, { env: { PATH: process.env.PATH, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  return new Promise((resolveChild, reject) => {
    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      if (String(chunk).includes(readyText)) resolveChild(child);
    });
    child.on('exit', (code) => reject(new Error(`${command} exited ${code}`)));
  });
}

async function api(method, path, body) {
  const response = await fetch(backendApi + path, {
    method,
    headers: { authorization: `Bearer ${DEMO_TOKEN}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status}`);
  return response.json();
}

const segment = (id, text, secondsAgo = 0) => ({ id, text, final: true, revision: 1, at: Date.now() - secondsAgo * 1000 });

async function seed() {
  const profile = await api('POST', '/profiles', {
    name: 'Synthetic sprint sync',
    role: 'Backend engineer (synthetic)',
    facts: 'Synthetic fact: the beta ships after QA sign-off. The launch date is undecided.',
    goal: 'Agree on the next test milestone.',
    glossary: 'QA: quality assurance',
    tone: 'clear',
  });

  // A finished, kept meeting so the library and the notes view have content.
  const saved = randomUUID();
  await api('POST', '/sessions', { id: saved, profileId: profile.id, retain: true });
  await api('POST', `/sessions/${saved}/heartbeat`, { state: 'listening' });
  await api('PUT', `/sessions/${saved}/segments`, [
    segment('s-1', 'Synthetic line: thanks everyone for joining the test call.', 60),
    segment('s-2', 'Synthetic line: the QA checklist is almost complete.', 40),
    segment('s-3', 'Can you share when the beta will be ready?', 20),
  ]);
  await api('POST', `/sessions/${saved}/stop`);
  await api('POST', `/sessions/${saved}/finalize`).catch(() => {});

  if (!live) return;
  // A simulated meeting: synthetic lines arrive every few seconds while the demo runs.
  const id = randomUUID();
  await api('POST', '/sessions', { id, profileId: profile.id, retain: false });
  await api('POST', `/sessions/${id}/heartbeat`, { state: 'listening' });
  setInterval(() => void api('POST', `/sessions/${id}/heartbeat`, { state: 'listening' }).catch(() => {}), 10000);
  const lines = [
    'Synthetic line: good morning, let us start with the release status.',
    'Synthetic line: the QA checklist is almost complete.',
    'Synthetic line: we still need sign-off from the security review.',
    'Can you share when the beta will be ready?',
    'Synthetic line: we should also agree on the next test milestone.',
    'What do you think about moving the demo to Friday?',
  ];
  const sent = [];
  let next = 0;
  setInterval(() => {
    if (next >= lines.length) return;
    sent.push(segment(`live-${next}`, lines[next]));
    next += 1;
    void api('PUT', `/sessions/${id}/segments`, sent).catch(() => {});
  }, 5000);
}

function stopAll() {
  for (const child of children) child.kill();
  rmSync(dataDir, { recursive: true, force: true });
  process.exit(0);
}
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

await mockProvider();
await start(
  process.execPath,
  ['--import', 'tsx', 'apps/server/index.ts'],
  {
    PORT: String(BACKEND_PORT),
    ACCESS_TOKEN: DEMO_TOKEN,
    DATA_KEY: randomBytes(32).toString('hex'),
    DATA_DIR: dataDir,
    AI_PROVIDER: 'openai',
    AI_BASE_URL: `http://127.0.0.1:${PROVIDER_PORT}/v1`,
    AI_API_KEY: 'mock-key-not-a-real-credential',
    AI_MODEL: 'mock-model',
  },
  'ready',
);
await seed();
await start(process.execPath, ['node_modules/vite/bin/vite.js'], { VITE_TRANZ_BACKEND: `http://127.0.0.1:${BACKEND_PORT}`, VITE_TRANZ_DEMO: '1' }, 'Local');
console.log(`\nTranz UI demo (synthetic data, mock AI${live ? ', simulated meeting' : ''}): http://127.0.0.1:5173`);
console.log(`Demo token (not a secret, only for this throwaway backend): ${DEMO_TOKEN}`);
