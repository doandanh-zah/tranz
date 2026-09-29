import AgoraRTC, { type IAgoraRTCClient, type ILocalAudioTrack } from 'agora-rtc-sdk-ng';
import AgoraRTM from 'agora-rtm';
import { AgoraVoiceAI, AgoraVoiceAIEvents, MessageType, ModuleType, TranscriptHelperMode, TurnStatus } from 'agora-agent-client-toolkit';
import { Capture } from './capture';
import { Api, ApiError } from './api';
import type { Credentials, EndReason, Segment } from '../../../packages/shared/contracts';

AgoraRTC.setLogLevel(4);
AgoraRTC.disableLogUpload();

const AGENT_JOIN_TIMEOUT = 20000;
const HEARTBEAT_INTERVAL = 15000;
const FLUSH_INTERVAL = 750;
/** Consecutive failed heartbeats (~60 s) before the runtime gives up on an unreachable backend. */
const MAX_HEARTBEAT_FAILURES = 4;

type LiveState = 'connecting' | 'listening' | 'paused' | 'reconnecting';

/** A backend answer meaning the session is over, as opposed to a transient network failure. */
const sessionGone = (error: unknown) => error instanceof ApiError && (error.status === 404 || error.status === 409);

function describeStartFailure(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Chrome blocked tab or microphone capture. Allow microphone access for Tranz (Prepare → Check microphone), then retry.';
    }
    if (error.name === 'NotFoundError') return 'No microphone was found. Connect one and retry.';
    if (error.name === 'NotReadableError') return 'The microphone is in use by another app or could not be opened.';
  }
  return error instanceof Error && error.message ? error.message : 'Audio session failed to start.';
}

/**
 * Owns capture, the Agora RTC/RTM connection and transcript upload for one session inside the
 * offscreen document. Agent audio is never subscribed or played.
 */
export class Runtime {
  private capture = new Capture();
  private rtc?: IAgoraRTCClient;
  private rtm?: InstanceType<typeof AgoraRTM.RTM>;
  private ai?: AgoraVoiceAI;
  private track?: ILocalAudioTrack;
  private api?: Api;
  private id?: string;
  private generation = 0;
  private timers: ReturnType<typeof setInterval>[] = [];
  private starting?: Promise<void>;
  private stopJob?: Promise<void>;
  private segments = new Map<string, Segment>();
  private dirty = new Map<string, Segment>();
  private flushing = false;
  private renewing = false;
  private started = false;
  private userPaused = false;
  private muted = false;
  private rtcDown = false;
  private rtmDown = false;
  private heartbeatFailures = 0;

  status() {
    return { active: !!this.id, paused: this.userPaused, muted: this.muted };
  }

  private get state(): LiveState {
    if (!this.started) return 'connecting';
    if (this.userPaused) return 'paused';
    return this.rtcDown || this.rtmDown ? 'reconnecting' : 'listening';
  }

  async start(id: string, token: string, streamId: string) {
    if (this.id) throw new Error('An audio session is already running. Stop it first.');
    this.id = id;
    this.api = new Api(token);
    const generation = ++this.generation;
    const check = () => {
      if (generation !== this.generation) throw new Error('Start was cancelled.');
    };
    const api = this.api;

    const run = async () => {
      const media = await this.capture.start(streamId, () => void this.stop('capture-ended'));
      check();
      const creds = await api.call<Credentials>(`/sessions/${id}/credentials`, 'POST');
      check();
      const rtc = (this.rtc = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }));
      const rtm = (this.rtm = new AgoraRTM.RTM(creds.appId, String(creds.uid), { logLevel: 'none', logUpload: false }));

      rtc.on('token-privilege-will-expire', () => void this.renew());
      rtc.on('token-privilege-did-expire', () => void this.stop('credentials-expired'));
      rtc.on('connection-state-change', (next) => {
        if (next === 'RECONNECTING') this.setDegraded('rtc', true);
        else if (next === 'CONNECTED') this.setDegraded('rtc', false);
        else if (next === 'DISCONNECTED' && this.started) void this.stop('connection-lost');
      });
      // RTM carries the transcript; listen before login so no state change is missed.
      rtm.addEventListener('tokenPrivilegeWillExpire', () => void this.renew());
      rtm.addEventListener('linkState', (event) => {
        if (event.currentState === 'CONNECTED') this.setDegraded('rtm', false);
        else if (event.currentState === 'FAILED') void this.stop('connection-lost');
        else if (this.started && ['CONNECTING', 'SUSPENDED', 'DISCONNECTED'].includes(event.currentState)) {
          this.setDegraded('rtm', true);
        }
      });
      await rtm.login({ token: creds.rtmToken });
      check();
      // The agent publishes transcripts as RTM channel messages; without this subscription none arrive
      // (found in the live Agora check; subscribeMessage below only binds the toolkit's parsers).
      await rtm.subscribe(creds.channel);
      check();

      // TEXT mode: word-timed rendering would wait for agent audio, which Tranz never subscribes to.
      const voice = (this.ai = await AgoraVoiceAI.init({ rtcEngine: rtc, rtmEngine: rtm, renderMode: TranscriptHelperMode.TEXT, enableLog: false, enableAgoraMetrics: false }));
      check();
      // Full history arrives on every update; only changed user transcription becomes a new revision.
      voice.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (items) => {
        if (generation !== this.generation) return;
        for (const item of items) {
          if (item.metadata?.object !== MessageType.USER_TRANSCRIPTION || !item.text?.trim()) continue;
          const key = `${item.uid}:${item.stream_id}:${item.turn_id}`;
          const previous = this.segments.get(key);
          const final = item.status === TurnStatus.END;
          if (previous && previous.text === item.text && previous.final === final) continue;
          if (previous?.final && !final) continue; // never regress a finalised line
          const next: Segment = { id: key, text: item.text.slice(0, 4000), final, revision: (previous?.revision ?? 0) + 1, at: Date.now() };
          this.segments.set(key, next);
          this.dirty.set(key, next);
        }
      });
      // Tranz only needs speech-to-text; LLM/TTS module errors of the passive agent are not fatal.
      voice.on(AgoraVoiceAIEvents.AGENT_ERROR, (_agent, error) => {
        if (error.type === ModuleType.ASR) void this.stop('transcriber-error');
      });

      // No user-published handler: agent audio is never subscribed, played or mixed.
      let joined = false;
      rtc.on('user-joined', (user) => {
        if (String(user.uid) === String(creds.agentUid)) joined = true;
      });
      rtc.on('user-left', (user) => {
        if (String(user.uid) === String(creds.agentUid)) void this.stop('agent-left');
      });
      await rtc.join(creds.appId, creds.channel, creds.rtcToken, creds.uid);
      check();
      await voice.subscribeMessage(creds.channel);
      check();
      this.track = AgoraRTC.createCustomAudioTrack({ mediaStreamTrack: media });
      await rtc.publish(this.track);
      check();
      await api.call(`/sessions/${id}/start`, 'POST');
      check();
      // An accepted start request is not readiness: wait until the agent is actually in the channel.
      const deadline = Date.now() + AGENT_JOIN_TIMEOUT;
      while (!joined && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        check();
      }
      if (!joined) throw new Error('The Agora transcriber did not join within 20 seconds. Check the Agora configuration and retry.');
      this.started = true;
      await this.beat();
      this.timers.push(setInterval(() => void this.beat(), HEARTBEAT_INTERVAL));
      this.timers.push(setInterval(() => void this.flush(), FLUSH_INTERVAL));
    };

    this.starting = run();
    try {
      await this.starting;
    } catch (error) {
      await this.stop('start-failed');
      throw new Error(describeStartFailure(error));
    } finally {
      this.starting = undefined;
    }
  }

  private setDegraded(link: 'rtc' | 'rtm', down: boolean) {
    if (link === 'rtc') this.rtcDown = down;
    else this.rtmDown = down;
    this.applyGate();
  }

  /** No audio is sent while the user paused or while a link is recovering; nothing is buffered. */
  private applyGate() {
    this.capture.setPaused(this.userPaused || this.rtcDown || this.rtmDown);
    if (this.started) void this.beat();
  }

  private async beat() {
    if (!this.id || !this.api) return;
    try {
      await this.api.call(`/sessions/${this.id}/heartbeat`, 'POST', { state: this.state });
      this.heartbeatFailures = 0;
    } catch (error) {
      if (sessionGone(error)) void this.stop('ended-by-backend');
      else if (++this.heartbeatFailures >= MAX_HEARTBEAT_FAILURES) void this.stop('backend-unreachable');
    }
  }

  private async flush() {
    if (this.flushing || !this.dirty.size || !this.id || !this.api) return;
    this.flushing = true;
    const batch = [...this.dirty.values()].slice(0, 100);
    try {
      await this.api.call(`/sessions/${this.id}/segments`, 'PUT', batch);
      for (const item of batch) if (this.dirty.get(item.id)?.revision === item.revision) this.dirty.delete(item.id);
    } catch (error) {
      // Transient failures keep the batch for the next tick; only a finished session stops us.
      if (sessionGone(error) && !this.stopJob) void this.stop('ended-by-backend');
    } finally {
      this.flushing = false;
    }
  }

  private async renew() {
    if (this.renewing || !this.id || !this.api) return;
    this.renewing = true;
    try {
      const creds = await this.api.call<Credentials>(`/sessions/${this.id}/credentials`, 'POST');
      await this.rtc?.renewToken(creds.rtcToken);
      await this.rtm?.renewToken(creds.rtmToken);
    } catch {
      void this.stop('credentials-expired');
    } finally {
      this.renewing = false;
    }
  }

  async pause(value: boolean) {
    if (!this.id) throw new Error('No audio session is running.');
    this.userPaused = value;
    this.applyGate();
  }

  mute(value: boolean) {
    if (!this.id) throw new Error('No audio session is running.');
    this.muted = value;
    this.capture.setMuted(value);
  }

  /**
   * Releases every local resource first, then asks the backend to stop the agent. A failed remote
   * stop is left to the panel's Stop retry and the backend watchdog; local release is never skipped.
   */
  stop(reason: EndReason = 'user'): Promise<void> {
    if (this.stopJob) return this.stopJob;
    this.generation++;
    const pending = this.starting;
    this.stopJob = (async () => {
      for (const timer of this.timers) clearInterval(timer);
      this.timers = [];
      await this.capture.stop();
      if (pending) await pending.catch(() => {});
      await this.capture.stop(); // a start that was mid-getUserMedia may have acquired tracks since
      await this.flush().catch(() => {});
      this.track?.close();
      this.track = undefined;
      this.ai?.destroy();
      this.ai = undefined;
      await this.rtc?.leave().catch(() => {});
      this.rtc = undefined;
      await this.rtm?.logout().catch(() => {});
      this.rtm = undefined;
      const { id, api } = this;
      this.id = undefined;
      this.started = false;
      this.userPaused = this.muted = this.rtcDown = this.rtmDown = false;
      this.heartbeatFailures = 0;
      this.segments.clear();
      this.dirty.clear();
      if (id && api) await api.call(`/sessions/${id}/stop`, 'POST', { reason }).catch(() => {});
    })().finally(() => {
      this.stopJob = undefined;
    });
    return this.stopJob;
  }
}
