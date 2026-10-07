import { useEffect, useRef, useState } from 'react';
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
  const [result, setResult] = useState<Suggestion>();
  const [selected, setSelected] = useState<Segment>();
  const [draft, setDraft] = useState('');
  const request = useRef(0);

  const active = !['stopped', 'error'].includes(session.state);
  const starting = session.state === 'created' || session.state === 'connecting';
  const finals = session.segments.filter((s) => s.final);
  const detected = finals
    .slice(-5)
    .reverse()
    .find((s) => QUESTION.test(s.text.trim()));
  const target = selected ?? detected;
  const aiReady = !!capabilities?.ai;

  async function assist(kind: AssistKind, style: ReplyStyle = 'clear') {
    const sequence = ++request.current;
    await run(kind, async () => {
      const text = kind === 'compose' ? draft : kind === 'reply' ? (target?.text ?? '') : '';
      const next = await api.call<Suggestion>(`/sessions/${session.id}/assist`, 'POST', { kind, text, style });
      // Ignore a slower, older request that finishes after a newer one.
      if (sequence === request.current) setResult(next);
    });
  }

  return (
    <>
      <div className="session-heading">
        <div>
          <span className="eyebrow">{active ? 'Trong cuộc họp' : 'Sau cuộc họp'}</span>
          <h1 className="session-title">{session.context.name}</h1>
          <p className="session-meta">Anh → Việt · bắt đầu {time(session.startedAt)}</p>
        </div>
        <div role="status" aria-live="polite">
          <StatusPill state={session.state} />
        </div>
      </div>

      {session.error && <Banner tone="error">{session.error}</Banner>}
      {!active && session.endedReason && endedMessages[session.endedReason] && <Banner>{endedMessages[session.endedReason]}</Banner>}
      {session.state === 'paused' && (
        <Banner>
          Đang tạm dừng: Tranz không gửi âm thanh đi. Bạn vẫn nghe cuộc họp bình thường. Kết nối vẫn mở nên có thể vẫn bị tính
          phí.
        </Banner>
      )}
      {session.state === 'reconnecting' && <Banner>Kết nối bị gián đoạn. Tranz tạm ngừng gửi âm thanh trong lúc kết nối lại.</Banner>}

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
      {!active && (
        <AfterMeeting api={api} session={session} busy={busy} run={run} aiReady={!!capabilities?.ai} onUpdate={onUpdate} onNext={onNext} onDelete={onDelete} />
      )}
      {muted && active && <p className="caption">Micro của bạn đang tắt với Tranz (Google Meet không bị ảnh hưởng). Tranz vẫn nghe những người khác.</p>}

      <Conversation segments={session.segments} selectedId={selected?.id} active={active} starting={starting} aiReady={aiReady} onUse={(segment) => { request.current++; setSelected(segment); setResult(undefined); }} onTranslate={onTranslate} />

      <section className="panel response" aria-labelledby="respond-heading">
        <h2 id="respond-heading" className="response-heading">
          <MessageCircle size={17} aria-hidden="true" /> Đến lượt bạn
        </h2>
        {target ? (
          <details className="target" open={selected ? true : undefined}>
            <summary>{selected ? 'Câu bạn đã chọn' : 'Câu hỏi Tranz đoán được'}</summary>
            <p lang="en">{target.text}</p>
            {selected && (
              <button className="icon small" aria-label="Bỏ chọn câu này" onClick={() => { request.current++; setSelected(undefined); setResult(undefined); }}>
                <X size={15} />
              </button>
            )}
          </details>
        ) : (
          <p className="caption">Chọn một câu trong hội thoại để trả lời, hoặc soạn điều bạn muốn nói.</p>
        )}
        <div className="button-row">
          <button className="primary" disabled={!!busy || !finals.length || !aiReady} onClick={() => void assist('reply')}>
            {busy === 'reply' ? <Spinner /> : <ArrowUpRight size={16} aria-hidden="true" />}
            Gợi ý câu trả lời
          </button>
          <button className="text-button" disabled={!!busy || !finals.length || !aiReady} onClick={() => void assist('catch-up')}>
            {busy === 'catch-up' ? 'Đang tóm tắt…' : 'Tóm tắt vừa rồi'}
          </button>
        </div>
        {!aiReady && <p className="caption">Đăng nhập ChatGPT trong Cài đặt để dùng gợi ý và dịch.</p>}

        {result && <Result result={result} session={session} busy={busy} onRestyle={(style) => void assist('reply', style)} onCopied={onNotice} />}

        <details className="composer">
          <summary>Tôi muốn nói…</summary>
          <label>
            Điều bạn muốn nói, bằng tiếng Việt
            <textarea value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} lang="vi" placeholder="Điều bạn muốn nói…" />
          </label>
          <button className="secondary" disabled={!!busy || !draft.trim() || !aiReady} onClick={() => void assist('compose')}>
            {busy === 'compose' ? <Spinner /> : <ArrowUpRight size={16} aria-hidden="true" />}
            Chuyển sang tiếng Anh
          </button>
        </details>
      </section>

      <details className="panel">
        <summary>Ngữ cảnh dùng cho phiên này: {session.context.name}</summary>
        <ContextDetails profile={session.context} />
      </details>

    </>
  );
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
  segments,
  selectedId,
  active,
  starting,
  aiReady,
  onUse,
  onTranslate,
}: {
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

  // Keep the reader's position; only auto-scroll while they are already at the newest line.
  useEffect(() => {
    if (following && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [following, segments]);

  return (
    <section className="conversation" aria-labelledby="conversation-heading">
      <div className="section-label">
        <h2 id="conversation-heading">Hội thoại</h2>
        <span>EN <ArrowUpRight size={12} aria-hidden="true" /> VI</span>
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
              setFollowing(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
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
          {!following && (
            <button
              className="secondary jump"
              onClick={() => {
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
