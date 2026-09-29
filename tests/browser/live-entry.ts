// Test-only entry bundled by scripts/verify-live-agora.ts into a temporary copy of the extension.
// It runs the real Runtime (capture + Agora RTC/RTM + transcript upload) against a real tab-capture
// stream of a synthetic speech tab. The microphone is replaced by silence, so no real microphone
// is ever opened. Never part of the shipped extension.
import { Runtime } from '../../apps/extension/src/runtime';
import type { EndReason } from '../../packages/shared/contracts';

// Keep test runs silent: every AudioContext in this page renders to no output device, so the
// playback Capture restores for the person is processed but never reaches the speakers.
const AudioContextToDevice = window.AudioContext;
window.AudioContext = class extends AudioContextToDevice {
  constructor(options?: AudioContextOptions) {
    super({ ...options, sinkId: { type: 'none' } } as AudioContextOptions);
  }
} as typeof AudioContext;

const realGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
navigator.mediaDevices.getUserMedia = async (constraints) => {
  const audio = constraints?.audio as { mandatory?: { chromeMediaSource?: string } } | undefined;
  if (audio?.mandatory?.chromeMediaSource === 'tab') return realGetUserMedia(constraints);
  return new AudioContext().createMediaStreamDestination().stream; // silent stand-in microphone
};

const runtime = new Runtime();

/** Diagnostics read from the runtime's internals after start (synthetic content only). */
type Internals = {
  ai?: { on: (event: string, handler: (...args: unknown[]) => void) => void };
  rtm?: { addEventListener: (event: string, handler: (event: unknown) => void) => void };
  track?: { getVolumeLevel: () => number };
};
const diag = { transcriptEvents: 0, items: [] as unknown[], rtmMessages: 0, rtmSamples: [] as unknown[], agentStates: [] as unknown[], agentErrors: [] as unknown[], volumes: [] as number[] };

function attachDiagnostics() {
  const internals = runtime as unknown as Internals;
  internals.ai?.on('transcript-updated', (items) => {
    diag.transcriptEvents++;
    diag.items = (items as { metadata?: { object?: string }; status?: unknown; uid?: unknown; text?: string }[]).slice(-6).map((item) => ({ object: item.metadata?.object, status: item.status, uid: item.uid, text: item.text?.slice(0, 80) }));
  });
  internals.ai?.on('agent-state-changed', (_agent, event) => diag.agentStates.push(event));
  internals.ai?.on('agent-error', (_agent, error) => diag.agentErrors.push(error));
  internals.rtm?.addEventListener('message', (event) => {
    diag.rtmMessages++;
    if (diag.rtmSamples.length < 3) diag.rtmSamples.push(JSON.stringify(event).slice(0, 300));
  });
  setInterval(() => diag.volumes.push(Number((internals.track?.getVolumeLevel() ?? -1).toFixed(3))), 1000);
}

function streamIdFor(tabId: number) {
  return new Promise<string>((resolve, reject) =>
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) =>
      id ? resolve(id) : reject(new Error(chrome.runtime.lastError?.message ?? 'no stream id')),
    ),
  );
}

Object.assign(window, {
  live: {
    start: async (id: string, token: string, tabId: number) => {
      try {
        await runtime.start(id, token, await streamIdFor(tabId));
        attachDiagnostics();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
    pause: (value: boolean) => runtime.pause(value),
    mute: (value: boolean) => runtime.mute(value),
    stop: (reason?: EndReason) => runtime.stop(reason),
    status: () => runtime.status(),
    diag: () => diag,
  },
});
