/** Browser/extension integration for the side panel. Nothing here touches provider credentials. */
export const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

// chrome.storage.session is memory-only and cleared when the browser restarts.
export async function readToken() {
  if (isExtension) return String((await chrome.storage.session.get('token')).token ?? '');
  return sessionStorage.getItem('tranz-token') ?? '';
}

export async function writeToken(token: string) {
  if (isExtension) await chrome.storage.session.set({ token });
  else sessionStorage.setItem('tranz-token', token);
}

export type CaptureCommand = 'start' | 'pause' | 'mute' | 'stop' | 'status' | 'meeting';
export type CaptureStatus = { active: boolean; paused: boolean; muted: boolean };

export async function sendCommand<T = { ok: true }>(type: CaptureCommand, extra: Record<string, unknown> = {}) {
  if (!isExtension) {
    throw new Error('Chỉ nghe được cuộc họp khi mở Tranz từ extension trong Chrome.');
  }
  const result = await chrome.runtime.sendMessage({ target: 'worker', type, ...extra });
  if (result?.error) throw new Error(result.error);
  return result as T;
}

export type MicrophonePermission = PermissionState | 'unknown';

export async function microphonePermission(): Promise<MicrophonePermission> {
  try {
    return (await navigator.permissions.query({ name: 'microphone' as PermissionName })).state;
  } catch {
    return 'unknown';
  }
}

/** Prompts for microphone access and immediately releases the device. */
export async function requestMicrophone() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  for (const track of stream.getTracks()) track.stop();
}

/** Chrome cannot always show permission prompts inside the side panel; a full tab can. */
export function openSetupTab() {
  if (isExtension) void chrome.tabs.create({ url: chrome.runtime.getURL('index.html?setup=microphone') });
}

export function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Thao tác không thành công. Hãy thử lại.';
}
