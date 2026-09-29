// Test-only entry bundled into a temporary copy of the extension by scripts/verify-capture.mjs.
// It is never part of the shipped extension build. It drives the real Capture class with a real
// tab-capture stream and a synthetic microphone, and measures the mixed output level.
import { Capture } from '../../apps/extension/src/capture';

// Keep test runs silent: every AudioContext in this page renders to no output device, so the
// playback Capture restores for the person is processed but never reaches the speakers.
const AudioContextToDevice = window.AudioContext;
window.AudioContext = class extends AudioContextToDevice {
  constructor(options?: AudioContextOptions) {
    super({ ...options, sinkId: { type: 'none' } } as AudioContextOptions);
  }
} as typeof AudioContext;

type Internals = { tab?: MediaStream; mic?: MediaStream };

let capture: Capture | undefined;

// Stand-in microphone: any non-tab getUserMedia call receives an 880 Hz oscillator stream, so the
// test never opens a real microphone.
const realGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
navigator.mediaDevices.getUserMedia = async (constraints) => {
  const audio = constraints?.audio as { mandatory?: { chromeMediaSource?: string } } | undefined;
  if (audio?.mandatory?.chromeMediaSource === 'tab') return realGetUserMedia(constraints);
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  oscillator.frequency.value = 880;
  const destination = context.createMediaStreamDestination();
  oscillator.connect(destination);
  oscillator.start();
  return destination.stream;
};
let output: MediaStreamTrack | undefined;
let sources: MediaStreamTrack[] = [];
let ended = 0;

function streamIdFor(tabId: number) {
  return new Promise<string>((resolve, reject) =>
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) =>
      id ? resolve(id) : reject(new Error(chrome.runtime.lastError?.message ?? 'no stream id')),
    ),
  );
}

/** Peak RMS of the outgoing (to-provider) mix over a window. */
async function level(ms = 1500) {
  if (!output) throw new Error('not started');
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  context.createMediaStreamSource(new MediaStream([output])).connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  let peak = 0;
  const until = performance.now() + ms;
  while (performance.now() < until) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const value of samples) sum += value * value;
    peak = Math.max(peak, Math.sqrt(sum / samples.length));
  }
  await context.close();
  return peak;
}

async function start(tabId: number) {
  capture = new Capture();
  output = await capture.start(await streamIdFor(tabId), () => ended++);
  const internals = capture as unknown as Internals;
  sources = [...(internals.tab?.getTracks() ?? []), ...(internals.mic?.getTracks() ?? [])];
  return { tabTracks: internals.tab?.getAudioTracks().length ?? 0, micTracks: internals.mic?.getAudioTracks().length ?? 0 };
}

async function stop() {
  await capture?.stop();
  return {
    sourcesEnded: sources.length > 0 && sources.every((track) => track.readyState === 'ended'),
    outputEnded: output?.readyState === 'ended',
    endedCallbacks: ended,
  };
}

/** Microphone permission denied after the tab stream was acquired: the tab track must be released. */
async function denied(tabId: number) {
  const original = navigator.mediaDevices.getUserMedia;
  let tab: MediaStream | undefined;
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    if (tab) throw new DOMException('Synthetic permission denial', 'NotAllowedError');
    tab = await original.call(navigator.mediaDevices, constraints);
    return tab;
  };
  try {
    await new Capture().start(await streamIdFor(tabId), () => {});
    return { rejected: false };
  } catch (error) {
    return { rejected: true, name: (error as DOMException).name, tabReleased: !!tab && tab.getTracks().every((t) => t.readyState === 'ended') };
  } finally {
    navigator.mediaDevices.getUserMedia = original;
  }
}

Object.assign(window, {
  captureTest: {
    start,
    stop,
    level,
    denied,
    pause: (value: boolean) => capture?.setPaused(value),
    mute: (value: boolean) => capture?.setMuted(value),
  },
});
