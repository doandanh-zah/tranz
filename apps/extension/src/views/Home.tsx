import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Circle, ExternalLink, Headphones, Mic, Video } from 'lucide-react';
import type { Api } from '../api';
import type { Capabilities } from '../App';
import type { Profile } from '../../../../packages/shared/contracts';
import { useChatGpt } from '../chatgpt';
import { Spinner } from '../components';
import { errorMessage, isExtension, microphonePermission, openSetupTab, requestMicrophone, sendCommand } from '../platform';

/**
 * The first screen: a short checklist (ChatGPT, microphone, Google Meet) and one big start button.
 * Context and keeping the session are optional extras underneath.
 */
export function Home({
  api,
  profiles,
  profileId,
  onSelect,
  capabilities,
  busy,
  onStart,
  onCapabilitiesChanged,
  onNewProfile,
}: {
  api: Api;
  profiles: Profile[];
  profileId: string;
  onSelect: (id: string) => void;
  capabilities?: Capabilities;
  busy: string;
  onStart: (retain: boolean) => void;
  onCapabilitiesChanged: () => void;
  onNewProfile: () => void;
}) {
  const [retain, setRetain] = useState(false);
  const chatgpt = useChatGpt(api, onCapabilitiesChanged);
  const microphone = useMicrophone();
  const meeting = useMeetingTab();

  const usesChatGpt = capabilities?.provider === 'chatgpt';
  const aiReady = !!capabilities?.ai;
  const allReady = aiReady && microphone.granted && meeting.ready;
  const canStart = isExtension && !!capabilities?.agora && allReady;

  return (
    <>
      <div className="section-heading">
        <h1>Sẵn sàng cho cuộc họp</h1>
        <p>Tranz nghe cuộc họp tiếng Anh, dịch sang tiếng Việt và gợi ý câu trả lời cho bạn.</p>
      </div>

      {capabilities && !capabilities.agora && (
        <div className="banner error" role="alert">
          Tranz trên máy này chưa được cài đặt đầy đủ (thiếu cấu hình Agora để chuyển giọng nói thành chữ). Hãy nhờ người cài
          đặt bổ sung AGORA_APP_ID và AGORA_APP_CERTIFICATE.
        </div>
      )}

      {allReady ? (
        <p className="ready-line">
          <CheckCircle2 size={18} aria-hidden="true" /> Mọi thứ đã sẵn sàng.
        </p>
      ) : (
        <section className="panel" aria-labelledby="checklist-heading">
          <h2 id="checklist-heading">Chuẩn bị (chỉ cần làm lần đầu)</h2>
          <ol className="checklist">
            <Step
              done={aiReady}
              title={usesChatGpt ? 'Đăng nhập ChatGPT' : 'Kết nối AI'}
              detail={
                usesChatGpt
                  ? 'Dùng gói ChatGPT của bạn để dịch và gợi ý câu trả lời. Bạn đăng nhập trên trang của OpenAI.'
                  : 'Chưa có API key AI trên máy. Tranz vẫn ghi lời thoại, nhưng chưa dịch và gợi ý được.'
              }
            >
              {usesChatGpt && !aiReady && (
                <>
                  <button className="primary" disabled={chatgpt.waiting} onClick={() => void chatgpt.signIn()}>
                    {chatgpt.waiting ? <Spinner /> : <ExternalLink size={16} aria-hidden="true" />}
                    {chatgpt.waiting ? 'Đang chờ bạn đăng nhập trên trang OpenAI…' : 'Đăng nhập ChatGPT'}
                  </button>
                  {(chatgpt.problem || chatgpt.account?.lastLoginError) && (
                    <p className="caption error-text" role="status">
                      {chatgpt.problem || `Chưa đăng nhập xong: ${chatgpt.account?.lastLoginError}`}
                    </p>
                  )}
                </>
              )}
              {aiReady && chatgpt.account?.email && <p className="caption">Đã đăng nhập: {chatgpt.account.email}</p>}
            </Step>
            <Step done={microphone.granted} title="Cho phép dùng micro" detail="Để Tranz nghe được phần bạn nói. Tranz không lưu âm thanh.">
              {!microphone.granted && (
                <>
                  <div className="button-row start">
                    <button className="primary" onClick={() => void microphone.request()}>
                      <Mic size={16} aria-hidden="true" />
                      Cho phép micro
                    </button>
                    {isExtension && (
                      <button className="text-button" onClick={openSetupTab}>
                        Không thấy hộp hỏi quyền? Mở trong tab
                      </button>
                    )}
                  </div>
                  {microphone.problem && (
                    <p className="caption error-text" role="status">
                      {microphone.state === 'denied'
                        ? 'Micro đang bị chặn cho Tranz. Bấm biểu tượng ổ khoá trên thanh địa chỉ (hoặc chrome://settings/content/microphone) để cho phép, rồi thử lại.'
                        : microphone.problem}
                    </p>
                  )}
                </>
              )}
            </Step>
            <Step
              done={meeting.ready}
              title="Mở cuộc họp Google Meet"
              detail="Vào cuộc họp trên Google Meet, rồi bấm biểu tượng Tranz trên thanh công cụ Chrome ngay ở tab đó."
            >
              {!meeting.ready && (
                <p className="caption">
                  <Video size={14} aria-hidden="true" /> Tranz sẽ tự nhận ra khi bạn mở từ tab Google Meet.
                </p>
              )}
            </Step>
          </ol>
        </section>
      )}

      <button className="primary full start" disabled={!!busy || !canStart} onClick={() => onStart(retain)}>
        {busy === 'start' ? <Spinner /> : <Headphones size={20} aria-hidden="true" />}
        {busy === 'start' ? 'Đang kết nối… (khoảng 10 giây)' : 'Bắt đầu nghe'}
      </button>
      {!isExtension && <p className="caption">Đây là bản xem thử giao diện. Muốn nghe cuộc họp, hãy mở Tranz từ extension trong Chrome.</p>}
      <p className="caption consent">
        Khi bấm <strong>Bắt đầu nghe</strong>, âm thanh của tab cuộc họp và micro của bạn được gửi đi để chuyển thành chữ (qua
        Agora), và lời thoại được gửi tới ChatGPT để dịch và gợi ý. Hãy báo cho mọi người trong cuộc họp. Tranz không lưu âm thanh.
      </p>

      <details className="panel options">
        <summary>Tuỳ chọn cho cuộc họp này</summary>
        <label>
          Ngữ cảnh (giúp gợi ý đúng về công việc của bạn)
          <select value={profileId} onChange={(event) => onSelect(event.target.value)}>
            <option value="">Không dùng — Cuộc họp nhanh</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <button className="text-button" onClick={onNewProfile}>
          + Tạo ngữ cảnh mới
        </button>
        <label className="check-row">
          <input type="checkbox" checked={retain} onChange={(event) => setRetain(event.target.checked)} />
          <span>
            Lưu lại sau cuộc họp
            <small>Tắt: lời thoại chỉ giữ tạm và tự xoá sau 1 giờ. Bật: lưu bản ghi và ghi chú (đã mã hoá) trên máy này đến khi bạn xoá.</small>
          </span>
        </label>
      </details>
    </>
  );
}

function Step({ done, title, detail, children }: { done: boolean; title: string; detail: string; children?: ReactNode }) {
  return (
    <li className={done ? 'done' : undefined}>
      {done ? <CheckCircle2 size={20} aria-hidden="true" /> : <Circle size={20} aria-hidden="true" />}
      <div>
        <strong>
          {title}
          <span className="sr-only">{done ? ' (đã xong)' : ' (chưa xong)'}</span>
        </strong>
        {!done && <p>{detail}</p>}
        {children}
      </div>
    </li>
  );
}

function useMicrophone() {
  const [state, setState] = useState<PermissionState | 'unknown'>('unknown');
  const [problem, setProblem] = useState('');
  useEffect(() => {
    void microphonePermission().then(setState);
  }, []);
  const request = async () => {
    setProblem('');
    try {
      await requestMicrophone();
    } catch (caught) {
      setProblem(errorMessage(caught));
    }
    setState(await microphonePermission());
  };
  return { state, granted: state === 'granted', problem, request };
}

/** Whether the panel was opened from a Google Meet tab; rechecked every 3 s while not ready. */
function useMeetingTab() {
  const [ready, setReady] = useState(false);
  const check = useCallback(async () => {
    if (!isExtension) return;
    const status = await sendCommand<{ ready: boolean }>('meeting').catch(() => ({ ready: false }));
    setReady(status.ready);
  }, []);
  useEffect(() => {
    void check();
    if (ready) return;
    const timer = setInterval(() => void check(), 3000);
    return () => clearInterval(timer);
  }, [check, ready]);
  return { ready };
}
