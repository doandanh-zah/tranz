// LIVE check against real Agora using SYNTHETIC speech (macOS `say`). A local page plays the
// speech; the real Runtime captures that tab with chrome.tabCapture, publishes it over Agora RTC,
// starts a real Conversational AI agent through a throwaway backend, and receives the transcript
// over RTM. The microphone is replaced by silence. Silent on the speakers: the tab plays only while
// captured and the test page renders audio to no output device. Credentials are read from .env by the backend
// process only and never printed. Uses Agora minutes on the configured project.
// Usage: npm run verify:live [-- --renewal] (renewal keeps the session ~11 min)
import { chromium, type BrowserContext, type Page, type Worker } from 'playwright';
import { build, type Plugin } from 'esbuild';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { AgoraClient, Area, generateConvoAIToken } from 'agora-agents';

const PORT = 4328;
// Tests use their own build so the dist/extension a person has loaded in Chrome is never rewritten.
const buildDir = resolve(process.env.TRANZ_BUILD_DIR ?? 'artifacts/verify-build');
/** Shape exposed by tests/browser/live-entry.ts inside the extension test page. */
type LiveApi = {
  start(id: string, token: string, tabId: number): Promise<{ ok: boolean; error?: string }>;
  pause(value: boolean): Promise<void>;
  mute(value: boolean): void;
  stop(reason?: string): Promise<void>;
  status(): { active: boolean; paused: boolean; muted: boolean };
  diag(): Record<string, unknown>;
};
const renewal = process.argv.includes('--renewal');
const out = resolve(process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? 'artifacts/live');
const results: { name: string; pass: boolean; detail: string }[] = [];
const metrics: Record<string, number | string> = {};
const check = (name: string, pass: unknown, detail = '') => {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const { AGORA_APP_ID: appId, AGORA_APP_CERTIFICATE: certificate } = process.env;
if (!appId || !certificate) {
  console.error('BLOCKED: AGORA_APP_ID and AGORA_APP_CERTIFICATE must be set in .env.');
  process.exit(2);
}

const SCRIPT =
  'Hello team. This is a synthetic test of the Tranz transcript. ' +
  'The beta will be ready after QA sign off. Can you share when the next milestone is planned?';

function synthesiseSpeech(dir: string) {
  const aiff = join(dir, 'speech.aiff');
  execFileSync('say', ['-r', '165', '-o', aiff, SCRIPT]);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@22050', aiff, join(dir, 'speech.wav')]);
  return readFileSync(join(dir, 'speech.wav'));
}

// Plays the synthetic speech, then 3 s of silence so turns finalise, forever.
const MEETING_PAGE = `<!doctype html><title>Tranz test · synthetic speech</title><body style="font:16px sans-serif;padding:24px">Tranz automated test page. Synthetic audio only; safe to ignore. This window closes by itself. (macOS say)
<audio id="a" src="/speech.wav"></audio><script>
const a = document.getElementById('a');
a.addEventListener('ended', () => setTimeout(() => a.play(), 3000));
// Started by the harness once the tab is captured, so nothing is heard through the speakers.
window.startSpeech = () => a.play();
</script></body>`;

/** Minimises a headed test window so it does not cover the person's screen (headless cannot capture tab audio). */
async function minimise(page: Page) {
  try {
    const cdp = await page.context().newCDPSession(page);
    const { windowId } = await cdp.send('Browser.getWindowForTarget');
    await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } });
    await cdp.detach();
  } catch {
    // Best effort only.
  }
}

/** Opens the synthetic meeting as a background tab (keeps the window minimised) and returns its tab ID. */
async function openMeetingTab(context: BrowserContext, worker: Worker, url: string) {
  const tabId = await worker.evaluate(async (target) => (await chrome.tabs.create({ url: target, active: false })).id, url);
  for (let i = 0; i < 50; i++) {
    const page = context.pages().find((candidate) => candidate.url() === url);
    if (page) return { tabId, meeting: page };
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Synthetic meeting tab did not open');
}

async function prepareExtension() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'tranz-live-ext-')));
  cpSync(join(buildDir, 'extension'), dir, { recursive: true });
  // Point the bundled API client at the throwaway backend instead of the user's 4318 instance.
  const retarget: Plugin = {
    name: 'retarget-backend',
    setup(b) {
      b.onLoad({ filter: /apps[\\/]extension[\\/]src[\\/]api\.ts$/ }, (args) => ({
        contents: readFileSync(args.path, 'utf8').replace('http://127.0.0.1:4318', `http://127.0.0.1:${PORT}`),
        loader: 'ts',
      }));
    },
  };
  await build({ entryPoints: [resolve('tests/browser/live-entry.ts')], bundle: true, format: 'esm', outfile: join(dir, 'live.js'), plugins: [retarget], logLevel: 'silent' });
  writeFileSync(join(dir, 'live.html'), '<!doctype html><title>Tranz test · live Agora</title><body style="font:16px sans-serif;padding:24px">Tranz automated test page. Synthetic audio only; safe to ignore. This window closes by itself.</body><script type="module" src="live.js"></script>');
  const id = [...createHash('sha256').update(dir).digest('hex').slice(0, 32)].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');
  return { dir, id };
}

function startBackend(extensionId: string, dataDir: string, token: string) {
  const child = spawn(process.execPath, [join(buildDir, 'server/index.js')], {
    // Provider values come from this process's environment (.env via tsx); overrides isolate the run.
    env: { ...process.env, PORT: String(PORT), ACCESS_TOKEN: token, DATA_KEY: randomBytes(32).toString('hex'), DATA_DIR: dataDir, EXTENSION_ID: extensionId, AI_PROVIDER: 'openai', AI_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise<ChildProcess>((resolveChild, reject) => {
    child.stdout!.on('data', (chunk) => String(chunk).includes('ready') && resolveChild(child));
    child.stderr!.on('data', (chunk) => process.stderr.write(chunk));
    child.on('exit', (code) => reject(new Error(`backend exited ${code}`)));
  });
}

async function agentsInChannel(channel: string) {
  const client = new AgoraClient({ area: Area.US, appId: appId!, appCertificate: certificate! });
  const token = generateConvoAIToken({ appId: appId!, appCertificate: certificate!, channelName: channel, uid: 0 });
  const page = await client.agents.list({ appid: appId!, channel }, { headers: { Authorization: `agora token=${token}` } });
  return page.data.map((item) => item.status ?? 'UNKNOWN');
}

async function main() {
  mkdirSync(out, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), 'tranz-live-'));
  const speech = synthesiseSpeech(work);
  const server = http.createServer((req, res) => {
    if (req.url === '/speech.wav') {
      res.writeHead(200, { 'content-type': 'audio/wav' });
      res.end(speech);
    } else {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(MEETING_PAGE);
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const meetingUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;
  const ext = await prepareExtension();
  const token = randomBytes(32).toString('hex');
  const dataDir = join(work, 'data');
  const backend = await startBackend(ext.id, dataDir, token);
  const api = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(`http://127.0.0.1:${PORT}/api${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, body: await response.json() };
  };
  const profileDir = mkdtempSync(join(tmpdir(), 'tranz-live-profile-'));
  const context = await chromium.launchPersistentContext(profileDir, {
    ...(process.env.TRANZ_CHROMIUM ? { executablePath: process.env.TRANZ_CHROMIUM } : { channel: 'chromium' }),
    headless: false, // headless Chromium cannot open tab-capture audio streams
    timeout: 30000,
    args: [
      '--window-position=-2400,-2400',
      `--disable-extensions-except=${ext.dir}`,
      `--load-extension=${ext.dir}`,
      `--allowlisted-extension-id=${ext.id}`,
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  const logs: string[] = [];
  let sessionId = '';
  let tester: Page | undefined;
  try {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    tester = await context.newPage();
    await minimise(tester);
    const { tabId, meeting } = await openMeetingTab(context, worker, meetingUrl);
    tester.on('console', (m) => m.type() === 'error' && logs.push(m.text()));
    await tester.goto(`chrome-extension://${ext.id}/live.html`);
    await tester.waitForFunction(() => 'live' in window);

    const profile = (await api('POST', '/profiles', { name: 'Synthetic live check', role: '', facts: '', goal: '', glossary: '', tone: 'clear' })).body;
    sessionId = randomUUID();
    await api('POST', '/sessions', { id: sessionId, profileId: profile.id, retain: false });
    const session = async () => (await api('GET', `/sessions/${sessionId}`)).body;

    const t0 = Date.now();
    const started = await tester.evaluate(([id, tok, tab]) => (window as unknown as { live: LiveApi }).live.start(id, tok, tab), [sessionId, token, tabId] as const);
    metrics.startToListeningMs = Date.now() - t0;
    await meeting.evaluate(() => (window as unknown as { startSpeech: () => Promise<void> }).startSpeech());
    check('real agent accepted, joined the channel and the runtime reached listening', started.ok && (await session()).state === 'listening', started.ok ? `${metrics.startToListeningMs} ms` : started.error);
    if (!started.ok) return;

    const listeningAt = Date.now();
    let firstPartial = 0;
    let firstFinal = 0;
    while (Date.now() - listeningAt < 60000 && !firstFinal) {
      await sleep(500);
      const segments = (await session()).segments as { final: boolean; text: string }[];
      if (!firstPartial && segments.length) firstPartial = Date.now() - listeningAt;
      if (segments.some((s) => s.final)) firstFinal = Date.now() - listeningAt;
    }
    metrics.firstPartialAfterListeningMs = firstPartial || 'none';
    metrics.firstFinalAfterListeningMs = firstFinal || 'none';
    await sleep(15000);
    let snapshot = await session();
    const finals = (snapshot.segments as { final: boolean; text: string }[]).filter((s) => s.final);
    metrics.sampleTranscript = finals.map((s) => s.text).join(' | ').slice(0, 600);
    const diagnostics = await tester.evaluate(() => (window as unknown as { live: LiveApi }).live.diag());
    metrics.diagnostics = JSON.stringify(diagnostics).slice(0, 3000);
    console.log('  diagnostics:', metrics.diagnostics);
    check('real speech-to-text arrives over RTM as partial and final lines', firstPartial > 0 && finals.length > 0, `partial ${firstPartial} ms, final ${firstFinal} ms after listening`);
    check('transcript matches the synthetic script', /synthetic|beta|team|milestone|transcript/i.test(metrics.sampleTranscript as string), (metrics.sampleTranscript as string).slice(0, 160));

    await tester.evaluate(() => (window as unknown as { live: LiveApi }).live.pause(true));
    await sleep(3000);
    snapshot = await session();
    const idsAtPause = new Set((snapshot.segments as { id: string }[]).map((s) => s.id));
    check('pause is reported to the backend', snapshot.state === 'paused');
    await sleep(15000);
    snapshot = await session();
    const newDuringPause = (snapshot.segments as { id: string }[]).filter((s) => !idsAtPause.has(s.id)).length;
    check('no new speech is transcribed while paused (at most one in-flight turn)', newDuringPause <= 1 && snapshot.state === 'paused', `${newDuringPause} new line(s) in 15 s`);
    await tester.evaluate(() => (window as unknown as { live: LiveApi }).live.pause(false));
    const resumedAt = Date.now();
    const idsAtResume = new Set((snapshot.segments as { id: string }[]).map((s) => s.id));
    let resumedFinal = false;
    while (Date.now() - resumedAt < 40000 && !resumedFinal) {
      await sleep(1000);
      resumedFinal = ((await session()).segments as { id: string; final: boolean }[]).some((s) => s.final && !idsAtResume.has(s.id));
    }
    check('transcription resumes after resume', resumedFinal && (await session()).state === 'listening', `${Date.now() - resumedAt} ms`);

    if (renewal) {
      // Tokens last 600 s; renewal must happen before expiry for the session to continue.
      const until = t0 + 11 * 60000;
      while (Date.now() < until) {
        await sleep(30000);
        const current = await session();
        if (current.state !== 'listening') break;
        console.log(`  … ${Math.round((Date.now() - t0) / 1000)} s, state ${current.state}, ${current.segments.length} lines`);
      }
      const before = (await session()).segments.length;
      await sleep(20000);
      const after = await session();
      check('session survives token expiry (renewal) past 10 minutes', after.state === 'listening' && after.segments.length > before, `${Math.round((Date.now() - t0) / 1000)} s, ${after.state}`);
    }

    await tester.evaluate(() => (window as unknown as { live: LiveApi }).live.stop('user'));
    snapshot = await session();
    const status = await tester.evaluate(() => (window as unknown as { live: LiveApi }).live.status());
    check('stop releases the runtime and stops the session with reason "user"', snapshot.state === 'stopped' && snapshot.endedReason === 'user' && !status.active);
    const again = [await api('POST', `/sessions/${sessionId}/stop`), await api('POST', `/sessions/${sessionId}/stop`)];
    check('duplicate stop requests are idempotent', again.every((r) => r.status === 200 && r.body.state === 'stopped'));
    // Agora processes stop asynchronously; measure how long until the channel is empty.
    const stoppedAt = Date.now();
    let remaining = await agentsInChannel(`tranz_${sessionId}`);
    while (remaining.some((s) => ['RUNNING', 'STARTING', 'IDLE', 'STOPPING'].includes(s)) && Date.now() - stoppedAt < 90000) {
      await sleep(3000);
      remaining = await agentsInChannel(`tranz_${sessionId}`);
    }
    metrics.agentGoneAfterStopMs = Date.now() - stoppedAt;
    check('no agent is left running in the channel after stop (idle timeout is 60 s, so < 45 s means stop worked)', !remaining.some((s) => ['RUNNING', 'STARTING', 'IDLE', 'STOPPING'].includes(s)) && Date.now() - stoppedAt < 45000, `${metrics.agentGoneAfterStopMs} ms, ${JSON.stringify(remaining)}`);
  } finally {
    if (sessionId) await api('POST', `/sessions/${sessionId}/stop`).catch(() => {});
    await context.close();
    backend.kill('SIGTERM');
    server.close();
    rmSync(ext.dir, { recursive: true, force: true });
    rmSync(work, { recursive: true, force: true });
    rmSync(profileDir, { recursive: true, force: true });
    writeFileSync(join(out, renewal ? 'live-agora-renewal.json' : 'live-agora.json'), JSON.stringify({ at: new Date().toISOString(), renewal, metrics, results, consoleErrors: logs.slice(0, 20) }, null, 2));
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} live checks passed. Metrics: ${JSON.stringify(metrics)}`);
  if (failed.length || !results.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
