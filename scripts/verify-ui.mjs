// Loads the built unpacked extension in Playwright Chromium and exercises the side-panel document
// against a throwaway local backend. Everything here is synthetic:
// - the AI provider is an in-process MOCK (every output is prefixed "[MOCK]");
// - "live" sessions are SIMULATED by posting synthetic transcript segments to the API;
// - no Agora credentials are used, so no real audio, RTC or RTM is exercised.
// It proves rendering, wiring, keyboard and layout behaviour of the real build only.
// Usage: npm run build && [TRANZ_CHROMIUM=/path/to/chrome-for-testing] node scripts/verify-ui.mjs [outputDir]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const out = resolve(process.argv[2] ?? 'artifacts/ui');
const extensionPath = resolve('dist/extension');
const widths = [320, 360, 400, 480, 600];
const token = randomBytes(32).toString('hex');
const dataDir = mkdtempSync(join(tmpdir(), 'tranz-ui-'));
const profileDir = mkdtempSync(join(tmpdir(), 'tranz-chromium-'));
const results = [];
const backendApi = 'http://127.0.0.1:4318/api';

// Chrome derives an unpacked extension's ID from the SHA-256 of its absolute path.
const extensionId = [...createHash('sha256').update(extensionPath).digest('hex').slice(0, 32)]
  .map((c) => String.fromCharCode(97 + parseInt(c, 16)))
  .join('');

function check(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function mockProvider() {
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const body = JSON.parse(raw || '{}');
      const system = body.messages?.[0]?.content ?? '';
      const data = JSON.parse(body.messages?.[1]?.content ?? '{}');
      let content;
      if (system.includes('Translate')) content = { translation: `[MOCK] Bản dịch mô phỏng: ${data.text}` };
      else if (system.includes('Summarize')) {
        content = {
          summary: '[MOCK] Tóm tắt mô phỏng cho cuộc họp thử nghiệm.',
          decisions: ['[MOCK] Synthetic decision'],
          actions: ['[MOCK] Synthetic follow-up'],
          improvedReplies: ['[MOCK] Could we confirm the timeline next week?'],
          vocabulary: [{ phrase: 'follow up', meaning: '[MOCK] theo dõi tiếp', example: '[MOCK] I will follow up tomorrow.' }],
        };
      } else if (data.task === 'catch-up') {
        content = { text: '[MOCK] Mọi người đang bàn về kế hoạch thử nghiệm.', evidence: data.segments.map((s) => s.id), uncertain: false };
      } else if (data.task === 'compose') {
        content = { text: '[MOCK] I need a little more time to confirm this.', evidence: [], uncertain: false };
      } else {
        content = { text: '[MOCK] Based on our plan, we can share an update on Friday.', evidence: [data.segments.at(-1)?.id, 'profile'], uncertain: false };
      }
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }));
      }, 150);
    });
  });
  return new Promise((resolveServer) => server.listen(4319, '127.0.0.1', () => resolveServer(server)));
}

function startBackend() {
  const child = spawn(process.execPath, ['dist/server/index.js'], {
    env: {
      PATH: process.env.PATH,
      ACCESS_TOKEN: token,
      DATA_KEY: randomBytes(32).toString('hex'),
      DATA_DIR: dataDir,
      AI_BASE_URL: 'http://127.0.0.1:4319/v1',
      AI_API_KEY: 'mock-key-not-a-real-credential',
      AI_MODEL: 'mock-model',
      EXTENSION_ID: extensionId,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new Promise((resolveChild, reject) => {
    child.stdout.on('data', (chunk) => String(chunk).includes('ready') && resolveChild(child));
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    child.on('exit', (code) => reject(new Error(`backend exited ${code}`)));
  });
}

async function api(method, path, body) {
  const response = await fetch(backendApi + path, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return response.json();
}

async function noHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}

async function shoot(page, name) {
  await page.screenshot({ path: join(out, `${name}.png`), fullPage: true });
}

async function main() {
  mkdirSync(out, { recursive: true });
  const provider = await mockProvider();
  const backend = await startBackend();
  // TRANZ_CHROMIUM may point at a Chrome for Testing / Chromium build (branded Chrome ignores --load-extension).
  const context = await chromium.launchPersistentContext(profileDir, {
    ...(process.env.TRANZ_CHROMIUM ? { executablePath: process.env.TRANZ_CHROMIUM } : { channel: 'chromium' }),
    headless: true,
    timeout: 30000,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  const consoleErrors = [];
  let heartbeat;
  try {
    let [worker] = context.serviceWorkers();
    worker ??= await context.waitForEvent('serviceworker');
    const loadedId = new URL(worker.url()).host;
    check('unpacked extension loads and registers its service worker', loadedId === extensionId, loadedId);
    const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
    check(
      'manifest permissions are the expected narrow set',
      JSON.stringify(manifest.permissions) === JSON.stringify(['sidePanel', 'offscreen', 'tabCapture', 'activeTab', 'storage']) &&
        JSON.stringify(manifest.host_permissions) === JSON.stringify(['http://127.0.0.1:4318/*']),
      JSON.stringify({ permissions: manifest.permissions, hosts: manifest.host_permissions }),
    );

    const page = await context.newPage();
    // Expected 401/offline network failures are provoked deliberately below; only script errors count.
    page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && consoleErrors.push(m.text()));
    page.on('pageerror', (error) => consoleErrors.push(String(error)));
    const panel = `chrome-extension://${extensionId}/index.html`;

    // Signed out
    for (const width of widths) {
      await page.setViewportSize({ width, height: 760 });
      await page.goto(panel);
      await page.getByRole('heading', { name: 'Connect to Tranz' }).waitFor();
      check(`signed-out view has no horizontal overflow at ${width}px`, await noHorizontalOverflow(page));
      await shoot(page, `01-connect-${width}`);
    }

    // Wrong token is rejected with a visible error
    await page.setViewportSize({ width: 360, height: 760 });
    await page.getByLabel('Local access token').fill('x'.repeat(40));
    await page.getByRole('button', { name: 'Connect workspace' }).click();
    await page.getByRole('alert').waitFor();
    check('invalid token shows an error', (await page.getByRole('alert').textContent()).includes('not accepted'));

    await page.getByLabel('Local access token').fill(token);
    await page.getByRole('button', { name: 'Connect workspace' }).click();
    await page.getByRole('heading', { name: 'Prepare your meeting' }).waitFor();
    check('valid token opens the prepare view', true);
    check(
      'start is blocked without a profile, Agora credentials or consent',
      (await page.getByRole('button', { name: 'Start listening' }).isDisabled()) &&
        (await page.locator('#start-blockers li').count()) >= 3,
    );
    await shoot(page, '02-prepare-empty-360');

    // Create a profile through the real form
    await page.getByRole('button', { name: 'Create a context profile' }).click();
    await page.getByLabel('Profile name').fill('Synthetic sprint sync');
    await page.getByLabel('Your role').fill('Backend engineer (synthetic)');
    await page.getByLabel('Verified project facts').fill('Synthetic fact: the beta ships after QA sign-off. Launch date is undecided.');
    await page.getByLabel('Meeting goal').fill('Agree on the next test milestone.');
    await shoot(page, '03-profile-form-360');
    await page.getByRole('button', { name: 'Save context' }).click();
    await page.getByText('Context saved').waitFor();
    check('profile is created through the form', (await page.getByRole('heading', { name: 'Synthetic sprint sync' }).count()) === 1);

    await page.getByRole('button', { name: 'Session', exact: true }).click();
    await page.getByText('Review the exact context').click();
    await page.getByLabel(/I’m ready to share meeting audio/).check();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      check(`prepare view has no horizontal overflow at ${width}px`, await noHorizontalOverflow(page));
      await shoot(page, `04-prepare-${width}`);
    }
    check(
      'start stays disabled when Agora credentials are missing',
      (await page.getByRole('button', { name: 'Start listening' }).isDisabled()) &&
        (await page.locator('#start-blockers').textContent()).includes('Agora credentials'),
    );

    // Keyboard order on the prepare view
    await page.setViewportSize({ width: 360, height: 900 });
    await page.keyboard.press('Escape');
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    const order = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      order.push(
        await page.evaluate(() => {
          const el = document.activeElement;
          const style = getComputedStyle(el);
          return `${el.tagName.toLowerCase()}:${(el.getAttribute('aria-label') || el.textContent || el.getAttribute('type') || '').trim().slice(0, 32)}|outline=${style.outlineStyle}`;
        }),
      );
    }
    writeFileSync(join(out, 'keyboard-order-prepare.txt'), order.join('\n'));
    check('keyboard focus reaches controls with a visible outline', order.every((item) => item.includes('outline=solid')), `${order.length} stops`);

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('heading', { name: 'Connection and privacy' }).waitFor();
    await shoot(page, '05-settings-360');

    // Simulated live session: synthetic segments posted straight to the API (no audio, no Agora).
    const profiles = await api('GET', '/profiles');
    const sessionId = randomUUID();
    await api('POST', '/sessions', { id: sessionId, profileId: profiles[0].id, retain: true });
    await api('POST', `/sessions/${sessionId}/heartbeat`, { state: 'listening' });
    heartbeat = setInterval(() => void api('POST', `/sessions/${sessionId}/heartbeat`, { state: 'listening' }), 10000);
    const lines = [
      'Synthetic line: thanks everyone for joining the test call.',
      'Synthetic line: the QA checklist is almost complete.',
      'Can you share when the beta will be ready?',
    ];
    await api(
      'PUT',
      `/sessions/${sessionId}/segments`,
      [
        ...lines.map((text, i) => ({ id: `synthetic-${i}`, text, final: true, revision: 1, at: Date.now() - (3 - i) * 5000 })),
        { id: 'synthetic-partial', text: 'Synthetic partial words still arriving', final: false, revision: 1, at: Date.now() },
      ],
    );
    await page.goto(panel);
    await page.getByText('In the meeting').waitFor();
    await page.getByText('[MOCK] Bản dịch mô phỏng: Can you share').waitFor({ timeout: 15000 });
    check('final segments are translated one by one and linked to their source (mock provider)', true);
    check('partial text is shown separately from final text', (await page.getByText('Hearing…').count()) === 1);
    check('detected question is labelled as a guess', (await page.getByText('Detected question (automatic guess)').count()) === 1);
    await page.getByRole('button', { name: 'Suggest a reply' }).click();
    await page.getByText('[MOCK] Based on our plan').waitFor();
    check('reply suggestion shows provenance and a verify warning', (await page.getByText(/AI suggestion — verify before using/).count()) === 1);
    await page.getByRole('button', { name: 'Conversation' }).click();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1100 });
      check(`simulated live view has no horizontal overflow at ${width}px`, await noHorizontalOverflow(page));
      await shoot(page, `06-live-simulated-${width}`);
    }
    await page.setViewportSize({ width: 360, height: 1100 });
    await page.getByRole('button', { name: /Catch me up/ }).click();
    await page.getByText('[MOCK] Mọi người').waitFor();
    await page.getByText('Think in Vietnamese, reply in English').click();
    await page.getByLabel('Your draft in Vietnamese').fill('Tôi cần thêm thời gian để xác nhận.');
    await page.getByRole('button', { name: 'Find the English wording' }).click();
    await page.getByText('[MOCK] I need a little more time').waitFor();
    check('catch-up and Vietnamese composer round-trip through the backend (mock provider)', true);
    await shoot(page, '07-composer-360');

    // Reduced motion removes the live pulse
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const animation = await page.locator('.status i').evaluate((el) => getComputedStyle(el).animationName);
    check('reduced motion disables the live indicator animation', animation === 'none', animation);
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // Text scaled to 200% at 400px
    await page.setViewportSize({ width: 400, height: 1100 });
    await page.addStyleTag({ content: ':root{font-size:28px!important}' });
    check('200% root text size keeps the live view free of horizontal overflow at 400px', await noHorizontalOverflow(page));
    await shoot(page, '08-live-text-200-400');
    await page.reload();
    await page.getByText('In the meeting').waitFor();

    clearInterval(heartbeat);
    await api('POST', `/sessions/${sessionId}/stop`);
    await page.getByText('Session ended').waitFor({ timeout: 10000 }).catch(async () => {
      await page.reload();
      await page.getByText('Session ended').waitFor();
    });

    // Delete dialog: focus moves in, Escape cancels, focus returns
    const trigger = page.getByRole('button', { name: 'Delete this session' });
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const focusInside = await page.evaluate(() => !!document.activeElement?.closest('dialog'));
    await shoot(page, '09-delete-dialog-360');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    const restored = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    check('delete dialog takes focus, closes on Escape and restores focus', focusInside && restored === 'Delete this session', `restored=${restored}`);

    await trigger.click();
    await page.getByRole('button', { name: 'Delete session' }).click();
    await page.getByText('Session deleted from this computer').waitFor();
    const gone = await fetch(`${backendApi}/sessions/${sessionId}`, { headers: { authorization: `Bearer ${token}` } });
    check('confirmed deletion removes the session from the backend', gone.status === 404);

    // Backend offline
    backend.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
    await page.reload();
    await page.getByRole('heading', { name: /cannot reach your local backend/ }).waitFor();
    check('backend offline shows a recovery screen', true);
    await shoot(page, '10-backend-offline-360');

    check('no script errors on extension pages', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  } finally {
    clearInterval(heartbeat);
    await context.close();
    backend.kill('SIGTERM');
    provider.close();
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(profileDir, { recursive: true, force: true });
    writeFileSync(join(out, 'results.json'), JSON.stringify({ extensionId, at: new Date().toISOString(), results }, null, 2));
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: ${out}`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
