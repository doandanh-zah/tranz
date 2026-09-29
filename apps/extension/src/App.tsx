import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioLines, Settings as SettingsIcon } from 'lucide-react';
import { Api, ApiError, pairToken } from './api';
import { errorMessage, isExtension, readToken, sendCommand, writeToken, type CaptureStatus } from './platform';
import { Banner, ConfirmDialog, Spinner } from './components';
import { Connect } from './views/Connect';
import { Home } from './views/Home';
import { Live } from './views/Live';
import { ContextProfiles } from './views/ContextProfiles';
import { Library } from './views/Library';
import { SettingsView } from './views/Settings';
import type { Profile, Segment, Session } from '../../../packages/shared/contracts';
import './style.css';

export type Capabilities = { agora: boolean; ai: boolean; model: string; provider: 'chatgpt' | 'openai' };
type View = 'meeting' | 'context' | 'library' | 'settings';
/** `manual` is only for the developer preview page; the extension pairs automatically. */
type Connection = 'loading' | 'manual' | 'offline' | 'problem' | 'ready';
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
  const [problem, setProblem] = useState('');

  const api = useMemo(() => new Api(token), [token]);
  const sessionId = useRef<string | undefined>(undefined);
  sessionId.current = session?.id;
  const active = isActive(session);

  const reconnect = useRef<() => void>(() => {});
  /** The saved token stopped working (e.g. the backend's .env changed): pair again, or ask in the preview. */
  const signOut = useCallback((message: string) => {
    setToken('');
    setSession(undefined);
    setProfiles([]);
    setLibrary([]);
    setError(message);
    void writeToken('').then(() => (isExtension ? reconnect.current() : setConnection('manual')));
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
          signOut('Kết nối với Tranz trên máy đã hết hạn. Đang kết nối lại…');
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
    setProfileId((old) => (nextProfiles.some((p) => p.id === old) ? old : ''));
    setLibrary(sessions);
    setCapabilities(status);
    // Re-attach to a session still running in the background (e.g. after the panel was closed).
    const ongoing = sessions.find((s) => isActive(s));
    if (ongoing) {
      setSession(ongoing);
      if (isExtension) {
        const runtime = await sendCommand<CaptureStatus>('status').catch(() => undefined);
        setMuted(!!runtime?.muted);
        if (runtime && !runtime.active && ongoing.state !== 'created') {
          setError('Tranz vẫn ghi nhận một phiên đang chạy, nhưng trình duyệt này không còn nghe. Bấm Dừng để kết thúc phiên đó.');
        }
      }
    }
  }, []);

  /** Returns 'rejected' when the backend refused the token, so the caller can pair again. */
  const connectWith = useCallback(
    async (candidate: string) => {
      try {
        await load(new Api(candidate));
        await writeToken(candidate);
        setToken(candidate);
        setConnection('ready');
        setError('');
        return 'ok';
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 0) {
          setConnection('offline');
          return 'offline';
        }
        if (caught instanceof ApiError && caught.status === 401) return 'rejected';
        setProblem(errorMessage(caught));
        setConnection('problem');
        return 'problem';
      }
    },
    [load],
  );

  const connect = useCallback(async () => {
    setConnection('loading');
    const saved = await readToken();
    if (saved && (await connectWith(saved)) !== 'rejected') return;
    await writeToken('');
    if (!isExtension) {
      setConnection('manual');
      return;
    }
    try {
      if ((await connectWith(await pairToken())) === 'rejected') {
        setProblem('Tranz trên máy từ chối kết nối. Hãy khởi động lại Tranz rồi thử lại.');
        setConnection('problem');
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 0) setConnection('offline');
      else {
        setProblem(errorMessage(caught));
        setConnection('problem');
      }
    }
  }, [connectWith]);
  reconnect.current = () => void connect();

  useEffect(() => {
    void connect();
  }, [connect]);

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
            setNotice('Phiên này không còn trên Tranz trên máy.');
          } else if (caught instanceof ApiError && caught.status === 401) {
            signOut('Kết nối với Tranz trên máy đã hết hạn. Đang kết nối lại…');
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

  // Translate new final lines in batches of up to 8, one request at a time, so a slower provider
  // (ChatGPT via Codex takes several seconds per request) does not fall behind the conversation.
  const translating = useRef(false);
  useEffect(() => {
    if (!active || !capabilities?.ai || translating.current || !session) return;
    const next = session.segments.filter((s) => s.final && !s.translation && !s.translationState).slice(0, 8);
    if (!next.length) return;
    const id = session.id;
    translating.current = true;
    for (const segment of next) mergeSegment(id, { ...segment, translationState: 'pending' });
    void api
      .call<{ segments: Segment[] }>(`/sessions/${id}/translate-batch`, 'POST', {
        items: next.map((s) => ({ segmentId: s.id, revision: s.revision })),
      })
      .then(({ segments }) => segments.forEach((segment) => mergeSegment(id, segment)))
      .catch(async () => {
        // Failed lines are marked by the server and offer Retry; the English stays readable.
        const latest = await api.call<Session>(`/sessions/${id}`).catch(() => undefined);
        if (latest && sessionId.current === id) setSession(latest);
      })
      .finally(() => {
        translating.current = false;
      });
  }, [active, capabilities?.ai, session, api, mergeSegment]);

  const go = (next: View) => {
    setView(next);
    setNotice('');
    if (next === 'library') void run('library', async () => setLibrary(await api.call<Session[]>('/sessions')));
  };

  async function start(retain: boolean) {
    await run('start', async () => {
      const id = crypto.randomUUID();
      setSession(await api.call<Session>('/sessions', 'POST', { id, profileId: profileId || undefined, retain }));
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
          `Đã dừng phiên, nhưng Tranz chưa xác nhận được việc tắt thu âm trên máy (${localFailure}). Hãy đóng tab cuộc họp cho chắc chắn.`,
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
    if (ok) setNotice(target.kind === 'profile' ? 'Đã xoá ngữ cảnh.' : 'Đã xoá phiên khỏi máy này.');
  }

  const saveProfile = (profile: Profile) => {
    setProfiles((old) => [...old.filter((p) => p.id !== profile.id), profile].sort((a, b) => a.name.localeCompare(b.name)));
    setProfileId(profile.id);
    setNotice('Đã lưu ngữ cảnh. Các phiên đã bắt đầu vẫn giữ bản ngữ cảnh lúc bắt đầu.');
  };

  const openSession = (next: Session) => {
    if (active && session?.id !== next.id) {
      setError('Hãy dừng phiên đang chạy trước khi mở phiên khác.');
      return;
    }
    setSession(next);
    setView('meeting');
  };

  const signedIn = connection === 'ready';

  return (
    <div className="app">
      <div className="topbar">
        <header className="masthead">
          <button className="wordmark" onClick={() => go('meeting')} aria-label="Tranz, về màn hình cuộc họp">
            <span className="mark" aria-hidden="true">
              <AudioLines size={18} />
            </span>
            tranz
          </button>
          {session && signedIn && view !== 'meeting' && active && (
            <button className="text-button live-link" onClick={() => go('meeting')}>
              Quay lại cuộc họp
            </button>
          )}
          {signedIn && (
            <button className="icon" aria-label="Cài đặt" title="Cài đặt" aria-current={view === 'settings' ? 'page' : undefined} onClick={() => go('settings')}>
              <SettingsIcon size={18} />
            </button>
          )}
        </header>
        {signedIn && (
          <nav className="tabs" aria-label="Điều hướng chính">
            {(
              [
                ['meeting', 'Cuộc họp'],
                ['context', 'Ngữ cảnh'],
                ['library', 'Đã lưu'],
              ] as const
            ).map(([key, label]) => (
              <button key={key} aria-current={view === key ? 'page' : undefined} onClick={() => go(key)}>
                {label}
              </button>
            ))}
          </nav>
        )}
      </div>
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
            Mất kết nối với Tranz trên máy. Đang hiển thị cập nhật cuối cùng và tự thử lại. Việc nghe (nếu đang chạy) không bị
            dừng bởi thông báo này.
          </Banner>
        )}
        {connection === 'loading' ? (
          <div className="empty" aria-busy="true">
            <Spinner />
            <h2>Đang kết nối…</h2>
          </div>
        ) : !signedIn ? (
          <Connect
            mode={connection === 'offline' ? 'offline' : connection === 'problem' ? 'problem' : 'manual'}
            problem={problem}
            busy={busy === 'connect'}
            onConnect={(candidate) =>
              run('connect', async () => {
                if ((await connectWith(candidate)) === 'rejected') throw new Error('Mã truy cập không đúng.');
              })
            }
            onRetry={() => run('connect', connect)}
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
              onUpdate={(next) => setSession((current) => (current?.id === next.id ? next : current))}
            />
          ) : (
            <Home
              api={api}
              profiles={profiles}
              profileId={profileId}
              onSelect={setProfileId}
              capabilities={capabilities}
              busy={busy}
              onStart={start}
              onCapabilitiesChanged={() => void load(api)}
              onNewProfile={() => {
                setEditRequest({ nonce: Date.now() });
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
            api={api}
            capabilities={capabilities}
            active={active}
            busy={busy}
            run={run}
            onRefresh={async () => {
              await load(api);
              setNotice('Đã cập nhật trạng thái.');
            }}
          />
        )}
      </main>
      <footer>
        <span>
          TR<span className="accent">/</span>NZ
        </span>
        <span>{isExtension ? 'Chạy trên máy của bạn' : 'Bản xem thử giao diện'} · 0.1</span>
      </footer>
      {deletion && (
        <ConfirmDialog
          title={deletion.kind === 'profile' ? `Xoá ngữ cảnh “${deletion.name}”?` : `Xoá phiên “${deletion.name}”?`}
          description={
            deletion.kind === 'profile' ? (
              <p>
                Ngữ cảnh này sẽ bị xoá khỏi máy. Các phiên đã dùng nó vẫn giữ bản sao riêng; muốn xoá hết thì xoá cả các phiên
                đó.
              </p>
            ) : (
              <p>
                Bản ghi hội thoại, bản dịch, ngữ cảnh và ghi chú của phiên này sẽ bị xoá khỏi máy và không khôi phục được. Việc này không
                thu hồi được dữ liệu Agora hoặc ChatGPT đã xử lý.
              </p>
            )
          }
          confirmLabel={deletion.kind === 'profile' ? 'Xoá ngữ cảnh' : 'Xoá phiên'}
          busy={busy === 'delete'}
          onConfirm={() => void confirmDeletion()}
          onCancel={() => setDeletion(undefined)}
        />
      )}
    </div>
  );
}
