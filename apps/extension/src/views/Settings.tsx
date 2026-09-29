import { RefreshCw, ShieldCheck } from 'lucide-react';
import type { Capabilities, Run } from '../App';

export function SettingsView({
  capabilities,
  active,
  busy,
  run,
  onRefresh,
  onDisconnect,
}: {
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
        <p className="setting-row">
          <span>AI text provider</span>
          <strong>{capabilities?.ai ? `Key present · ${capabilities.model}` : 'Needs API key'}</strong>
        </p>
        <p className="caption">“Present” only means a value is configured. A live session is what proves it works.</p>
        <button className="secondary" disabled={!!busy} onClick={() => void run('refresh', onRefresh)}>
          <RefreshCw size={15} aria-hidden="true" />
          Refresh status
        </button>
      </section>
      <section className="panel" aria-labelledby="privacy-settings-heading">
        <h2 id="privacy-settings-heading">
          <ShieldCheck size={18} aria-hidden="true" /> Private by default
        </h2>
        <ul className="plain">
          <li>Raw audio is never saved by Tranz.</li>
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
