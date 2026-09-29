import { ArrowRight, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import type { Api } from '../api';
import type { Run } from '../App';
import type { Artifact, Session } from '../../../../packages/shared/contracts';
import { Spinner } from '../components';

export function AfterMeeting({
  api,
  session,
  busy,
  run,
  aiReady,
  onUpdate,
  onNext,
  onDelete,
}: {
  api: Api;
  session: Session;
  busy: string;
  run: Run;
  aiReady: boolean;
  onUpdate: (session: Session) => void;
  onNext: () => void;
  onDelete: () => void;
}) {
  const hasTranscript = session.segments.some((s) => s.final);
  const generate = () => run('notes', async () => onUpdate(await api.call<Session>(`/sessions/${session.id}/finalize`, 'POST')));
  const keep = () => run('save', async () => onUpdate(await api.call<Session>(`/sessions/${session.id}/save`, 'POST')));

  return (
    <>
      <section className="panel notes" aria-labelledby="notes-heading" aria-busy={session.processing === 'processing'}>
        <h2 id="notes-heading">Meeting notes</h2>
        {session.artifact ? (
          <Notes artifact={session.artifact} />
        ) : session.processing === 'processing' ? (
          <p className="muted" role="status">
            <Spinner /> Writing notes from the final transcript… The session is already stopped.
          </p>
        ) : !hasTranscript ? (
          <p className="muted">No final transcript was received, so there is nothing to summarise.</p>
        ) : !aiReady ? (
          <p className="muted">Notes need an AI provider: sign in with ChatGPT in Settings. The transcript below is still available.</p>
        ) : (
          <>
            <p className={session.processing === 'error' ? 'banner error' : 'muted'} role={session.processing === 'error' ? 'alert' : undefined}>
              {session.processing === 'error'
                ? (session.processingError ?? 'Notes could not be created.')
                : 'Create a summary, decisions, next steps and useful phrases from the final transcript.'}
            </p>
            <button className="secondary" disabled={!!busy} onClick={() => void generate()}>
              {busy === 'notes' ? <Spinner /> : <RefreshCw size={15} aria-hidden="true" />}
              {session.processing === 'error' ? 'Retry notes' : 'Create notes'}
            </button>
          </>
        )}
      </section>

      <section className="panel" aria-labelledby="keep-heading">
        <h2 id="keep-heading">
          <ShieldCheck size={17} aria-hidden="true" /> {session.retain ? 'Kept on this computer' : 'Temporary session'}
        </h2>
        {session.retain ? (
          <p className="muted">Transcript, translations, context snapshot and notes are encrypted on this computer until you delete them.</p>
        ) : (
          <>
            <p className="muted">
              Held only in backend memory. It is discarded one hour after the session ends or when the backend restarts. Keeping it
              saves the transcript, translations, context snapshot and notes, encrypted, until you delete them.
            </p>
            <button className="secondary" disabled={!!busy} onClick={() => void keep()}>
              {busy === 'save' ? <Spinner /> : null}
              Keep this session
            </button>
          </>
        )}
        <div className="button-row divider">
          <button className="primary" onClick={onNext}>
            Prepare next meeting
            <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button className="icon danger" aria-label="Delete this session" onClick={onDelete}>
            <Trash2 size={18} />
          </button>
        </div>
      </section>
    </>
  );
}

function Notes({ artifact }: { artifact: Artifact }) {
  const lists = [
    ['Decisions', artifact.decisions],
    ['Next steps', artifact.actions],
  ] as const;
  return (
    <>
      <p className="caption">AI-generated from the mixed transcript. Speakers are not identified; check before sharing.</p>
      <p lang="vi" className="summary">
        {artifact.summary}
      </p>
      {lists.map(([title, items]) => (
        <div key={title}>
          <h3>{title}</h3>
          {items.length ? (
            <ul>
              {items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="caption">None found in the transcript.</p>
          )}
        </div>
      ))}
      <h3>Phrases you could use</h3>
      <p className="caption">Illustrative rewrites of useful moments, not a record of what anyone said.</p>
      {artifact.improvedReplies.length ? (
        <ul lang="en">
          {artifact.improvedReplies.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="caption">None suggested.</p>
      )}
      <h3>Words to take with you</h3>
      {artifact.vocabulary.length ? (
        <dl className="vocabulary">
          {artifact.vocabulary.map((item, index) => (
            <div key={index}>
              <dt lang="en">{item.phrase}</dt>
              <dd lang="vi">{item.meaning}</dd>
              <dd lang="en" className="caption">
                {item.example}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="caption">No vocabulary found.</p>
      )}
    </>
  );
}
