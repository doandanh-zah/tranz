import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Copy, Mic, MicOff, Pause, Play, RefreshCw, Square, X } from 'lucide-react';
import type { Api } from '../api';
import type { Capabilities, Run } from '../App';
import type { AssistKind, ReplyStyle, Segment, Session, Suggestion } from '../../../../packages/shared/contracts';
import { Banner, ContextDetails, Spinner, StatusPill } from '../components';
import { AfterMeeting } from './AfterMeeting';

// Heuristic only: the user can always pick another line with "Use for reply".
const QUESTION = /\?\s*$|^(what|why|how|when|where|who|which|can|could|would|will|should|do|does|did|is|are|have|has)\b/i;

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
  const latestFinal = finals.at(-1);
  const partial = session.segments.at(-1)?.final === false ? session.segments.at(-1) : undefined;
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
          <span className="eyebrow">{active ? 'In the meeting' : 'After the meeting'}</span>
          <p className="session-meta">
            {session.context.name} · started {time(session.startedAt)}
          </p>
        </div>
        <div role="status" aria-live="polite">
          <StatusPill state={session.state} />
        </div>
      </div>

      {session.error && <Banner tone="error">{session.error}</Banner>}
      {session.state === 'paused' && (
        <Banner>
          Paused: no tab or microphone audio is sent. The meeting keeps playing. The provider session stays connected and may
          still be billed.
        </Banner>
      )}
      {session.state === 'reconnecting' && <Banner>Connection interrupted. Audio sending is paused while Tranz reconnects.</Banner>}

      {active && (
        <div className="controls" role="group" aria-label="Session controls">
          <button className="secondary" disabled={starting || !!busy} onClick={onPause}>
            {session.state === 'paused' ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
            {session.state === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button
            className="icon outlined"
            disabled={starting || !!busy}
            aria-pressed={muted}
            aria-label={muted ? 'Microphone muted for Tranz. Unmute' : 'Mute my microphone for Tranz'}
            title="Stops your microphone reaching Tranz. The meeting app is not affected."
            onClick={onMute}
          >
            {muted ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
          <button className="stop" disabled={busy === 'stop'} onClick={onStop}>
            {busy === 'stop' ? <Spinner /> : <Square size={13} aria-hidden="true" />}
            Stop
          </button>
        </div>
      )}
      {!active && (
        <AfterMeeting api={api} session={session} busy={busy} run={run} aiReady={!!capabilities?.ai} onUpdate={onUpdate} onNext={onNext} onDelete={onDelete} />
      )}
      {muted && active && <p className="caption">Your microphone is muted for Tranz only. Meeting audio is still transcribed.</p>}

      <section className="now" aria-labelledby="now-heading">
        <h2 id="now-heading" className="section-label">
          Now · English → Tiếng Việt
        </h2>
        {latestFinal ? (
          <>
            <p className="original" lang="en">
              {latestFinal.text}
            </p>
            <Translation segment={latestFinal} aiReady={aiReady} onRetry={onTranslate} />
          </>
        ) : (
          !partial && (
            <div className="empty compact">
              <h3>{starting ? 'Waiting for the transcriber to join…' : active ? 'No speech received yet' : 'No transcript'}</h3>
              <p>Only real speech appears here. Nothing is shown until the transcriber sends text.</p>
            </div>
          )
        )}
        {partial && (
          <p className="partial" lang="en">
            <span className="tag">{active ? 'Hearing…' : 'Unfinished line, never finalised:'}</span> {partial.text}
          </p>
        )}
      </section>

      <section className="panel response" aria-labelledby="respond-heading">
        <h2 id="respond-heading" className="section-label">
          Find your words
        </h2>
        {target ? (
          <div className="target">
            <span className="tag">{selected ? 'Selected by you' : 'Detected question (automatic guess)'}</span>
            <p lang="en">{target.text}</p>
            {selected && (
              <button className="icon small" aria-label="Clear selected line" onClick={() => setSelected(undefined)}>
                <X size={15} />
              </button>
            )}
          </div>
        ) : (
          <p className="muted">No question detected. Suggestions use the latest conversation, or pick a line below.</p>
        )}
        <div className="button-row">
          <button className="secondary" disabled={!!busy || !finals.length || !aiReady} onClick={() => void assist('reply')}>
            {busy === 'reply' ? <Spinner /> : null}
            Suggest a reply
          </button>
          <button className="text-button" disabled={!!busy || !finals.length || !aiReady} onClick={() => void assist('catch-up')}>
            {busy === 'catch-up' ? 'Summarising…' : 'Catch me up (Tiếng Việt)'}
          </button>
        </div>
        {!aiReady && <p className="caption">Add an AI API key to the backend to enable suggestions.</p>}

        {result && <Result result={result} session={session} busy={busy} onRestyle={(style) => void assist('reply', style)} onCopied={onNotice} />}

        <details className="composer">
          <summary>Think in Vietnamese, reply in English</summary>
          <label>
            Your draft in Vietnamese
            <textarea value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} lang="vi" placeholder="Điều bạn muốn nói…" />
          </label>
          <button className="secondary" disabled={!!busy || !draft.trim() || !aiReady} onClick={() => void assist('compose')}>
            {busy === 'compose' ? <Spinner /> : null}
            Find the English wording
          </button>
        </details>
      </section>

      <History segments={session.segments} aiReady={aiReady} onUse={setSelected} onTranslate={onTranslate} />

      <details className="panel">
        <summary>Context snapshot used by this session · v{session.context.version}</summary>
        <ContextDetails profile={session.context} />
      </details>

    </>
  );
}

function Translation({ segment, aiReady, onRetry }: { segment: Segment; aiReady: boolean; onRetry: (s: Segment) => void }) {
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
        Translation failed for this line.{' '}
        <button className="text-button" onClick={() => onRetry(segment)}>
          <RefreshCw size={13} aria-hidden="true" />
          Retry
        </button>
      </p>
    );
  }
  return (
    <p className="translation muted">
      {!aiReady ? 'Translation needs an AI API key on the backend.' : segment.translationState === 'pending' ? 'Translating…' : 'Waiting to translate…'}
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
  const heading = { reply: 'Suggested reply', 'catch-up': 'What just happened', compose: 'English wording' }[result.kind];

  return (
    <div className="result" aria-live="polite">
      <h3>{heading}</h3>
      {result.question && <p className="caption">For: “{result.question}”</p>}
      <p className="suggestion" lang={vietnamese ? 'vi' : 'en'}>
        {result.text}
      </p>
      <p className={`evidence-label ${result.uncertain ? 'uncertain' : ''}`}>
        {result.uncertain ? 'Uncertain — check before using. ' : 'AI suggestion — verify before using. '}
        {result.kind !== 'compose' &&
          (usedProfile || lines.length
            ? `Based on ${[usedProfile && 'your context', lines.length && `${lines.length} transcript line${lines.length > 1 ? 's' : ''}`].filter(Boolean).join(' and ')}.`
            : 'No supporting source was cited.')}
      </p>
      {result.evidence.length > 0 && (
        <details>
          <summary>Show the cited sources</summary>
          <ul className="evidence">
            {usedProfile && <li>Your context: {session.context.facts || session.context.role || session.context.goal}</li>}
            {lines.map((id) => (
              <li key={id} lang="en">
                {session.segments.find((s) => s.id === id)?.text ?? 'Source line no longer available'}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="chip-row">
        {result.kind === 'reply' &&
          (
            [
              ['shorter', 'Shorter'],
              ['simple', 'Simpler English'],
              ['professional', 'More professional'],
              ['clarify', 'Ask for clarification'],
            ] as const
          ).map(([style, label]) => (
            <button key={style} disabled={!!busy} onClick={() => onRestyle(style)}>
              {label}
            </button>
          ))}
        <button
          onClick={() =>
            void navigator.clipboard
              .writeText(result.text)
              .then(() => onCopied('Copied. Review the wording before you use it.'))
              .catch(() => onCopied('Copy was blocked by the browser. Select the text instead.'))
          }
        >
          <Copy size={13} aria-hidden="true" />
          Copy
        </button>
      </div>
    </div>
  );
}

function History({
  segments,
  aiReady,
  onUse,
  onTranslate,
}: {
  segments: Segment[];
  aiReady: boolean;
  onUse: (segment: Segment) => void;
  onTranslate: (segment: Segment) => void;
}) {
  const [open, setOpen] = useState(false);
  const [following, setFollowing] = useState(true);
  const list = useRef<HTMLOListElement>(null);

  // Keep the reader's position; only auto-scroll while they are already at the newest line.
  useEffect(() => {
    if (open && following && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [open, following, segments.length]);

  return (
    <section className="history" aria-labelledby="history-heading">
      <h2 id="history-heading">
        <button className="history-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          Conversation
          <span>{segments.length} lines</span>
        </button>
      </h2>
      {open && (
        <>
          <ol
            ref={list}
            className="history-items"
            tabIndex={0}
            aria-label="Conversation transcript"
            onScroll={(event) => {
              const el = event.currentTarget;
              setFollowing(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
            }}
          >
            {segments.map((segment) => (
              <li key={segment.id}>
                <small>
                  {segment.final ? 'Final' : 'Partial'} · {time(segment.at)} · speaker not identified
                </small>
                <p lang="en">{segment.text}</p>
                {segment.translation && (
                  <p lang="vi" className="muted">
                    {segment.translation}
                  </p>
                )}
                {segment.final && (
                  <div className="button-row start">
                    <button className="text-button" onClick={() => onUse(segment)}>
                      Use for reply
                    </button>
                    {!segment.translation && segment.translationState !== 'pending' && (
                      <button className="text-button" disabled={!aiReady} onClick={() => onTranslate(segment)}>
                        {segment.translationState === 'error' ? 'Retry translation' : 'Translate'}
                      </button>
                    )}
                  </div>
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
              Jump to latest
            </button>
          )}
        </>
      )}
    </section>
  );
}
