import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, CheckCircle2, Circle, Headphones, ShieldCheck } from 'lucide-react';
import type { Api } from '../api';
import type { Capabilities } from '../App';
import type { DeviceTranslationStatus } from '../browser-translator';
import type { Profile } from '../../../../packages/shared/contracts';
import { useChatGpt } from '../chatgpt';
import { LanguageBridge, Spinner, ViewHeading } from '../components';
import { errorMessage, isExtension, microphonePermission, openSetupTab, requestMicrophone, sendCommand } from '../platform';

/**
 * The first screen and the main task: three short setup rows (one small action each, only while
 * not done), then one big start button. Context and keeping the session are optional extras.
 */
export function Home({
  api,
  profiles,
  profileId,
  onSelect,
  capabilities,
  deviceTranslation,
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
  deviceTranslation: DeviceTranslationStatus;
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
  const chatgptProblem = chatgpt.problem || (chatgpt.account?.lastLoginError && `Chưa đăng nhập xong: ${chatgpt.account.lastLoginError}`);

  return (
    <>
      <section className="meeting-intro" aria-label="Trợ lý cuộc họp tiếng Anh">
        <ViewHeading kicker="Một chút hỗ trợ. Nhiều hơn tự tin." title="Sẵn sàng cho cuộc họp">
          Hiểu từng câu tiếng Anh.<br />Nói điều bạn muốn, theo cách của bạn.
        </ViewHeading>
        <LanguageBridge />
      </section>

      {capabilities && !capabilities.agora && (
        <details className="setup-warning">
          <summary>Tranz cần được hoàn tất cài đặt</summary>
          <p>
            Máy này đang thiếu cấu hình Agora để chuyển giọng nói thành chữ. Hãy nhờ người cài đặt bổ sung{' '}
            <code>AGORA_APP_ID</code> và <code>AGORA_APP_CERTIFICATE</code>.
          </p>
        </details>
      )}

      <section className="preparation" aria-labelledby="preparation-heading">
        <div className="section-label">
          <h2 id="preparation-heading">{allReady ? 'Bạn đã sẵn sàng' : 'Chuẩn bị trước khi nghe'}</h2>
          <span className="step-count" aria-label={`${[aiReady, microphone.granted, meeting.ready].filter(Boolean).length} trên 3 bước đã xong`}>
            {[aiReady, microphone.granted, meeting.ready].filter(Boolean).length}/3
          </span>
        </div>
      {allReady ? (
        <p className="ready-line">
          <CheckCircle2 size={18} aria-hidden="true" /> Mọi thứ đã sẵn sàng.
        </p>
      ) : (
        <ol className="checklist" aria-label="Các bước chuẩn bị">
          <Step
            done={aiReady}
            title={usesChatGpt ? 'Đăng nhập ChatGPT' : 'Kết nối AI'}
            detail={usesChatGpt ? 'Để gợi ý, tóm tắt và dự phòng khi không thể dịch trên máy.' : 'Chưa có API key AI trên máy này.'}
            note={aiReady && chatgpt.account?.email ? `Đã đăng nhập: ${chatgpt.account.email}` : undefined}
            action={
              usesChatGpt && (
                <button className="primary small" aria-label="Đăng nhập ChatGPT" disabled={chatgpt.waiting} onClick={() => void chatgpt.signIn()}>
                  {chatgpt.waiting ? <Spinner /> : 'Đăng nhập'}
                </button>
              )
            }
          >
            {chatgpt.waiting && <p className="caption">Đang chờ bạn đăng nhập trên trang OpenAI…</p>}
            {chatgptProblem && (
              <p className="caption error-text" role="status">
                {chatgptProblem}
              </p>
            )}
          </Step>
          <Step
            done={microphone.granted}
            title="Cho phép micro"
            detail="Để nghe phần bạn nói. Không lưu âm thanh."
            action={
              <button className="primary small" onClick={() => void microphone.request()}>
                Cho phép
              </button>
            }
          >
            {microphone.problem && (
              <>
                <p className="caption error-text" role="status">
                  {microphone.state === 'denied'
                    ? 'Micro đang bị chặn cho Tranz. Bấm biểu tượng ổ khoá trên thanh địa chỉ (hoặc chrome://settings/content/microphone) để cho phép, rồi thử lại.'
                    : microphone.problem}
                </p>
                {isExtension && (
                  <button className="text-button" onClick={openSetupTab}>
                    Không thấy hộp hỏi quyền? Mở trong tab
                  </button>
                )}
              </>
            )}
          </Step>
          <Step done={meeting.ready} title="Mở từ tab Google Meet" detail="Vào cuộc họp, rồi bấm biểu tượng Tranz trên thanh công cụ Chrome." />
        </ol>
      )}
      </section>

      <TranslationReadiness status={deviceTranslation} />

      <section className="start-zone" aria-label="Bắt đầu cuộc họp">
        <button className="primary full start" aria-describedby={!canStart ? 'start-requirements' : undefined} disabled={!!busy || !canStart} onClick={() => onStart(retain)}>
          {busy === 'start' ? <Spinner /> : <Headphones size={20} aria-hidden="true" />}
          {busy === 'start' ? 'Đang kết nối…' : 'Bắt đầu nghe'}
          {busy !== 'start' && <ArrowUpRight size={18} aria-hidden="true" className="start-arrow" />}
        </button>
        {!canStart && isExtension && <p id="start-requirements" className="caption start-requirements">{!capabilities?.agora ? 'Hoàn tất cài đặt Tranz và các bước trên để bắt đầu.' : 'Hoàn tất các bước chuẩn bị ở trên để bắt đầu.'}</p>}
        {busy === 'start' && <p className="caption" role="status">Tranz đang kết nối, thường mất khoảng 10 giây.</p>}
        <p className="start-assurance"><ShieldCheck size={14} aria-hidden="true" /> Chỉ bắt đầu khi bạn bấm nút. Không lưu âm thanh.</p>
        {!isExtension && <p className="caption">Bản xem thử giao diện · Mở extension trong Chrome để nghe cuộc họp.</p>}
        {/* Pressing the button is the consent (PR-004), so this stays visible rather than collapsed. */}
        <p className="caption consent">
          Âm thanh tab và micro được gửi tới Agora để chuyển thành chữ. Bản dịch EN→VI chạy trên thiết bị khi hỗ trợ; lời thoại và
          ngữ cảnh được gửi tới ChatGPT để gợi ý, tóm tắt, ghi chú và để dịch nếu chế độ trên thiết bị không dùng được. Tranz không
          lưu âm thanh. Hãy báo cho mọi người trong cuộc họp.
        </p>
      </section>

      <details className="options">
        <summary>Tuỳ chọn cho cuộc họp này</summary>
        <label>
          Ngữ cảnh (giúp gợi ý đúng về công việc của bạn)
          <select value={profileId} onChange={(event) => onSelect(event.target.value)}>
            <option value="">Không dùng: Cuộc họp nhanh</option>
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

function TranslationReadiness({ status }: { status: DeviceTranslationStatus }) {
  if (status.state === 'ready') {
    return (
      <p className="translation-readiness ready-line">
        <CheckCircle2 size={18} aria-hidden="true" /> Dịch nhanh EN→VI đã sẵn sàng trên thiết bị.
      </p>
    );
  }
  if (status.state === 'downloading') {
    const percent = Math.round((status.progress ?? 0) * 100);
    return (
      <div className="translation-readiness" role="status">
        <span>Đang tải gói dịch EN→VI trên thiết bị{percent ? ` · ${percent}%` : '…'}</span>
        <progress value={status.progress ?? 0} max={1} aria-label="Tiến độ tải gói dịch" />
      </div>
    );
  }
  if (status.state === 'unsupported' || status.state === 'error') {
    return (
      <p className="translation-readiness fallback" role="status">
        Trình duyệt chưa dùng được dịch trên thiết bị. Tranz sẽ dịch bằng ChatGPT; bản dịch có thể chậm hơn.
      </p>
    );
  }
  return <p className="translation-readiness" role="status">Đang kiểm tra dịch nhanh EN→VI trên thiết bị…</p>;
}

/** One setup row: status icon, title, a one-line hint and at most one small action while not done. */
function Step({
  done,
  title,
  detail,
  note,
  action,
  children,
}: {
  done: boolean;
  title: string;
  detail: string;
  note?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li className={done ? 'done' : undefined}>
      {done ? <CheckCircle2 size={20} aria-hidden="true" /> : <Circle size={20} aria-hidden="true" />}
      <div>
        <strong>
          {title}
          <span className="sr-only">{done ? ' (đã xong)' : ' (chưa xong)'}</span>
        </strong>
        {!done && <p>{detail}</p>}
        {note && <p className="caption">{note}</p>}
        {!done && children}
      </div>
      {!done && action}
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
