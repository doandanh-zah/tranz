// Real-browser check of the Capture class: a synthetic "meeting" tab plays a 440 Hz tone, the
// extension captures it with chrome.tabCapture, a synthetic 880 Hz oscillator stands in for the
// microphone (the real microphone is never opened), and the outgoing mix level is measured while
// pausing, muting and stopping. Chromium's fake-device flag is not used: it replaces tab capture too.
// SYNTHETIC ONLY: no Google Meet, no people, no Agora. The test is kept silent, so audible
// playback preservation is NOT verified here. Runs a headed, minimised browser window and is
// silent: the tab plays only while captured and the test page renders audio to no device.
// Usage: [TRANZ_CHROMIUM=...] npm run verify:capture [-- outputDir]
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const out = resolve(process.argv[2] ?? 'artifacts/capture');
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const MEETING_PAGE = `<!doctype html><title>Tranz test · synthetic meeting</title><body style="font:16px sans-serif;padding:24px">Tranz automated test page. Synthetic audio only; safe to ignore. This window closes by itself. (440 Hz tone)
<script>
const ctx = new AudioContext(); let osc;
window.play = async () => { await ctx.resume(); osc = ctx.createOscillator(); const g = ctx.createGain(); g.gain.value = 0.4; osc.frequency.value = 440; osc.connect(g).connect(ctx.destination); osc.start(); };
window.silence = () => { osc?.stop(); osc = undefined; };
</script></body>`;

/** Minimises a headed test window so it does not cover the person's screen (headless cannot capture tab audio). */
async function minimise(page) {
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
async function openMeetingTab(context, worker, url) {
  const tabId = await worker.evaluate(async (target) => (await chrome.tabs.create({ url: target, active: false })).id, url);
  for (let i = 0; i < 50; i++) {
    const page = context.pages().find((candidate) => candidate.url() === url);
    if (page) return { tabId, meeting: page };
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Synthetic meeting tab did not open');
}

async function prepareExtension() {
  const dir = mkdtempSync(join(tmpdir(), 'tranz-capture-ext-'));
  cpSync(resolve(process.env.TRANZ_BUILD_DIR ?? 'artifacts/verify-build', 'extension'), dir, { recursive: true });
  await build({ entryPoints: [resolve('tests/browser/capture-entry.ts')], bundle: true, format: 'esm', outfile: join(dir, 'capture-test.js'), logLevel: 'silent' });
  writeFileSync(join(dir, 'capture-test.html'), '<!doctype html><title>Tranz test · capture</title><body style="font:16px sans-serif;padding:24px">Tranz automated test page. Synthetic audio only; safe to ignore. This window closes by itself.</body><script type="module" src="capture-test.js"></script>');
  // realpath matters on macOS (/var → /private/var) for the derived extension ID.
  const real = (await import('node:fs')).realpathSync(dir);
  const id = [...createHash('sha256').update(real).digest('hex').slice(0, 32)].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('');
  return { dir: real, id };
}

async function launch(ext, extraArgs) {
  const profile = mkdtempSync(join(tmpdir(), 'tranz-capture-profile-'));
  const context = await chromium.launchPersistentContext(profile, {
    ...(process.env.TRANZ_CHROMIUM ? { executablePath: process.env.TRANZ_CHROMIUM } : { channel: 'chromium' }),
    // Headless Chromium cannot open tab-capture audio streams ("Requested device not found"),
    // so this check runs headed with the window placed off-screen.
    headless: false,
    timeout: 30000,
    args: [
      '--window-position=-2400,-2400',
      `--disable-extensions-except=${ext.dir}`,
      `--load-extension=${ext.dir}`,
      `--allowlisted-extension-id=${ext.id}`,
      '--autoplay-policy=no-user-gesture-required',
      ...extraArgs,
    ],
  });
  let [worker] = context.serviceWorkers();
  worker ??= await context.waitForEvent('serviceworker');
  return { context, worker, profile };
}

async function main() {
  mkdirSync(out, { recursive: true });
  const ext = await prepareExtension();
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(MEETING_PAGE);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const meetingUrl = `http://127.0.0.1:${server.address().port}/`;
  const cleanup = [];
  try {
    const { context, worker, profile } = await launch(ext, []);
    cleanup.push(() => context.close(), () => rmSync(profile, { recursive: true, force: true }));
    const tester = await context.newPage();
    await minimise(tester);
    const { tabId, meeting } = await openMeetingTab(context, worker, meetingUrl);
    await tester.goto(`chrome-extension://${ext.id}/capture-test.html`);
    await tester.waitForFunction(() => 'captureTest' in window);

    const started = await tester.evaluate((id) => window.captureTest.start(id), tabId);
    // Start the tone only now: while captured, Chrome mutes the tab's own output.
    await meeting.evaluate(() => window.play());
    check('tab audio and microphone are both acquired', started.tabTracks === 1 && started.micTracks === 1, JSON.stringify(started));
    const level = () => tester.evaluate(() => window.captureTest.level());
    const live = await level();
    check('outgoing mix carries audio while listening', live > 0.01, live.toFixed(4));
    await tester.evaluate(() => window.captureTest.pause(true));
    const paused = await level();
    check('pause sends silence (tab and microphone gated)', paused < 0.001, paused.toFixed(5));
    await tester.evaluate(() => window.captureTest.pause(false));
    const resumed = await level();
    check('resume restores the outgoing mix', resumed > 0.01, resumed.toFixed(4));
    await meeting.evaluate(() => window.silence());
    const micOnly = await level(2500);
    await tester.evaluate(() => window.captureTest.mute(true));
    const muted = await level(2500);
    check('with the tab silent, the synthetic microphone reaches the mix', micOnly > 0.001, micOnly.toFixed(5));
    check('mute removes the microphone from the mix', muted < 0.001, muted.toFixed(5));
    await meeting.evaluate(() => window.play());
    const mutedWithTab = await level();
    check('mute keeps meeting-tab audio flowing', mutedWithTab > 0.01, mutedWithTab.toFixed(4));
    const stopped = await tester.evaluate(() => window.captureTest.stop());
    check('stop ends every source track and the outgoing track', stopped.sourcesEnded && stopped.outputEnded, JSON.stringify(stopped));

    const denied = await tester.evaluate((id) => window.captureTest.denied(id), tabId);
    check('microphone denial after tab capture releases the tab track (simulated denial)', denied.rejected && denied.name === 'NotAllowedError' && denied.tabReleased, JSON.stringify(denied));
  } finally {
    for (const fn of cleanup.reverse()) await fn();
    server.close();
    rmSync(ext.dir, { recursive: true, force: true });
    writeFileSync(join(out, 'capture-results.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} capture checks passed.`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
