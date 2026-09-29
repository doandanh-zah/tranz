import { Runtime } from './runtime';
import type { EndReason } from '../../../packages/shared/contracts';

const runtime = new Runtime();

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.target !== 'offscreen') return;
  void (async () => {
    switch (message.type) {
      case 'start':
        await runtime.start(message.id, message.token, message.streamId);
        return { ok: true };
      case 'pause':
        await runtime.pause(!!message.value);
        return { ok: true };
      case 'mute':
        runtime.mute(!!message.value);
        return { ok: true };
      case 'stop':
        await runtime.stop((message.reason as EndReason) ?? 'user');
        return { ok: true };
      case 'status':
        return runtime.status();
      default:
        throw new Error('Tranz nhận được lệnh âm thanh không hợp lệ.');
    }
  })()
    .then(respond)
    // Runtime errors are written for the user (see describeStartFailure); nothing sensitive is included.
    .catch((error) => respond({ error: error instanceof Error && error.message ? error.message : 'Phiên nghe gặp lỗi.' }));
  return true;
});
