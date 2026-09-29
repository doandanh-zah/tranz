// Extension service worker: remembers which tab the user invoked Tranz on, owns the offscreen
// document's lifetime, and forwards panel commands to it.

const MEETING_ORIGIN = 'https://meet.google.com/';

/** Errors whose message is written for the user and safe to show as-is. */
class UserFacingError extends Error {}

let creating: Promise<void> | undefined;

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  void chrome.storage.session.set({ meetingTabId: tab.id });
  void chrome.sidePanel.open({ tabId: tab.id });
});

async function hasOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT] });
  return contexts.length > 0;
}

async function ensureOffscreen() {
  if (await hasOffscreen()) return;
  creating ??= chrome.offscreen
    .createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'Capture selected meeting audio after an explicit user start and keep meeting playback audible.',
    })
    .finally(() => {
      creating = undefined;
    });
  await creating;
}

async function toOffscreen(message: Record<string, unknown>) {
  const result = await chrome.runtime.sendMessage({ ...message, target: 'offscreen' });
  if (result?.error) throw new UserFacingError(result.error);
  return result;
}

/** Stops the runtime, then closes the document: closing guarantees every capture track is released. */
async function stopCapture(reason: string) {
  if (!(await hasOffscreen())) return { ok: true, wasActive: false };
  try {
    return await toOffscreen({ type: 'stop', reason });
  } finally {
    await chrome.offscreen.closeDocument().catch(() => {});
  }
}

async function startCapture(message: Record<string, unknown>) {
  const { meetingTabId } = await chrome.storage.session.get('meetingTabId');
  if (typeof meetingTabId !== 'number') {
    throw new UserFacingError('Click the Tranz toolbar icon while your Google Meet tab is open, then press Start.');
  }
  const tab = await chrome.tabs.get(meetingTabId).catch(() => undefined);
  if (!tab) throw new UserFacingError('The meeting tab was closed. Open the meeting and click the Tranz toolbar icon again.');
  if (!tab.url?.startsWith(MEETING_ORIGIN)) {
    throw new UserFacingError('Tranz only captures Google Meet tabs. Open the meeting, then click the Tranz toolbar icon on that tab.');
  }
  await ensureOffscreen();
  let streamId: string;
  try {
    streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: meetingTabId });
  } catch {
    throw new UserFacingError('Chrome did not allow tab capture. Click the Tranz toolbar icon on the meeting tab again, then press Start.');
  }
  return toOffscreen({ ...message, streamId });
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.target !== 'worker') return;
  void (async () => {
    switch (message.type) {
      case 'start':
        return startCapture(message);
      case 'stop':
        return stopCapture(message.reason ?? 'user');
      case 'status':
        return (await hasOffscreen()) ? toOffscreen({ type: 'status' }) : { active: false, paused: false, muted: false };
      default:
        if (!(await hasOffscreen())) throw new UserFacingError('No audio session is running.');
        return toOffscreen(message);
    }
  })()
    .then((result) => respond(result ?? { ok: true }))
    .catch((error) =>
      respond({
        error: error instanceof UserFacingError ? error.message : 'Capture is unavailable. Reopen Tranz on the meeting tab and check microphone permission.',
      }),
    );
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.get('meetingTabId').then(({ meetingTabId }) => {
    if (tabId === meetingTabId) void stopCapture('tab-closed').catch(() => {});
  });
});
