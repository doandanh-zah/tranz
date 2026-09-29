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

/** For the panel's checklist: is the tab Tranz was opened on a Google Meet meeting? */
async function meetingStatus() {
  const { meetingTabId } = await chrome.storage.session.get('meetingTabId');
  if (typeof meetingTabId !== 'number') return { ready: false };
  const tab = await chrome.tabs.get(meetingTabId).catch(() => undefined);
  return { ready: !!tab?.url?.startsWith(MEETING_ORIGIN) };
}

async function startCapture(message: Record<string, unknown>) {
  const { meetingTabId } = await chrome.storage.session.get('meetingTabId');
  if (typeof meetingTabId !== 'number') {
    throw new UserFacingError('Hãy mở cuộc họp Google Meet, bấm biểu tượng Tranz trên thanh công cụ ở chính tab đó, rồi bấm Bắt đầu nghe.');
  }
  const tab = await chrome.tabs.get(meetingTabId).catch(() => undefined);
  if (!tab) throw new UserFacingError('Tab cuộc họp đã bị đóng. Mở lại cuộc họp rồi bấm biểu tượng Tranz ở tab đó.');
  if (!tab.url?.startsWith(MEETING_ORIGIN)) {
    throw new UserFacingError('Tranz chỉ nghe được tab Google Meet. Mở cuộc họp rồi bấm biểu tượng Tranz ở tab đó.');
  }
  await ensureOffscreen();
  let streamId: string;
  try {
    streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: meetingTabId });
  } catch {
    throw new UserFacingError('Chrome chưa cho phép nghe tab này. Bấm lại biểu tượng Tranz ở tab cuộc họp rồi bấm Bắt đầu nghe.');
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
      case 'meeting':
        return meetingStatus();
      case 'status':
        return (await hasOffscreen()) ? toOffscreen({ type: 'status' }) : { active: false, paused: false, muted: false };
      default:
        if (!(await hasOffscreen())) throw new UserFacingError('Không có phiên nghe nào đang chạy.');
        return toOffscreen(message);
    }
  })()
    .then((result) => respond(result ?? { ok: true }))
    .catch((error) =>
      respond({
        error: error instanceof UserFacingError ? error.message : 'Chưa nghe được cuộc họp. Mở lại Tranz ở tab cuộc họp và kiểm tra quyền micro.',
      }),
    );
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.get('meetingTabId').then(({ meetingTabId }) => {
    if (tabId === meetingTabId) void stopCapture('tab-closed').catch(() => {});
  });
});
