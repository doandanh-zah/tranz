export type DeviceTranslationStatus = {
  state: 'checking' | 'downloading' | 'ready' | 'unsupported' | 'error';
  progress?: number;
  problem?: string;
};

type TranslationAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';
type TranslatorSession = { translate(text: string): Promise<string>; destroy?: () => void };
type TranslatorFactory = {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<TranslationAvailability>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (monitor: EventTarget) => void;
  }): Promise<TranslatorSession>;
};

const options = { sourceLanguage: 'en', targetLanguage: 'vi' } as const;

/**
 * Owns Chrome's on-device Translator API session. Calls are deliberately serialized because the
 * browser processes translations sequentially, and one shared model avoids repeated downloads.
 */
export class BrowserTranslator {
  private status: DeviceTranslationStatus = { state: 'checking' };
  private listeners = new Set<(status: DeviceTranslationStatus) => void>();
  private preparing?: Promise<TranslatorSession>;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly factory = (globalThis as typeof globalThis & { Translator?: TranslatorFactory }).Translator) {}

  snapshot() {
    return this.status;
  }

  subscribe(listener: (status: DeviceTranslationStatus) => void) {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  prepare() {
    if (this.preparing) return this.preparing;
    this.preparing = this.create().catch((caught) => {
      const problem = caught instanceof Error ? caught.message : String(caught);
      if (this.status.state !== 'unsupported') this.update({ state: 'error', problem });
      this.preparing = undefined;
      throw caught;
    });
    return this.preparing;
  }

  async translate(text: string) {
    const run = this.queue.then(async () => {
      const translator = await this.prepare();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const translated = await Promise.race([
          translator.translate(text),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('Dịch trên thiết bị mất quá nhiều thời gian.')), 10_000);
          }),
        ]);
        if (!translated.trim()) throw new Error('Mô hình trên thiết bị trả về bản dịch trống.');
        return translated.trim();
      } catch (caught) {
        const problem = caught instanceof Error ? caught.message : String(caught);
        this.update({ state: 'error', problem });
        throw caught;
      } finally {
        if (timer) clearTimeout(timer);
      }
    });
    // A failed item must not poison the queue for later retries or the ChatGPT fallback.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async create() {
    if (!this.factory) {
      this.update({ state: 'unsupported' });
      throw new Error('Trình duyệt này chưa hỗ trợ dịch trên thiết bị.');
    }
    const availability = await this.factory.availability(options);
    if (availability === 'unavailable') {
      this.update({ state: 'unsupported' });
      throw new Error('Trình duyệt không có gói dịch tiếng Anh sang tiếng Việt.');
    }
    if (availability !== 'available') this.update({ state: 'downloading', progress: 0 });
    const translator = await this.factory.create({
      ...options,
      monitor: (monitor) => {
        monitor.addEventListener('downloadprogress', (event) => {
          const loaded = 'loaded' in event && typeof event.loaded === 'number' ? event.loaded : 0;
          this.update({ state: 'downloading', progress: Math.max(0, Math.min(1, loaded)) });
        });
      },
    });
    this.update({ state: 'ready', progress: 1 });
    return translator;
  }

  private update(status: DeviceTranslationStatus) {
    this.status = status;
    for (const listener of this.listeners) listener(status);
  }
}

export const browserTranslator = new BrowserTranslator();
