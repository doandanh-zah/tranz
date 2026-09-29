import { useEffect, useRef, useState } from 'react';
import { ExternalLink, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Api } from '../api';
import type { Capabilities, Run } from '../App';
import { isExtension } from '../platform';
import { Spinner } from '../components';

export function SettingsView({
  api,
  capabilities,
  active,
  busy,
  run,
  onRefresh,
  onDisconnect,
}: {
  api: Api;
  capabilities?: Capabilities;
  active: boolean;
  busy: string;
  run: Run;
  onRefresh: () => Promise<void>;
  onDisconnect: () => void;
}) {
  return (
    <>
      <div className="section-heading">
        <span className="eyebrow">A workspace you control</span>
        <h1>Connection and privacy</h1>
      </div>
      <section className="panel" aria-labelledby="backend-heading">
        <h2 id="backend-heading">Local backend</h2>
        <p className="caption">127.0.0.1:4318 · single-owner workspace on this computer</p>
        <p className="setting-row">
          <span>Agora speech-to-text</span>
          <strong>{capabilities?.agora ? 'Credentials present' : 'Needs credentials'}</strong>
        </p>
        {capabilities?.provider === 'openai' && (
          <p className="setting-row">
            <span>AI text provider (API key)</span>
            <strong>{capabilities.ai ? `Key present · ${capabilities.model}` : 'Needs API key'}</strong>
          </p>
        )}
        <p className="caption">“Present” only means a value is configured. A live session is what proves it works.</p>
        <button className="secondary" disabled={!!busy} onClick={() => void run('refresh', onRefresh)}>
          <RefreshCw size={15} aria-hidden="true" />
          Refresh status
        </button>
      </section>
      {capabilities?.provider === 'chatgpt' && <ChatGptAccount api={api} busy={busy} run={run} onChanged={onRefresh} />}
      <section className="panel" aria-labelledby="privacy-settings-heading">
        <h2 id="privacy-settings-heading">
          <ShieldCheck size={18} aria-hidden="true" /> Private by default
        </h2>
        <ul className="plain">
          <li>Raw audio is never saved by Tranz.</li>
          <li>
            Agora’s managed pipeline runs a language model on the transcript even though Tranz never uses or plays its replies.
            That processing is billed to your Agora project.
          </li>
          <li>Profiles and sessions you choose to keep are encrypted on this computer.</li>
          <li>Temporary sessions live in backend memory and are discarded after one hour or on restart.</li>
          <li>Deleting removes Tranz’s local copy only. It cannot recall data already processed by Agora or the AI provider.</li>
        </ul>
      </section>
      <button className="secondary full" disabled={active} onClick={onDisconnect}>
        Disconnect this browser
      </button>
      {active && <p className="caption">Stop the running session before disconnecting.</p>}
    </>
  );
}

type Account = { signedIn: boolean; email: string | null; plan: string | null; pendingLogin: string | null; lastLoginError: string | null };

/** "Sign in with ChatGPT": the backend's Codex runtime starts OpenAI's OAuth page; Tranz never sees the password. */
function ChatGptAccount({ api, busy, run, onChanged }: { api: Api; busy: string; run: Run; onChanged: () => Promise<void> }) {
  const [account, setAccount] = useState<Account>();
  const [problem, setProblem] = useState('');
  const [waiting, setWaiting] = useState(false);
  const alive = useRef(true);

  const read = async () => {
    try {
      const next = await api.call<Account>('/ai/account');
      if (alive.current) {
        setAccount(next);
        setProblem('');
      }
      return next;
    } catch (caught) {
      if (alive.current) setProblem(caught instanceof Error ? caught.message : 'Could not reach the ChatGPT provider.');
      return undefined;
    }
  };

  useEffect(() => {
    alive.current = true;
    void read();
    return () => {
      alive.current = false;
    };
  }, []);

  // While the OpenAI page is open, poll until Codex reports the sign-in finished (up to 5 minutes).
  useEffect(() => {
    if (!waiting) return;
    const started = Date.now();
    const timer = setInterval(async () => {
      const next = await read();
      if (next?.signedIn || next?.lastLoginError || Date.now() - started > 300000) {
        setWaiting(false);
        if (next?.signedIn) void onChanged();
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [waiting]);

  const signIn = () =>
    run('chatgpt', async () => {
      const { authUrl } = await api.call<{ authUrl: string }>('/ai/login', 'POST');
      if (isExtension) await chrome.tabs.create({ url: authUrl });
      else window.open(authUrl, '_blank', 'noopener');
      setWaiting(true);
    });

  const signOut = () =>
    run('chatgpt', async () => {
      await api.call('/ai/logout', 'POST');
      await read();
      await onChanged();
    });

  return (
    <section className="panel" aria-labelledby="chatgpt-heading" aria-busy={waiting}>
      <h2 id="chatgpt-heading">AI: your ChatGPT plan</h2>
      <p className="caption">
        Translation, suggestions and notes run through OpenAI’s official Codex runtime on this computer, billed to your ChatGPT
        subscription instead of an API key. Each request takes several seconds and counts toward your plan’s Codex limits.
      </p>
      {problem && (
        <p className="banner error" role="alert">
          {problem}
        </p>
      )}
      {account?.signedIn ? (
        <>
          <p className="setting-row">
            <span>Signed in</span>
            <strong>
              {account.email ?? 'ChatGPT account'}
              {account.plan ? ` · ${account.plan}` : ''}
            </strong>
          </p>
          <button className="secondary" disabled={!!busy} onClick={() => void signOut()}>
            <LogOut size={15} aria-hidden="true" />
            Sign out of ChatGPT in Tranz
          </button>
        </>
      ) : (
        <>
          {account?.lastLoginError && <p className="caption" role="status">Sign-in did not finish: {account.lastLoginError}</p>}
          <button className="primary full" disabled={!!busy || waiting} onClick={() => void signIn()}>
            {waiting ? <Spinner /> : <ExternalLink size={16} aria-hidden="true" />}
            {waiting ? 'Waiting for you to finish on the OpenAI page…' : 'Sign in with ChatGPT'}
          </button>
          <p className="caption">
            Opens OpenAI’s sign-in page in a new tab. Codex keeps the login in Tranz’s own data folder, separate from any Codex
            you use yourself.
          </p>
        </>
      )}
    </section>
  );
}
