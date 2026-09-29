import { ArrowRight, Trash2 } from 'lucide-react';
import type { Session } from '../../../../packages/shared/contracts';
import { Spinner } from '../components';

export function Library({
  sessions,
  loading,
  onOpen,
  onDelete,
}: {
  sessions: Session[];
  loading: boolean;
  onOpen: (session: Session) => void;
  onDelete: (session: Session) => void;
}) {
  const kept = sessions.filter((s) => s.retain).sort((a, b) => b.startedAt - a.startedAt);
  return (
    <>
      <div className="section-heading">
        <span className="eyebrow">Saved on this computer</span>
        <h1>Library</h1>
        <p>Only sessions you chose to keep appear here. Temporary sessions disappear on their own.</p>
      </div>
      {loading && !kept.length ? (
        <div className="empty" aria-busy="true">
          <Spinner />
          <p>Loading saved sessions…</p>
        </div>
      ) : kept.length ? (
        <ul className="card-list">
          {kept.map((session) => (
            <li className="card" key={session.id}>
              <span className="eyebrow">
                {new Date(session.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              <h2>{session.context.name || 'Untitled session'}</h2>
              <p>{session.artifact?.summary ?? `${session.segments.filter((s) => s.final).length} transcript lines`}</p>
              <div className="button-row">
                <button className="text-button" onClick={() => onOpen(session)}>
                  Open session
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
                <button className="icon danger" aria-label={`Delete session ${session.context.name}`} onClick={() => onDelete(session)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <h2>Nothing saved</h2>
          <p>Your meetings stay temporary unless you choose to keep them.</p>
        </div>
      )}
    </>
  );
}
