// Loads the built unpacked extension in Playwright Chromium and exercises the side-panel document
// against a throwaway local backend. Everything here is synthetic:
// - the AI provider is an in-process MOCK (every output is prefixed "[MOCK]");
// - "live" sessions are SIMULATED by posting synthetic transcript segments to the API;
// - no Agora credentials are used, so no real audio, RTC or RTM is exercised.
// It proves rendering, wiring, keyboard and layout behaviour of the real build only.
// Usage: [TRANZ_CHROMIUM=/path/to/chrome-for-testing] npm run verify:ui [-- outputDir]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const out = resolve(process.argv[2] ?? 'artifacts/ui');
// Tests use their own build so the dist/extension a person has loaded in Chrome is never rewritten.
const buildDir = resolve(process.env.TRANZ_BUILD_DIR ?? 'artifacts/verify-build');
const extensionPath = join(buildDir, 'extension');
const widths = [320, 360, 375, 400, 480, 600];
const token = randomBytes(32).toString('hex');
const dataDir = mkdtempSync(join(tmpdir(), 'tranz-ui-'));
const profileDir = mkdtempSync(join(tmpdir(), 'tranz-chromium-'));
const results = [];
let translationProviderCalls = 0;
// Matches VITE_TRANZ_BACKEND in build:verify, so a backend the person runs on 4318 is left alone.
// Override both together (TRANZ_VERIFY_PORT + a build with that backend) when 4328 is already in use.
const PORT = Number(process.env.TRANZ_VERIFY_PORT ?? 4328);
const backendApi = `http://127.0.0.1:${PORT}/api`;

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
      if (system.includes('Translate')) {
        translationProviderCalls++;
        content = { translations: data.lines.map((line) => ({ id: line.id, translation: `[MOCK] Bản dịch mô phỏng: ${line.text}` })) };
      }
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

const dataKey = randomBytes(32).toString('hex');
const backends = [];

function startBackend(overrides = {}) {
  const child = spawn(process.execPath, [join(buildDir, 'server/index.js')], {
    env: {
      PATH: process.env.PATH,
      PORT: String(PORT),
      ACCESS_TOKEN: token,
      DATA_KEY: dataKey,
      DATA_DIR: dataDir,
      AI_PROVIDER: 'openai',
      AI_BASE_URL: 'http://127.0.0.1:4319/v1',
      AI_API_KEY: 'mock-key-not-a-real-credential',
      AI_MODEL: 'mock-model',
      EXTENSION_ID: extensionId,
      ...overrides,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  backends.push(child);
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
  // Navigation enters once. Capture the completed view, not the first transparent frame.
  await page.locator('.view-content').evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => {})));
  });
  await page.screenshot({ path: join(out, `${name}.png`), fullPage: true });
}

async function main() {
  mkdirSync(out, { recursive: true });
  const consoleErrors = [];
  let provider;
  let backend;
  let context;
  let heartbeat;
  try {
    provider = await mockProvider();
    backend = await startBackend();
    // TRANZ_CHROMIUM may point at a Chrome for Testing / Chromium build (branded Chrome ignores --load-extension).
    context = await chromium.launchPersistentContext(profileDir, {
      ...(process.env.TRANZ_CHROMIUM ? { executablePath: process.env.TRANZ_CHROMIUM } : { channel: 'chromium' }),
      headless: true,
      timeout: 30000,
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await context.addInitScript(() => {
      if (globalThis.location.search.includes('translation-fallback')) {
        Object.defineProperty(globalThis, 'Translator', { configurable: true, value: undefined });
        return;
      }
      Object.defineProperty(globalThis, 'Translator', {
        configurable: true,
        value: {
          availability: async () => 'available',
          create: async () => ({ translate: async (text) => `[DEVICE] Bản dịch trên thiết bị: ${text}` }),
        },
      });
    });
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

    // Opening the panel pairs automatically: no token or password field appears.
    await page.setViewportSize({ width: 360, height: 900 });
    await page.goto(panel);
    await page.getByRole('heading', { name: 'Sẵn sàng cho cuộc họp' }).waitFor();
    check('the panel connects by itself, with no access-token step', (await page.locator('input[type=password]').count()) === 0);
    check('panel renders the app instead of the loading fallback', !(await page.locator('#root').textContent()).includes('Đang mở Tranz'));
    check(
      'home shows a three-step checklist and one start button',
      (await page.locator('.checklist li').count()) === 3 && (await page.getByRole('button', { name: 'Bắt đầu nghe' }).count()) === 1,
    );
    check(
      'start stays disabled until AI, microphone and Google Meet are ready, and missing Agora is explained',
      (await page.getByRole('button', { name: 'Bắt đầu nghe' }).isDisabled()) && (await page.getByText(/thiếu cấu hình Agora/).count()) === 1,
    );
    check(
      'the data-flow disclosure is visible under the start button, not collapsed',
      await page.locator('.start-zone .consent').isVisible(),
    );
    check('home reports that on-device EN→VI translation is ready', (await page.getByText(/Dịch nhanh EN→VI đã sẵn sàng/).count()) === 1);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      check(`home has no horizontal overflow at ${width}px`, await noHorizontalOverflow(page));
      await shoot(page, `01-home-${width}`);
    }

    const contrast = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const rgb = (token) => {
        const hex = root.getPropertyValue(token).trim().replace('#', '');
        const expanded = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
        return expanded.match(/.{2}/g).map((c) => parseInt(c, 16) / 255);
      };
      const luminance = (token) => rgb(token).map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
      const ratio = (foreground, background) => {
        const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      return {
        muted: ratio('--muted', '--raised'),
        secondary: ratio('--text-2', '--raised'),
        border: ratio('--line-strong', '--raised'),
        primary: ratio('--primary', '--primary-contrast'),
      };
    });
    check('body text and interactive outlines contrast with the darkest raised surface',
      contrast.muted >= 4.5 && contrast.secondary >= 4.5 && contrast.border >= 3 && contrast.primary >= 4.5,
      JSON.stringify(contrast));

    await page.getByRole('link', { name: 'Đến nội dung chính' }).focus();
    await page.keyboard.press('Enter');
    check('keyboard skip link moves focus to main', await page.evaluate(() => document.activeElement?.id === 'main'));

    await page.setViewportSize({ width: 400, height: 900 });
    const textScale = await page.addStyleTag({ content: ':root{font-size:30px!important}' });
    check('200% text size keeps setup free of horizontal overflow at 400px', await noHorizontalOverflow(page));
    await shoot(page, '02-home-text-200-400');
    await textScale.evaluate((el) => el.remove());

    // Optional context, created through the real form
    await page.setViewportSize({ width: 360, height: 900 });
    await page.getByRole('button', { name: 'Ngữ cảnh', exact: true }).click();
    await page.getByRole('button', { name: 'Tạo ngữ cảnh mới' }).click();
    await page.getByLabel('Tên (để bạn dễ chọn)').fill('Synthetic sprint sync');
    await page.getByLabel('Vai trò của bạn').fill('Backend engineer (synthetic)');
    await page.getByLabel('Thông tin chắc chắn về công việc').fill('Synthetic fact: the beta ships after QA sign-off. Launch date is undecided.');
    await page.getByLabel('Mục tiêu cuộc họp').fill('Agree on the next test milestone.');
    await shoot(page, '03-context-form-360');
    await page.getByRole('button', { name: 'Lưu ngữ cảnh' }).click();
    await page.getByText('Đã lưu ngữ cảnh').waitFor();
    check('context is created through the form', (await page.getByRole('heading', { name: 'Synthetic sprint sync' }).count()) === 1);

    await page.getByRole('button', { name: 'Cuộc họp', exact: true }).click();
    await page.getByText('Tuỳ chọn cho cuộc họp này').click();
    check('the optional context can be picked under options', (await page.locator('select option', { hasText: 'Synthetic sprint sync' }).count()) === 1);
    await shoot(page, '04-home-options-360');

    // Keyboard order on the home view
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    const order = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      order.push(
        await page.evaluate(() => {
          const el = document.activeElement;
          const style = getComputedStyle(el);
          return `${el.tagName.toLowerCase()}:${(el.getAttribute('aria-label') || el.textContent || el.getAttribute('type') || '').trim().slice(0, 32)}|outline=${style.outlineStyle}`;
        }),
      );
    }
    writeFileSync(join(out, 'keyboard-order-home.txt'), order.join('\n'));
    check('keyboard focus reaches controls with a visible outline', order.every((item) => item.includes('outline=solid')), `${order.length} stops`);

    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await page.getByRole('heading', { name: 'Cài đặt', exact: true }).waitFor();
    await shoot(page, '05-settings-360');
    for (const width of [320, 375, 600]) {
      await page.setViewportSize({ width, height: 900 });
      check(`settings has no horizontal overflow at ${width}px`, await noHorizontalOverflow(page));
      await shoot(page, `05-settings-${width}`);
    }

    // Explicitly remove the browser Translator API in a separate panel document. This proves the
    // disclosed ChatGPT fallback without racing the primary on-device panel.
    const fallbackId = randomUUID();
    await api('POST', '/sessions', { id: fallbackId, retain: false });
    await api('POST', `/sessions/${fallbackId}/heartbeat`, { state: 'listening' });
    await api('PUT', `/sessions/${fallbackId}/segments`, [
      { id: 'fallback-1', text: 'Synthetic fallback sentence.', final: true, revision: 1, at: Date.now() },
    ]);
    const fallbackPage = await context.newPage();
    await fallbackPage.goto(`${panel}?translation-fallback=1`);
    await fallbackPage.getByText('[MOCK] Bản dịch mô phỏng: Synthetic fallback sentence.').waitFor({ timeout: 15000 });
    check('missing browser Translator API falls back to the mock AI provider', translationProviderCalls === 1);
    await fallbackPage.close();
    await api('DELETE', `/sessions/${fallbackId}`);

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
    await page.getByText('Trong cuộc họp').waitFor();
    await page.getByText('[DEVICE] Bản dịch trên thiết bị: Can you share').waitFor({ timeout: 15000 });
    check('final lines use the on-device translator and do not call the AI translation provider', translationProviderCalls === 1);
    check('partial text is shown separately from final text', (await page.getByText('Đang nghe…', { exact: true }).count()) === 1);
    check('the detected question is labelled as a guess', (await page.getByText('Câu hỏi Tranz đoán được').count()) === 1);
    await page.getByRole('button', { name: 'Ngữ cảnh', exact: true }).click();
    for (const width of [320, 375, 400]) {
      await page.setViewportSize({ width, height: 900 });
      check(`active-session navigation header fits at ${width}px`, await noHorizontalOverflow(page));
      await shoot(page, `06-active-context-${width}`);
    }
    const activeScale = await page.addStyleTag({ content: ':root{font-size:30px!important}' });
    check('active-session navigation fits at 200% text size', await noHorizontalOverflow(page));
    await shoot(page, '06-active-context-text-200');
    await activeScale.evaluate((el) => el.remove());
    await page.getByRole('button', { name: 'Quay lại cuộc họp', exact: true }).click();
    await page.setViewportSize({ width: 360, height: 1100 });
    await page.getByRole('button', { name: 'Gợi ý câu trả lời' }).click();
    await page.getByText('[MOCK] Based on our plan').waitFor();
    check('a reply suggestion shows its sources and a check-before-use note', (await page.getByText(/Gợi ý của AI, hãy kiểm tra/).count()) === 1);
    await page.getByRole('button', { name: /Toàn bộ hội thoại/ }).click();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1100 });
      check(`simulated live view has no horizontal overflow at ${width}px`, await noHorizontalOverflow(page));
      await shoot(page, `06-live-simulated-${width}`);
    }
    await page.setViewportSize({ width: 360, height: 1100 });
    await page.getByRole('button', { name: 'Tóm tắt vừa rồi' }).click();
    await page.getByText('[MOCK] Mọi người').waitFor();
    await page.getByText('Tôi muốn nói…').click();
    await page.getByLabel('Điều bạn muốn nói, bằng tiếng Việt').fill('Tôi cần thêm thời gian để xác nhận.');
    await page.getByRole('button', { name: 'Chuyển sang tiếng Anh' }).click();
    await page.getByText('[MOCK] I need a little more time').waitFor();
    check('catch-up and the Vietnamese composer round-trip through the backend (mock provider)', true);
    await shoot(page, '07-composer-360');

    // Reduced motion removes the live pulse
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const animation = await page.locator('.status i').evaluate((el) => getComputedStyle(el).animationName);
    check('reduced motion disables the live indicator animation', animation === 'none', animation);
    check('reduced motion disables view entrance while the page is open',
      await page.locator('.view-content').evaluate((el) => getComputedStyle(el).animationName === 'none'));
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    check('changing motion preference back restores the view motion rule',
      await page.locator('.view-content').evaluate((el) => getComputedStyle(el).animationName === 'view-arrive'));

    // Text scaled to 200% at 400px
    await page.setViewportSize({ width: 400, height: 1100 });
    await page.addStyleTag({ content: ':root{font-size:30px!important}' });
    check('200% root text size keeps the live view free of horizontal overflow at 400px', await noHorizontalOverflow(page));
    await shoot(page, '08-live-text-200-400');
    await page.reload();
    await page.getByText('Trong cuộc họp').waitFor();

    clearInterval(heartbeat);
    await api('POST', `/sessions/${sessionId}/stop`);
    await page.getByText('[MOCK] Tóm tắt mô phỏng').waitFor({ timeout: 15000 });
    check('stopping creates notes in the background and the panel shows them (mock provider)', true);
    check('a kept session states its retention', (await page.getByRole('heading', { name: /Đã lưu trên máy này/ }).count()) === 1);
    check('practice phrases are labelled as not what anyone said', (await page.getByText(/không phải lời ai đã nói/).count()) === 1);
    for (const width of [320, 600]) {
      await page.setViewportSize({ width, height: 1400 });
      check(`after-meeting notes have no horizontal overflow at ${width}px`, await noHorizontalOverflow(page));
      await shoot(page, `11-notes-${width}`);
    }
    await page.setViewportSize({ width: 360, height: 1100 });

    await page.getByRole('button', { name: 'Đã lưu', exact: true }).click();
    check('the saved list shows the kept session', (await page.getByRole('heading', { name: 'Synthetic sprint sync' }).count()) === 1);
    await shoot(page, '12-library-360');
    await page.getByRole('button', { name: 'Mở lại' }).click();
    await page.getByRole('heading', { name: /Đã lưu trên máy này/ }).waitFor();

    // Delete dialog: focus moves in, Escape cancels, focus returns
    const trigger = page.getByRole('button', { name: 'Xoá phiên này' });
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const focusInside = await page.evaluate(() => !!document.activeElement?.closest('dialog'));
    await shoot(page, '09-delete-dialog-360');
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    const restored = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    check('the delete dialog takes focus, closes on Escape and restores focus', focusInside && restored === 'Xoá phiên này', `restored=${restored}`);

    await trigger.click();
    await page.getByRole('button', { name: 'Xoá phiên', exact: true }).click();
    await page.getByText('Đã xoá phiên khỏi máy này').waitFor();
    const gone = await fetch(`${backendApi}/sessions/${sessionId}`, { headers: { authorization: `Bearer ${token}` } });
    check('confirmed deletion removes the session from the backend', gone.status === 404);

    // Temporary session: held in memory only until the user presses Save in the panel.
    const temporaryId = randomUUID();
    await api('POST', '/sessions', { id: temporaryId, retain: false });
    await api('POST', `/sessions/${temporaryId}/heartbeat`, { state: 'listening' });
    await api('PUT', `/sessions/${temporaryId}/segments`, [{ id: 't-1', text: 'Synthetic temporary line.', final: true, revision: 1, at: Date.now() }]);
    await page.reload();
    await page.getByText('Trong cuộc họp').waitFor();
    check('a session without context runs as "Cuộc họp nhanh"', (await page.getByText(/Cuộc họp nhanh/).count()) >= 1);
    await api('POST', `/sessions/${temporaryId}/stop`, { reason: 'tab-closed' });
    await page.getByRole('heading', { name: /Phiên tạm thời/ }).waitFor({ timeout: 10000 });
    check('an automatic stop explains why it happened', (await page.getByText('Đã dừng vì tab cuộc họp bị đóng.').count()) === 1);
    const listedBefore = (await api('GET', '/sessions')).some((s) => s.id === temporaryId);
    await shoot(page, '13-temporary-360');
    await page.getByRole('button', { name: 'Lưu phiên này' }).click();
    await page.getByRole('heading', { name: /Đã lưu trên máy này/ }).waitFor();
    const listedAfter = (await api('GET', '/sessions')).some((s) => s.id === temporaryId && s.retain);
    check('a stopped temporary session is not listed until the user saves it from the panel', !listedBefore && listedAfter);
    await page.getByRole('button', { name: 'Cuộc họp mới' }).click();

    // Backend offline
    backend.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
    await page.reload();
    await page.getByRole('heading', { name: 'Tranz trên máy chưa chạy' }).waitFor();
    check('backend offline shows plain recovery steps', (await page.getByText('npm run dev').count()) === 1);
    await shoot(page, '10-backend-offline-360');

    // ChatGPT provider with the synthetic Codex stand-in, signed in from the home checklist. The
    // OpenAI page is intercepted locally, so nothing is sent to OpenAI.
    await context.route('https://auth.openai.com/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<title>Synthetic sign-in</title>Synthetic OpenAI sign-in page (test)' }),
    );
    await startBackend({ AI_PROVIDER: 'chatgpt', AI_API_KEY: '', CODEX_BIN: resolve('tests/fixtures/fake-codex.mjs'), FAKE_CODEX_SIGNED_IN: '0' });
    await page.getByRole('button', { name: 'Thử lại' }).click();
    await page.getByRole('button', { name: 'Đăng nhập ChatGPT' }).waitFor();
    check('the checklist offers "Đăng nhập ChatGPT" when not signed in', true);
    await shoot(page, '14-chatgpt-checklist-360');
    const opened = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Đăng nhập ChatGPT' }).click();
    const authPage = await opened;
    await page.getByText(/Đã đăng nhập: synthetic@example.test/).waitFor({ timeout: 15000 });
    check('sign-in opens the OpenAI page in a new tab and the checklist marks it done', authPage.url().startsWith('https://auth.openai.com/'), authPage.url().split('?')[0]);
    await authPage.close();
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await page.getByText(/· plus/).waitFor();
    check('settings shows the signed-in ChatGPT plan', true);
    await shoot(page, '15-chatgpt-settings-360');

    check('no script errors on extension pages', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  } finally {
    clearInterval(heartbeat);
    await context?.close();
    for (const child of backends) child.kill('SIGTERM');
    provider?.close();
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
