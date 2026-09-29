import { useState, type FormEvent } from 'react';
import { ArrowUpRight, BookOpen, Languages, RefreshCw, ShieldCheck } from 'lucide-react';
import { Spinner } from '../components';

export function Connect({
  offline,
  busy,
  onConnect,
  onRetry,
}: {
  offline: boolean;
  busy: boolean;
  onConnect: (token: string) => void;
  onRetry: () => void;
}) {
  const [draft, setDraft] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    onConnect(draft.trim());
    setDraft('');
  }

  if (offline) {
    return (
      <section className="panel" aria-labelledby="offline-title">
        <span className="eyebrow">Backend offline</span>
        <h2 id="offline-title">Tranz cannot reach your local backend</h2>
        <p className="muted">
          Start it from the project folder with <code>npm run dev</code>. It listens only on 127.0.0.1:4318.
        </p>
        <button className="primary full" disabled={busy} onClick={onRetry}>
          {busy ? <Spinner /> : <RefreshCw size={17} aria-hidden="true" />}
          Retry connection
        </button>
      </section>
    );
  }

  return (
    <>
      <div className="intro">
        <span className="eyebrow">English meetings, with Vietnamese alongside</span>
        <h1>
          Stay in the conversation<span className="accent">.</span>
        </h1>
        <ul className="steps">
          <li>
            <Languages size={18} aria-hidden="true" />
            Original English with a linked Vietnamese translation
          </li>
          <li>
            <BookOpen size={18} aria-hidden="true" />
            Reply suggestions grounded in the context you provide
          </li>
          <li>
            <ShieldCheck size={18} aria-hidden="true" />
            No raw audio saved; you decide what stays
          </li>
        </ul>
      </div>
      <form className="panel" onSubmit={submit} aria-labelledby="connect-title">
        <span className="eyebrow">Private local workspace</span>
        <h2 id="connect-title">Connect to Tranz</h2>
        <label>
          Local access token
          <input
            type="password"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            required
            minLength={32}
            autoComplete="off"
            spellCheck={false}
            placeholder="Paste ACCESS_TOKEN from your .env"
          />
        </label>
        <p className="caption">
          Run <code>npm run setup</code> once, start the backend, then paste ACCESS_TOKEN. The token stays in browser memory
          until Chrome restarts. Provider keys never leave the backend.
        </p>
        <button className="primary full" disabled={busy}>
          {busy ? <Spinner /> : <ArrowUpRight size={17} aria-hidden="true" />}
          Connect workspace
        </button>
      </form>
    </>
  );
}
