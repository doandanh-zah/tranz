import { useEffect, useState } from 'react';
import { ArrowRight, Headphones, Mic, Plus, ShieldCheck } from 'lucide-react';
import type { Profile } from '../../../../packages/shared/contracts';
import type { Capabilities } from '../App';
import { ContextDetails, Spinner } from '../components';
import {
  errorMessage,
  isExtension,
  microphonePermission,
  openSetupTab,
  requestMicrophone,
  type MicrophonePermission,
} from '../platform';

export function Prepare({
  profiles,
  profileId,
  onSelect,
  capabilities,
  busy,
  onStart,
  onEditProfile,
}: {
  profiles: Profile[];
  profileId: string;
  onSelect: (id: string) => void;
  capabilities?: Capabilities;
  busy: string;
  onStart: (retain: boolean) => void;
  onEditProfile: (profile?: Profile) => void;
}) {
  const [retain, setRetain] = useState(false);
  const [consent, setConsent] = useState(false);
  const profile = profiles.find((p) => p.id === profileId);

  const blockers = [
    !isExtension && 'Open Tranz from the toolbar on a Google Meet tab; this page is only a management preview.',
    !profile && 'Choose or create a context profile.',
    capabilities && !capabilities.agora && 'Agora credentials are missing from the backend configuration.',
    !consent && 'Confirm that you are ready to share meeting audio.',
  ].filter((item): item is string => !!item);

  return (
    <>
      <div className="section-heading">
        <span className="eyebrow">Before the call</span>
        <h1>Prepare your meeting</h1>
        <p>Tranz listens only after you press Start, and only to the tab where you opened it.</p>
      </div>

      <section className="panel" aria-labelledby="context-heading">
        <div className="section-label">
          <h2 id="context-heading">1. Context</h2>
          <button className="text-button" onClick={() => onEditProfile()}>
            <Plus size={14} aria-hidden="true" />
            New profile
          </button>
        </div>
        {profiles.length ? (
          <>
            <label>
              Context profile for this meeting
              <select value={profileId} onChange={(event) => onSelect(event.target.value)}>
                <option value="" disabled>
                  Choose a profile
                </option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (v{p.version})
                  </option>
                ))}
              </select>
            </label>
            {profile && (
              <details className="snapshot">
                <summary>Review the exact context this session will use</summary>
                <ContextDetails profile={profile} />
                <button className="text-button" onClick={() => onEditProfile(profile)}>
                  Edit this profile
                </button>
              </details>
            )}
          </>
        ) : (
          <div className="empty compact">
            <h3>No context profile yet</h3>
            <p>Add your role, verified project facts and meeting goal so suggestions do not have to guess.</p>
            <button className="secondary" onClick={() => onEditProfile()}>
              Create a context profile
            </button>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">2. Language and privacy</h2>
        <p className="language-pair">
          <span lang="en">English</span>
          <ArrowRight size={16} aria-label="translated to" />
          <span lang="vi">Tiếng Việt</span>
        </p>
        <MicrophoneCheck />
        <label className="check-row">
          <input type="checkbox" checked={retain} onChange={(event) => setRetain(event.target.checked)} />
          <span>
            Keep this session after it ends
            <small>
              Off: transcript stays in backend memory only and is discarded one hour after the session ends or when the backend
              restarts. On: transcript and notes are saved encrypted on this computer until you delete them.
            </small>
          </span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>
            I’m ready to share meeting audio
            <small>
              Tab and microphone audio go to Agora for speech-to-text. Agora’s pipeline also runs its language model on the
              transcript; Tranz ignores and never plays those replies. Transcript text and this context go to the configured AI
              provider. Tell participants before you start.
            </small>
          </span>
        </label>
      </section>

      {capabilities && !capabilities.ai && (
        <p className="caption">
          AI is not configured, so translation, suggestions and notes will be unavailable. The transcript still works.
        </p>
      )}
      <button
        className="primary full"
        disabled={!!busy || blockers.length > 0}
        aria-describedby={blockers.length ? 'start-blockers' : undefined}
        onClick={() => onStart(retain)}
      >
        {busy === 'start' ? <Spinner /> : <Headphones size={18} aria-hidden="true" />}
        {busy === 'start' ? 'Connecting… waiting for the transcriber to join' : 'Start listening'}
      </button>
      {blockers.length > 0 && (
        <ul id="start-blockers" className="blockers">
          {blockers.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <p className="privacy-note">
        <ShieldCheck size={14} aria-hidden="true" />
        No raw audio is saved. Tranz never speaks or types in the meeting for you.
      </p>
    </>
  );
}

function MicrophoneCheck() {
  const [state, setState] = useState<MicrophonePermission>('unknown');
  const [problem, setProblem] = useState('');

  useEffect(() => {
    void microphonePermission().then(setState);
  }, []);

  async function request() {
    setProblem('');
    try {
      await requestMicrophone();
      setState(await microphonePermission());
    } catch (caught) {
      setState(await microphonePermission());
      setProblem(errorMessage(caught));
    }
  }

  if (state === 'granted') {
    return (
      <p className="setting-row">
        <span>
          <Mic size={15} aria-hidden="true" /> Microphone access
        </span>
        <strong>Allowed</strong>
      </p>
    );
  }
  return (
    <div className="mic-check">
      <p>
        <Mic size={15} aria-hidden="true" />{' '}
        {state === 'denied'
          ? 'Microphone access is blocked for Tranz. Allow it in Chrome site settings for this extension, then check again.'
          : 'Tranz needs microphone access once so it can hear your side of the meeting. Checking releases the microphone immediately.'}
      </p>
      <div className="button-row">
        <button className="secondary" onClick={() => void request()}>
          Check microphone
        </button>
        {isExtension && (
          <button className="text-button" onClick={openSetupTab}>
            Open in a tab instead
          </button>
        )}
      </div>
      {problem && (
        <p className="caption" role="status">
          {problem}
        </p>
      )}
    </div>
  );
}
