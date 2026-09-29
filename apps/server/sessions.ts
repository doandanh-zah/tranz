import { randomInt } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from './app';
import { endReasons, segmentInput, type EndReason, type Session } from '../../packages/shared/contracts';
import { Store, type RecordSession } from './store';
import type { VoiceProvider } from './agora';

/** The audio runtime heartbeats every 15 s; silence for this long means it is gone. */
export const HEARTBEAT_TIMEOUT = 75000;
export const MAX_SESSION_DURATION = 3600000;
/** Temporary sessions are forgotten this long after their last activity once stopped. */
export const TEMPORARY_RETENTION = 3600000;
const MAX_SEGMENTS = 3000;
const MAX_STORED_SESSIONS = 500;

export function publicSession(s: RecordSession): Session {
  const { id, context, retain, state, startedAt, segments, artifact, processing, processingError, endedReason, error } = s;
  return { id, context, retain, state, startedAt, segments, artifact, processing, processingError, endedReason, error };
}

export class Lifecycle {
  private jobs = new Map<string, Promise<unknown>>();
  private stoppedListeners: ((s: RecordSession) => void)[] = [];
  /** Set during shutdown so stop-triggered background work is not started. */
  closing = false;

  constructor(
    readonly store: Store,
    readonly voice: VoiceProvider,
  ) {}

  /** Called synchronously once a session reaches `stopped`; listeners must not throw or block. */
  onStopped(listener: (s: RecordSession) => void) {
    this.stoppedListeners.push(listener);
  }

  get(id: string) {
    const session = this.store.sessions.get(id);
    if (!session) throw new ApiError(404, 'Session not found or deleted.');
    return session;
  }

  /** Serialises jobs sharing a key; a failed job does not block the next one. */
  exclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.jobs.get(key) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(fn);
    this.jobs.set(key, next);
    void next
      .finally(() => {
        if (this.jobs.get(key) === next) this.jobs.delete(key);
      })
      .catch(() => {});
    return next;
  }

  /** Accepted means the provider took the request, not that the agent joined; the client waits for that. */
  start(id: string) {
    return this.exclusive(id, async () => {
      const s = this.get(id);
      if (s.agentId) return { accepted: true };
      if (s.state !== 'created') throw new ApiError(409, 'This session cannot restart. Start a new meeting.');
      s.state = 'connecting';
      this.store.save();
      try {
        s.agentId = await this.voice.start(s);
        this.store.save();
        return { accepted: true };
      } catch {
        // The provider may have created the agent even though the response was lost.
        await this.voice.cleanupChannel?.(s.channel).catch(() => {});
        s.state = 'error';
        s.error = 'The Agora transcriber could not be started. Check the provider configuration.';
        this.store.save();
        throw new ApiError(502, s.error);
      }
    });
  }

  stop(id: string, reason: EndReason = 'user') {
    return this.exclusive(id, async () => {
      const s = this.get(id);
      if (s.state === 'stopped') return publicSession(s);
      s.state = 'stopping';
      s.endedReason ??= reason;
      this.store.save();
      try {
        if (s.agentId) await this.voice.stop(s.agentId);
        s.agentId = undefined;
        s.state = 'stopped';
        s.error = undefined;
        this.store.save();
        for (const listener of this.stoppedListeners) listener(s);
        return publicSession(s);
      } catch {
        s.error = 'Local capture stopped, but the transcriber may still be running. Press Stop again to retry.';
        this.store.save();
        throw new ApiError(502, s.error);
      }
    });
  }

  /** Watchdog: stops silent or over-long sessions and forgets expired temporary ones. */
  async reap(now = Date.now()) {
    for (const s of [...this.store.sessions.values()]) {
      if (s.state !== 'stopped') {
        const reason = now - s.startedAt > MAX_SESSION_DURATION ? 'time-limit' : now - s.lastSeen > HEARTBEAT_TIMEOUT ? 'inactive' : undefined;
        if (reason) await this.stop(s.id, reason).catch(() => {});
      }
      if (!s.retain && s.state === 'stopped' && now - s.lastSeen > TEMPORARY_RETENTION) {
        this.store.sessions.delete(s.id);
        this.store.save();
      }
    }
  }
}

const idSchema = z.object({ id: z.string().uuid() });
const stopBody = z.object({ reason: z.enum(endReasons).optional() }).optional();
const liveStates = ['connecting', 'listening', 'paused', 'reconnecting'] as const;

export function sessionRoutes(app: FastifyInstance, life: Lifecycle) {
  const { store } = life;
  const id = (params: unknown) => idSchema.parse(params).id;
  const ended = (s: RecordSession) => ['stopped', 'stopping', 'error'].includes(s.state);

  app.get('/api/sessions', async () =>
    [...store.sessions.values()].filter((s) => s.retain || s.state !== 'stopped').map(publicSession),
  );

  app.post('/api/sessions', async (req) => {
    const body = z.object({ id: z.string().uuid(), profileId: z.string().uuid(), retain: z.boolean() }).parse(req.body);
    if (store.sessions.has(body.id)) return publicSession(life.get(body.id));
    if ([...store.sessions.values()].some((s) => s.state !== 'stopped')) {
      throw new ApiError(409, 'Stop the existing session before starting another.');
    }
    if (store.sessions.size >= MAX_STORED_SESSIONS) {
      throw new ApiError(409, 'Too many saved sessions. Delete some from the Library first.');
    }
    const profile = store.profiles.get(body.profileId);
    if (!profile) throw new ApiError(404, 'Context profile not found.');
    const session: RecordSession = {
      id: body.id,
      context: structuredClone(profile),
      retain: body.retain,
      state: 'created',
      startedAt: Date.now(),
      lastSeen: Date.now(),
      segments: [],
      processing: 'idle',
      channel: `tranz_${body.id}`,
      uid: randomInt(10000, 1000000000),
      aiCalls: 0,
    };
    store.sessions.set(session.id, session);
    store.save();
    return publicSession(session);
  });

  app.get('/api/sessions/:id', async (req) => publicSession(life.get(id(req.params))));

  app.post('/api/sessions/:id/credentials', async (req) => {
    const s = life.get(id(req.params));
    if (ended(s)) throw new ApiError(409, 'Session is not active.');
    s.lastSeen = Date.now();
    return life.voice.credentials(s);
  });

  app.post('/api/sessions/:id/start', (req) => life.start(id(req.params)));

  app.post('/api/sessions/:id/stop', (req) => life.stop(id(req.params), stopBody.parse(req.body)?.reason));

  app.post('/api/sessions/:id/heartbeat', async (req) => {
    const s = life.get(id(req.params));
    const { state } = z.object({ state: z.enum(liveStates) }).parse(req.body);
    if (ended(s)) throw new ApiError(409, 'Session ended.');
    s.lastSeen = Date.now();
    s.state = state;
    return { ok: true };
  });

  // Paused and reconnecting sessions still accept lines that were finalised before the gate closed.
  app.put('/api/sessions/:id/segments', async (req) => {
    const s = life.get(id(req.params));
    if (!(liveStates as readonly string[]).includes(s.state)) throw new ApiError(409, 'Session is not listening.');
    const input = z.array(segmentInput).max(100).parse(req.body);
    let dropped = 0;
    for (const item of input) {
      const old = s.segments.find((x) => x.id === item.id);
      if (old) {
        // Newer revisions replace older ones; a final line never regresses to partial.
        if (item.revision > old.revision && (!old.final || item.final)) {
          Object.assign(old, item, { translation: undefined, translationState: undefined });
        }
      } else if (s.segments.length < MAX_SEGMENTS) s.segments.push(item);
      else dropped++;
    }
    if (dropped) s.error = `Transcript limit of ${MAX_SEGMENTS} lines reached; newer lines are not kept.`;
    s.lastSeen = Date.now();
    store.save();
    return { ok: true, dropped };
  });

  app.delete('/api/sessions/:id', async (req) => {
    const sessionId = id(req.params);
    await life.stop(sessionId);
    store.sessions.delete(sessionId);
    store.save();
    return { ok: true };
  });

  const timer = setInterval(() => void life.reap(), 15000);
  timer.unref();
  app.addHook('onClose', async () => {
    clearInterval(timer);
    life.closing = true;
    for (const s of store.sessions.values()) if (s.state !== 'stopped') await life.stop(s.id, 'ended-by-backend').catch(() => {});
  });
}
