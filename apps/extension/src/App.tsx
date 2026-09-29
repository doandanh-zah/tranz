import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioLines, Settings as SettingsIcon } from 'lucide-react';
import { Api, ApiError } from './api';
import { errorMessage, isExtension, readToken, sendCommand, writeToken } from './platform';
import { Banner, ConfirmDialog, Spinner } from './components';
import { Connect } from './views/Connect';
import { Prepare } from './views/Prepare';
import { Live } from './views/Live';
import { ContextProfiles } from './views/ContextProfiles';
import { Library } from './views/Library';
import { SettingsView } from './views/Settings';
import type { Profile, Segment, Session } from '../../../packages/shared/contracts';
import './style.css';

export type Capabilities = { agora: boolean; ai: boolean; model: string };
type View = 'meeting' | 'context' | 'library' | 'settings';
type Connection = 'loading' | 'signed-out' | 'offline' | 'ready';
type Deletion = { kind: 'session' | 'profile'; id: string; name: string };
/** Runs a user action, reporting failures in the shared error banner. Returns false on failure. */
export type Run = (name: string, job: () => Promise<void>) => Promise<boolean>;

const isActive = (session?: Session) => !!session && !['stopped', 'error'].includes(session.state);

export function App() {
  const [token, setToken] = useState('');
  const [connection, setConnection] = useState<Connection>('loading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [view, setView] = useState<View>('meeting');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState('');
  const [library, setLibrary] = useState<Session[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities>();
  const [session, setSession] = useState<Session>();
  const [backendLost, setBackendLost] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deletion, setDeletion] = useState<Deletion>();
  const [editRequest, setEditRequest] = useState<{ profile?: Profile; nonce: number }>();

  const api = useMemo(() => new Api(token), [token]);
  const sessionId = useRef<string | undefined>(undefined);
  sessionId.current = session?.id;
  const active = isActive(session);

  const signOut = useCallback((message: string) => {
    setToken('');
    setConnection('signed-out');
    setSession(undefined);
    setProfiles([]);
    setLibrary([]);
    setError(message);
    void writeToken('');
  }, []);

  const run: Run = useCallback(
    async (name, job) => {
      setBusy(name);
      setError('');
      try {
        await job();
        return true;
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 401) {
          signOut('Your pairing expired. Paste the local access token again.');
        } else {
          setError(errorMessage(caught));
        }
        return false;
      } finally {
        setBusy('');
      }
    },
    [signOut],
  );

  const load = useCallback(async (client: Api) => {
    const [nextProfiles, sessions, status] = await Promise.all([
      client.call<Profile[]>('/profiles'),
      client.call<Session[]>('/sessions'),
      client.call<Capabilities>('/status'),
    ]);
    setProfiles(nextProfiles);
    setProfileId((old) => (nextProfiles.some((p) => p.id === old) ? old : (nextProfiles[0]?.id ?? '')));
    setLibrary(sessions);
    setCapabilities(status);
    // Re-attach to a session still running in the background (e.g. after the panel was closed).
    const ongoing = sessions.find((s) => isActive(s));
    if (ongoing) setSession(ongoing);
  }, []);

  const connectWith = useCallback(
    async (candidate: string) => {
      try {
        await load(new Api(candidate));
        await writeToken(candidate);
        setToken(candidate);
        setConnection('ready');
        setError('');
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 0) {
          setToken(candidate);
          setConnection('offline');
        } else {
          signOut(caught instanceof ApiError && caught.status === 401 ? 'That access token was not accepted.' : errorMessage(caught));
        }
      }
    },
    [load, signOut],
  );

  useEffect(() => {
    void readToken().then((saved) => (saved ? connectWith(saved) : setConnection('signed-out')));
  }, [connectWith]);

  // Poll the backend for transcript/processing updates. The last good snapshot stays visible on failure.
  const shouldPoll = !!token && !!session && (active || session.processing === 'processing');
  const polledId = session?.id;
  useEffect(() => {
    if (!shouldPoll || !polledId) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      api
        .call<Session>(`/sessions/${polledId}`, 'GET', undefined, controller.signal)
        .then((next) => {
          setBackendLost(false);
          if (sessionId.current === polledId) setSession(next);
        })
        .catch((caught) => {
          if (controller.signal.aborted) return;
          if (caught instanceof ApiError && caught.status === 404) {
            setSession(undefined);
            setNotice('This session no longer exists on the backend.');
          } else if (caught instanceof ApiError && caught.status === 401) {
            signOut('Your pairing expired. Paste the local access token again.');
          } else {
            setBackendLost(true);
          }
        });
    }, 1500);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [api, polledId, shouldPoll, signOut]);

  const mergeSegment = useCallback((id: string, segment: Segment) => {
    setSession((current) =>
      current?.id === id
        ? {
            ...current,
            segments: current.segments.map((s) => (s.id === segment.id && s.revision === segment.revision ? segment : s)),
          }
        : current,
    );
  }, []);

  const translate = useCallback(
    async (segment: Segment) => {
      const id = sessionId.current;
      if (!id) return;
      mergeSegment(id, { ...segment, translationState: 'pending' });
      try {
        mergeSegment(id, await api.call<Segment>(`/sessions/${id}/translate`, 'POST', { segmentId: segment.id, revision: segment.revision }));
      } catch {
        // The server marks the segment as failed; the source text stays readable and offers a retry.
        const next = await api.call<Session>(`/sessions/${id}`).catch(() => undefined);
        if (next && sessionId.current === id) setSession(next);
      }
    },
    [api, mergeSegment],
  );

  // Translate new final segments one at a time so the transcript does not flood the provider.
  const translating = useRef(false);
  useEffect(() => {
    if (!active || !capabilities?.ai || translating.current || !session) return;
    const next = session.segments.find((s) => s.final && !s.translation && !s.translationState);
    if (!next) return;
    translating.current = true;
    void translate(next).finally(() => {
      translating.current = false;
    });
  }, [active, capabilities?.ai, session, translate]);

  const go = (next: View) => {
    setView(next);
    setNotice('');
    if (next === 'library') void run('library', async () => setLibrary(await api.call<Session[]>('/sessions')));
  };

  async function start(retain: boolean) {
    await run('start', async () => {
      if (!profileId) throw new Error('Choose a context profile first.');
      const id = crypto.randomUUID();
      setSession(await api.call<Session>('/sessions', 'POST', { id, profileId, retain }));
      setMuted(false);
      try {
        await sendCommand('start', { id, token });
        setSession(await api.call<Session>(`/sessions/${id}`));
      } catch (caught) {
        await sendCommand('stop').catch(() => {});
        const stopped = await api.call<Session>(`/sessions/${id}/stop`, 'POST').catch(() => undefined);
        if (stopped) setSession(stopped);
        throw caught;
      }
    });
  }

  async function stop() {
    if (!session) return;
    const id = session.id;
    await run('stop', async () => {
      let localFailure = '';
      await sendCommand('stop').catch((caught) => {
        localFailure = errorMessage(caught);
      });
      setSession(await api.call<Session>(`/sessions/${id}/stop`, 'POST'));
      if (localFailure) {
        throw new Error(
          `The provider session stopped, but Tranz could not confirm local audio capture was released (${localFailure}). Close the meeting tab to be sure.`,
        );
      }
    });
  }

  async function pause() {
    if (!session) return;
    const id = session.id;
    await run('pause', async () => {
      await sendCommand('pause', { value: session.state !== 'paused' });
      setSession(await api.call<Session>(`/sessions/${id}`));
    });
  }

  async function toggleMute() {
    await run('mute', async () => {
      await sendCommand('mute', { value: !muted });
      setMuted(!muted);
    });
  }

  async function confirmDeletion() {
    if (!deletion) return;
    const target = deletion;
    const ok = await run('delete', async () => {
      if (target.kind === 'profile') {
        await api.call(`/profiles/${target.id}`, 'DELETE');
        setProfiles((old) => old.filter((p) => p.id !== target.id));
        setProfileId((old) => (old === target.id ? '' : old));
      } else {
        await api.call(`/sessions/${target.id}`, 'DELETE');
        setLibrary((old) => old.filter((s) => s.id !== target.id));
        if (sessionId.current === target.id) setSession(undefined);
      }
    });
    setDeletion(undefined);
    if (ok) setNotice(target.kind === 'profile' ? 'Context profile deleted.' : 'Session deleted from this computer.');
  }

  const saveProfile = (profile: Profile) => {
    setProfiles((old) => [...old.filter((p) => p.id !== profile.id), profile].sort((a, b) => a.name.localeCompare(b.name)));
    setProfileId(profile.id);
    setNotice('Context saved. Running and past sessions keep the snapshot they started with.');
  };

  const openSession = (next: Session) => {
    if (active && session?.id !== next.id) {
      setError('Stop the current session before opening another.');
      return;
    }
    setSession(next);
    setView('meeting');
  };

  const signedIn = connection === 'ready';

  return (
    <div className="app">
      <header className="masthead">
        <button className="wordmark" onClick={() => go('meeting')} aria-label="Tranz, go to session">
          <span className="mark" aria-hidden="true">
            <AudioLines size={18} />
          </span>
          tranz
        </button>
        {session && signedIn && view !== 'meeting' && active && (
          <button className="text-button live-link" onClick={() => go('meeting')}>
            Back to live session
          </button>
        )}
        {signedIn && (
          <button className="icon" aria-label="Settings" aria-current={view === 'settings' ? 'page' : undefined} onClick={() => go('settings')}>
            <SettingsIcon size={18} />
          </button>
        )}
      </header>
      {signedIn && (
        <nav className="tabs" aria-label="Main">
          {(
            [
              ['meeting', 'Session'],
              ['context', 'Context'],
              ['library', 'Library'],
            ] as const
          ).map(([key, label]) => (
            <button key={key} aria-current={view === key ? 'page' : undefined} onClick={() => go(key)}>
              {label}
            </button>
          ))}
        </nav>
      )}
      <main>
        {error && (
          <Banner tone="error" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}
        {notice && (
          <Banner tone="success" onDismiss={() => setNotice('')}>
            {notice}
          </Banner>
        )}
        {backendLost && signedIn && (
          <Banner tone="error">
            Lost contact with the local backend. Showing the last update; Tranz keeps retrying. Audio capture, if running, is not
            stopped by this message.
          </Banner>
        )}
        {connection === 'loading' ? (
          <div className="empty" aria-busy="true">
            <Spinner />
            <h2>Connecting to your local backend…</h2>
          </div>
        ) : !signedIn ? (
          <Connect
            offline={connection === 'offline'}
            busy={busy === 'connect'}
            onConnect={(candidate) => run('connect', () => connectWith(candidate))}
            onRetry={() => run('connect', () => connectWith(token))}
          />
        ) : view === 'meeting' ? (
          session ? (
            <Live
              key={session.id}
              api={api}
              session={session}
              capabilities={capabilities}
              busy={busy}
              run={run}
              muted={muted}
              onPause={pause}
              onMute={toggleMute}
              onStop={stop}
              onTranslate={translate}
              onNotice={setNotice}
              onNext={() => setSession(undefined)}
              onDelete={() => setDeletion({ kind: 'session', id: session.id, name: session.context.name })}
            />
          ) : (
            <Prepare
              profiles={profiles}
              profileId={profileId}
              onSelect={setProfileId}
              capabilities={capabilities}
              busy={busy}
              onStart={start}
              onEditProfile={(profile) => {
                setEditRequest({ profile, nonce: Date.now() });
                setView('context');
              }}
            />
          )
        ) : view === 'context' ? (
          <ContextProfiles
            api={api}
            profiles={profiles}
            busy={busy}
            run={run}
            editRequest={editRequest}
            onSaved={saveProfile}
            onDelete={(profile) => setDeletion({ kind: 'profile', id: profile.id, name: profile.name })}
          />
        ) : view === 'library' ? (
          <Library
            sessions={library}
            loading={busy === 'library'}
            onOpen={openSession}
            onDelete={(s) => setDeletion({ kind: 'session', id: s.id, name: s.context.name })}
          />
        ) : (
          <SettingsView
            capabilities={capabilities}
            active={active}
            busy={busy}
            run={run}
            onRefresh={async () => {
              await load(api);
              setNotice('Configuration refreshed.');
            }}
            onDisconnect={() => signOut('')}
          />
        )}
      </main>
      <footer>
        <span>
          TR<span className="accent">/</span>NZ
        </span>
        <span>{isExtension ? 'Local workspace' : 'Management preview'} · 0.1</span>
      </footer>
      {deletion && (
        <ConfirmDialog
          title={deletion.kind === 'profile' ? `Delete the profile “${deletion.name}”?` : `Delete the session “${deletion.name}”?`}
          description={
            deletion.kind === 'profile' ? (
              <p>
                This removes the reusable profile from this computer. Sessions that already started keep their own snapshot of it;
                delete those sessions to remove their copies.
              </p>
            ) : (
              <p>
                This removes the transcript, translations, context snapshot and any notes for this session from this computer. It cannot be undone, and it cannot recall text already processed by Agora or the AI provider.
              </p>
            )
          }
          confirmLabel={deletion.kind === 'profile' ? 'Delete profile' : 'Delete session'}
          busy={busy === 'delete'}
          onConfirm={() => void confirmDeletion()}
          onCancel={() => setDeletion(undefined)}
        />
      )}
    </div>
  );
}
