// Read-only capability check for the browser's built-in EN→VI Translator API.
// Set TRANZ_CHROMIUM to the browser executable. Pass --translate to download the language pack in
// a disposable profile and benchmark synthetic sentences; no meeting content is ever used.
import { chromium } from 'playwright';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';

const executablePath = process.env.TRANZ_CHROMIUM;
if (!executablePath) throw new Error('Đặt TRANZ_CHROMIUM tới file thực thi Chrome/Cốc Cốc cần kiểm tra.');
const shouldTranslate = process.argv.includes('--translate');
const profile = mkdtempSync(join(tmpdir(), 'tranz-translator-'));
const server = http.createServer((_req, res) => res.end('<!doctype html><title>Tranz translator check</title>'));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Không mở được trang kiểm tra cục bộ.');

let context;
try {
  context = await chromium.launchPersistentContext(profile, { executablePath, headless: true });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${address.port}`);
  const result = await page.evaluate(async (runTranslation) => {
    const factory = globalThis.Translator;
    if (!factory) return { supported: false };
    const options = { sourceLanguage: 'en', targetLanguage: 'vi' };
    const availability = await factory.availability(options);
    if (!runTranslation || availability === 'unavailable') return { supported: true, availability };
    const progress = [];
    const startedAt = globalThis.performance.now();
    const translator = await factory.create({
      ...options,
      monitor(monitor) {
        monitor.addEventListener('downloadprogress', (event) => progress.push(event.loaded));
      },
    });
    const readyMs = globalThis.performance.now() - startedAt;
    const samples = [
      'Could you share the latest project update?',
      'We need to confirm the timeline before Friday.',
      'What are the main risks for this release?',
      'I will follow up with the engineering team.',
      'Let us review the next steps after the meeting.',
    ];
    const timings = [];
    const translations = [];
    for (const sample of samples) {
      const before = globalThis.performance.now();
      translations.push(await translator.translate(sample));
      timings.push(globalThis.performance.now() - before);
    }
    return { supported: true, availability, readyMs, progress, timings, translations };
  }, shouldTranslate);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await context?.close();
  server.close();
  rmSync(profile, { recursive: true, force: true });
}
