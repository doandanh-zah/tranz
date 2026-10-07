import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUpRight, Copy, MessageCircle, Mic, MicOff, Pause, Play, RefreshCw, Square, X } from 'lucide-react';
import type { Api } from '../api';
import type { Capabilities, Run } from '../App';
import type { AssistKind, EndReason, ReplyStyle, Segment, Session, Suggestion } from '../../../../packages/shared/contracts';
import { Banner, ContextDetails, Spinner, StatusPill } from '../components';
import { AfterMeeting } from './AfterMeeting';

// Heuristic only: the user can always pick another line with "Trả lời câu này".
const QUESTION = /\?\s*$|^(what|why|how|when|where|who|which|can|could|would|will|should|do|does|did|is|are|have|has)\b/i;

/** Every automatic stop is explained; a user stop needs no message. */
const endedMessages: Partial<Record<EndReason, string>> = {
  'tab-closed': 'Đã dừng vì tab cuộc họp bị đóng.',
  'capture-ended': 'Đã dừng vì Chrome ngắt việc nghe tab hoặc micro (ví dụ micro bị rút ra hoặc quyền bị thu hồi).',
  'agent-left': 'Đã dừng vì bộ chuyển giọng nói Agora rời cuộc gọi.',
  'transcriber-error': 'Đã dừng vì bộ chuyển giọng nói Agora báo lỗi.',
  'connection-lost': 'Đã dừng vì mất kết nối và không khôi phục được.',
  'credentials-expired': 'Đã dừng vì không gia hạn được quyền truy cập của phiên.',
  'backend-unreachable': 'Đã dừng vì Tranz trên máy ngừng phản hồi.',
  'ended-by-backend': 'Đã dừng vì Tranz trên máy đang tắt hoặc phiên đã kết thúc.',
  'start-failed': 'Chưa bắt đầu được nên mọi thứ đã được tắt.',
  inactive: 'Đã dừng vì phần nghe trong trình duyệt không phản hồi quá 75 giây.',
  'time-limit': 'Đã dừng khi đạt giới hạn 1 giờ mỗi phiên.',
};

const time = (at: number) => new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export function Live({
  api,
  session,
  capabilities,
  busy,
  run,
  muted,
  onPause,
  onMute,
  onStop,
  onTranslate,
  onNotice,
  onNext,
  onDelete,
  onUpdate,
}: {
  api: Api;
  session: Session;
  capabilities?: Capabilities;
  busy: string;
  run: Run;
  muted: boolean;
  onPause: () => void;
  onMute: () => void;
  onStop: () => void;
  onTranslate: (segment: Segment) => void;
  onNotice: (message: string) => void;
  onNext: () => void;
  onDelete: () => void;
  onUpdate: (session: Session) => void;
}) {
  const [replyResult, setReplyResult] = useState<Suggestion>();
  const [catchupResult, setCatchupResult] = useState<Suggestion>();
  const [lastResult, setLastResult] = useState<Suggestion>();
  const [section, setSection] = useState<MeetingSection>('conversation');
  const replyPanel = useRef<HTMLDivElement>(null);
  const moveReplyFocus = useRef(false);
  const [selected, setSelected] = useState<Segment>();
  const [draft, setDraft] = useState('');
  const request = useRef(0);
  const [composeFailed, setComposeFailed] = useState(false);
  const [detail, setDetail] = useState<'compose' | 'context'>();

  const active = !['stopped', 'error'].includes(session.state);
  const result = active ? replyResult : lastResult;
  const starting = session.state === 'created' || session.state === 'connecting';
  const finals = session.segments.filter((s) => s.final);
  const detected = finals
    .slice(-5)
    .reverse()
    .find((s) => QUESTION.test(s.text.trim()));
  const target = selected ?? detected;
  const aiReady = !!capabilities?.ai;

  useLayoutEffect(() => {
    if (active && section === 'reply' && moveReplyFocus.current) {
      replyPanel.current?.focus();
      moveReplyFocus.current = false;
    }
  }, [active, section, selected?.id]);

  async function assist(kind: AssistKind, style: ReplyStyle = 'clear') {
    if (kind === 'compose') setComposeFailed(false);
    const sequence = ++request.current;
    const ok = await run(kind, async () => {
      const text = kind === 'compose' ? draft : kind === 'reply' ? (target?.text ?? '') : '';
      const next = await api.call<Suggestion>(`/sessions/${session.id}/assist`, 'POST', { kind, text, style });
      // Ignore a slower, older request that finishes after a newer one.
      if (sequence === request.current) {
        setLastResult(next);
        if (kind === 'catch-up') setCatchupResult(next);
        else setReplyResult(next);
      }
    });
    if (detail === 'compose' && kind === 'compose') setComposeFailed(!ok);
    if (ok && kind === 'compose' && sequence === request.current) {
      setDetail(undefined);
      setSection('reply');
    }
  }

  const composer = (
    <>
      <label>
        Điều bạn muốn nói, bằng tiếng Việt
        <textarea value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} lang="vi" placeholder="Điều bạn muốn nói…" />
      </label>
      <button className="secondary" disabled={!!busy || !draft.trim() || !aiReady} onClick={() => void assist('compose')}>
        {busy === 'compose' ? <Spinner /> : <ArrowUpRight size={16} aria-hidden="true" />}
        Chuyển sang tiếng Anh
      </button>
      {composeFailed && <Banner tone="error">Chưa chuyển được câu. Hãy thử lại hoặc đóng cửa sổ để xem thông báo lỗi.</Banner>}
      {!aiReady && <p className="caption">Đăng nhập ChatGPT trong Cài đặt để dùng gợi ý và dịch.</p>}
    </>
  );

  return (
    <div className={active ? 'live-workspace' : 'ended-workspace'}>
      <div className="session-overview">
        <div className="session-heading">
          <div>
            <span className="eyebrow">{active ? 'Trong cuộc họp' : 'Sau cuộc họp'}</span>
            <h1 className="session-title">
              {active ? <button className="session-context" title={session.context.name} onClick={() => setDetail('context')} aria-label={`Ngữ cảnh dùng cho phiên này: ${session.context.name}`}>{session.context.name}</button> : session.context.name}
            </h1>
            <p className="session-meta">Anh → Việt · bắt đầu {time(session.startedAt)}</p>
          </div>
          <div role="status" aria-live="polite">
            <StatusPill state={session.state} />
          </div>
        </div>

        <div className="session-alerts">
          {session.error && <Banner tone="error">{session.error}</Banner>}
          {!active && session.endedReason && endedMessages[session.endedReason] && <Banner>{endedMessages[session.endedReason]}</Banner>}
          {session.state === 'paused' && (
            <Banner>
              Đang tạm dừng: Tranz không gửi âm thanh đi. Bạn vẫn nghe cuộc họp bình thường. Kết nối vẫn mở nên có thể vẫn bị tính
              phí.
            </Banner>
          )}
          {session.state === 'reconnecting' && <Banner>Kết nối bị gián đoạn. Tranz tạm ngừng gửi âm thanh trong lúc kết nối lại.</Banner>}

          {muted && active && <p className="caption">Micro của bạn đang tắt với Tranz (Google Meet không bị ảnh hưởng). Tranz vẫn nghe những người khác.</p>}
        </div>

      </div>
      {!active && (
        <AfterMeeting api={api} session={session} busy={busy} run={run} aiReady={!!capabilities?.ai} onUpdate={onUpdate} onNext={onNext} onDelete={onDelete} />
      )}
      {active && <MeetingSectionTabs current={section} onChange={setSection} />}
      <div className="meeting-panel conversation-panel" hidden={active && section !== 'conversation'} role={active ? 'tabpanel' : undefined} id="meeting-conversation" aria-labelledby={active ? 'tab-conversation' : undefined} tabIndex={active ? 0 : undefined}>
      <Conversation visible={!active || section === 'conversation'} segments={session.segments} selectedId={selected?.id} active={active} starting={starting} aiReady={aiReady} onUse={(segment) => { moveReplyFocus.current = true; request.current++; setSelected(segment); setReplyResult(undefined); setLastResult(undefined); setSection('reply'); }} onTranslate={onTranslate} />
      </div>
      <div ref={replyPanel} className="meeting-panel reply-panel" hidden={active && section !== 'reply'} role={active ? 'tabpanel' : undefined} id="meeting-reply" aria-labelledby={active ? 'tab-reply' : undefined} tabIndex={active ? 0 : undefined}>
        <section className="panel response" aria-labelledby="respond-heading">
          <div className="response-toolbar">
            <h2 id="respond-heading" className="response-heading">
              <MessageCircle size={17} aria-hidden="true" /> Đến lượt bạn
            </h2>
          </div>
          <div className="response-body" tabIndex={active ? 0 : undefined} aria-label={active ? 'Nội dung trả lời' : undefined}>
            {(!active || !result) && (target ? (
              <details className="target" open={selected ? true : undefined}>
                <summary>{selected ? 'Câu bạn đã chọn' : 'Câu hỏi Tranz đoán được'}</summary>
                <p lang="en">{target.text}</p>
                {selected && (
                  <button className="icon small" aria-label="Bỏ chọn câu này" onClick={() => { request.current++; setSelected(undefined); setReplyResult(undefined); setLastResult(undefined); }}>
                    <X size={15} />
                  </button>
                )}
              </details>
            ) : (
              <p className="caption">Chọn một câu trong hội thoại để trả lời, hoặc soạn điều bạn muốn nói.</p>
            ))}
            {!aiReady && <p className="caption">Đăng nhập ChatGPT trong Cài đặt để dùng gợi ý và dịch.</p>}

            {result && <Result result={result} session={session} busy={busy} onRestyle={(style) => void assist('reply', style)} onCopied={onNotice} />}

          </div>
          <div className="button-row">
            <button className="primary" disabled={!!busy || !finals.length || !aiReady} onClick={() => void assist('reply')}>
              {busy === 'reply' ? <Spinner /> : <ArrowUpRight size={16} aria-hidden="true" />}
              Gợi ý câu trả lời
            </button>
            {!active && <button className="text-button" disabled={!!busy || !finals.length || !aiReady} onClick={() => void assist('catch-up')}>
              {busy === 'catch-up' ? 'Đang tóm tắt…' : 'Tóm tắt vừa rồi'}
            </button>}
            {active && <button className="secondary compose-open" onClick={() => setDetail('compose')}>Tôi muốn nói…</button>}
          </div>
          {!active && <details className="composer"><summary>Tôi muốn nói…</summary>{composer}</details>}
        </section>
      </div>
      {active && <div className="meeting-panel catchup-panel" hidden={section !== 'catchup'} role="tabpanel" id="meeting-catchup" aria-labelledby="tab-catchup" tabIndex={0}>
        <div className="catchup-body" tabIndex={0} aria-label="Nội dung tóm tắt">
          {catchupResult ? <Result result={catchupResult} session={session} busy={busy} onRestyle={(style) => void assist('reply', style)} onCopied={onNotice} /> : <div className="task-empty">
            <h2>Theo kịp cuộc trò chuyện</h2>
            <p className="caption">Tóm tắt phần trao đổi gần đây bằng tiếng Việt khi bạn cần.</p>
          </div>}
          {!aiReady && <p className="caption">Đăng nhập ChatGPT trong Cài đặt để dùng tóm tắt.</p>}
        </div>
        <button className="primary catchup-action" disabled={!!busy || !finals.length || !aiReady} onClick={() => void assist('catch-up')}>
          {busy === 'catch-up' ? <Spinner /> : <RefreshCw size={16} aria-hidden="true" />}
          {busy === 'catch-up' ? 'Đang tóm tắt…' : 'Tóm tắt vừa rồi'}
        </button>
      </div>}
      {active && (
        <div className="controls" role="group" aria-label="Điều khiển phiên">
          <button className="secondary" disabled={starting || !!busy} onClick={onPause}>
            {session.state === 'paused' ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
            {session.state === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
          </button>
          <button
            className="icon outlined"
            disabled={starting || !!busy}
            aria-pressed={muted}
            aria-label={muted ? 'Micro đang tắt với Tranz. Bật lại' : 'Tắt micro của tôi với Tranz'}
            title="Tranz ngừng nghe micro của bạn. Không ảnh hưởng tới Google Meet."
            onClick={onMute}
          >
            {muted ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
          <button className="stop" disabled={busy === 'stop'} onClick={onStop}>
            {busy === 'stop' ? <Spinner /> : <Square size={13} aria-hidden="true" />}
            Dừng
          </button>
        </div>
      )}
      {!active && <details className="panel">
        <summary>Ngữ cảnh dùng cho phiên này: {session.context.name}</summary>
        <ContextDetails profile={session.context} />
      </details>}
      {detail && <MeetingDetail title={detail === 'compose' ? 'Tôi muốn nói…' : 'Ngữ cảnh của phiên'} onClose={() => setDetail(undefined)}>
        {detail === 'compose' ? composer : <><h3>{session.context.name}</h3><ContextDetails profile={session.context} /></>}
        {detail === 'compose' && busy === 'compose' && <p className="caption" role="status">Đang chuyển câu sang tiếng Anh…</p>}
      </MeetingDetail>}
    </div>
  );
}

const meetingSections = [
  ['conversation', 'Hội thoại'],
  ['reply', 'Trả lời'],
  ['catchup', 'Tóm tắt'],
] as const;
type MeetingSection = (typeof meetingSections)[number][0];

function MeetingSectionTabs({ current, onChange }: { current: MeetingSection; onChange: (section: MeetingSection) => void }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className="meeting-section-tabs" role="tablist" aria-label="Mục trong cuộc họp">
    {meetingSections.map(([key, label], index) => <button key={key} ref={(node) => { buttons.current[index] = node; }} id={`tab-${key}`} role="tab" aria-selected={current === key} aria-controls={`meeting-${key}`} tabIndex={current === key ? 0 : -1} onClick={() => onChange(key)} onKeyDown={(event) => {
      const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : undefined;
      if (next === undefined) return;
      event.preventDefault();
      onChange(meetingSections[next][0]);
      buttons.current[next]?.focus();
    }}>{label}</button>)}
  </div>;
}

/** Secondary tasks stay in a native modal, leaving the meeting workspace at its viewport size. */
function MeetingDetail({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    const cancel = (event: Event) => { event.preventDefault(); close.current(); };
    element?.addEventListener('cancel', cancel);
    return () => {
      element?.removeEventListener('cancel', cancel);
      if (element?.open) element.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return <dialog ref={dialog} className="modal meeting-detail" aria-labelledby="meeting-detail-title">
    <div className="detail-heading">
      <h2 id="meeting-detail-title">{title}</h2>
      <button className="icon" aria-label="Đóng cửa sổ" onClick={onClose}><X size={18} /></button>
    </div>
    <div className="detail-body">{children}</div>
  </dialog>;
}

function Translation({
  segment,
  aiReady,
  active,
  onRetry,
}: {
  segment: Segment;
  aiReady: boolean;
  active: boolean;
  onRetry: (s: Segment) => void;
}) {
  if (segment.translation) {
    return (
      <p className="translation" lang="vi">
        {segment.translation}
      </p>
    );
  }
  if (segment.translationState === 'error') {
    return (
      <p className="translation muted">
        Chưa dịch được câu này.{' '}
        <button className="text-button" onClick={() => onRetry(segment)}>
          <RefreshCw size={13} aria-hidden="true" />
          Thử lại
        </button>
      </p>
    );
  }
  if (aiReady && !active && segment.translationState !== 'pending') {
    return (
      <p className="translation muted">
        Chưa dịch.{' '}
        <button className="text-button" onClick={() => onRetry(segment)}>
          Dịch
        </button>
      </p>
    );
  }
  return (
    <p className="translation muted">
      {!aiReady ? 'Đăng nhập ChatGPT (Cài đặt) để xem bản dịch.' : segment.translationState === 'pending' ? 'Đang dịch… (mất vài giây)' : 'Chờ dịch…'}
    </p>
  );
}

function Result({
  result,
  session,
  busy,
  onRestyle,
  onCopied,
}: {
  result: Suggestion;
  session: Session;
  busy: string;
  onRestyle: (style: ReplyStyle) => void;
  onCopied: (message: string) => void;
}) {
  const vietnamese = result.kind === 'catch-up';
  const lines = result.evidence.filter((id) => id !== 'profile');
  const usedProfile = result.evidence.includes('profile');
  const heading = { reply: 'Bạn có thể nói', 'catch-up': 'Vừa rồi mọi người nói gì', compose: 'Câu tiếng Anh cho bạn' }[result.kind];

  return (
    <div className="result" aria-live="polite">
      <h3>{heading}</h3>
      {result.question && <p className="caption">Cho câu: “{result.question}”</p>}
      <p className="suggestion" lang={vietnamese ? 'vi' : 'en'}>
        {result.text}
      </p>
      <p className={`evidence-label ${result.uncertain ? 'uncertain' : ''}`}>
        {result.uncertain ? 'Chưa chắc chắn, hãy kiểm tra trước khi dùng. ' : 'Gợi ý của AI, hãy kiểm tra trước khi dùng. '}
        {result.kind !== 'compose' &&
          (usedProfile || lines.length
            ? `Dựa trên ${[usedProfile && 'ngữ cảnh của bạn', lines.length && `${lines.length} câu trong cuộc họp`].filter(Boolean).join(' và ')}.`
            : 'Không dựa trên nguồn cụ thể nào.')}
      </p>
      {result.evidence.length > 0 && (
        <details>
          <summary>Xem nguồn</summary>
          <ul className="evidence">
            {usedProfile && <li>Ngữ cảnh của bạn: {session.context.facts || session.context.role || session.context.goal}</li>}
            {lines.map((id) => (
              <li key={id} lang="en">
                {session.segments.find((s) => s.id === id)?.text ?? 'Câu nguồn không còn'}
              </li>
            ))}
          </ul>
        </details>
      )}
      {result.kind === 'reply' && <details className="reply-actions">
        <summary>Chỉnh câu trả lời</summary>
        <div className="chip-row">
        {
          (
            [
              ['shorter', 'Ngắn hơn'],
              ['simple', 'Dễ nói hơn'],
              ['professional', 'Chuyên nghiệp hơn'],
              ['clarify', 'Hỏi lại cho rõ'],
            ] as const
          ).map(([style, label]) => (
            <button key={style} disabled={!!busy} onClick={() => onRestyle(style)}>
              {label}
            </button>
          ))}
        </div>
      </details>}
      <button className="text-button copy-reply"
          onClick={() =>
            void navigator.clipboard
              .writeText(result.text)
              .then(() => onCopied('Đã sao chép. Hãy đọc lại trước khi dùng.'))
              .catch(() => onCopied('Trình duyệt chặn sao chép. Hãy bôi đen để chép.'))
          }
        >
          <Copy size={13} aria-hidden="true" />
          Sao chép
      </button>
    </div>
  );
}

function Conversation({
  visible,
  segments,
  selectedId,
  active,
  starting,
  aiReady,
  onUse,
  onTranslate,
}: {
  visible: boolean;
  segments: Segment[];
  selectedId?: string;
  active: boolean;
  starting: boolean;
  aiReady: boolean;
  onUse: (segment: Segment) => void;
  onTranslate: (segment: Segment) => void;
}) {
  const [following, setFollowing] = useState(true);
  const list = useRef<HTMLOListElement>(null);
  const followingRef = useRef(true);
  const readingPosition = useRef(0);

  // Keep the reader's position; only auto-scroll while they are already at the newest line.
  useEffect(() => {
    if (visible && following && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [visible, following, segments]);

  useLayoutEffect(() => {
    if (visible && list.current) list.current.scrollTop = followingRef.current ? list.current.scrollHeight : readingPosition.current;
  }, [visible]);

  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (element.clientHeight && followingRef.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [segments.length > 0]);

  return (
    <section className="conversation" aria-labelledby="conversation-heading">
      <div className="section-label">
        <h2 id="conversation-heading">Hội thoại</h2>
        <span>EN <ArrowUpRight size={12} aria-hidden="true" /> VI</span>
        {active && !following && <button className="secondary jump" aria-label="Xuống câu mới nhất" title="Xuống câu mới nhất" onClick={() => {
          followingRef.current = true;
          setFollowing(true);
          if (list.current) list.current.scrollTop = list.current.scrollHeight;
        }}><ArrowDown size={15} aria-hidden="true" /></button>}
      </div>
      {segments.length ? (
        <>
          <ol
            ref={list}
            className="conversation-items"
            tabIndex={0}
            aria-label="Toàn bộ hội thoại"
            onScroll={(event) => {
              const el = event.currentTarget;
              if (!visible || !el.clientHeight) return;
              readingPosition.current = el.scrollTop;
              followingRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
              setFollowing(followingRef.current);
            }}
          >
            {segments.map((segment) => (
              <li key={segment.id} className={`chat-message ${segment.final ? 'final' : 'partial-message'} ${selectedId === segment.id ? 'selected' : ''}`} data-segment-id={segment.id}>
                <div className="message-meta">
                  <span>{segment.final ? 'Chưa xác định người nói' : 'Đang nghe…'}</span>
                  <time dateTime={new Date(segment.at).toISOString()}>{time(segment.at)}</time>
                </div>
                <p className="original" lang="en">{segment.text}</p>
                {segment.final && (
                  <>
                    <Translation segment={segment} aiReady={aiReady} active={active} onRetry={onTranslate} />
                    <button className="text-button message-reply" aria-pressed={selectedId === segment.id} onClick={() => onUse(segment)}>Trả lời câu này <ArrowUpRight size={12} aria-hidden="true" /></button>
                  </>
                )}
              </li>
            ))}
          </ol>
          {!active && !following && (
            <button
              className="secondary jump"
              onClick={() => {
                followingRef.current = true;
                setFollowing(true);
                if (list.current) list.current.scrollTop = list.current.scrollHeight;
              }}
            >
              <ArrowDown size={15} aria-hidden="true" />
              Xuống câu mới nhất
            </button>
          )}
        </>
      ) : (
        <div className="empty compact">
          <h3>{starting ? 'Đang kết nối, khoảng 10 giây…' : active ? 'Đang nghe, chưa có ai nói' : 'Không có lời thoại'}</h3>
          <p>Mỗi câu và bản dịch sẽ hiện cùng nhau ở đây.</p>
        </div>
      )}
    </section>
  );
}
