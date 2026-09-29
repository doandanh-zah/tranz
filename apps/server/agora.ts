import { AgoraClient, Agent, Area, DeepgramSTT, OpenAI, MiniMaxTTS, ExpiresIn, generateConvoAIToken } from 'agora-agents';
import tokenBuilders from 'agora-token';
import type { Config } from './config';
import type { RecordSession } from './store';
import type { Credentials } from '../../packages/shared/contracts';

const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = tokenBuilders;
const AGENT_UID = 9001;
const TOKEN_SECONDS = 600;

export interface VoiceProvider {
  start(s: RecordSession): Promise<string>;
  stop(agentId: string): Promise<void>;
  credentials(s: RecordSession): Credentials;
  /** Best-effort removal of agents left in a channel when a start response was lost. */
  cleanupChannel?(channel: string): Promise<void>;
}

export function agoraProvider(c: Config): VoiceProvider {
  const client = () => new AgoraClient({ area: Area.US, appId: c.AGORA_APP_ID, appCertificate: c.AGORA_APP_CERTIFICATE });
  const provider: VoiceProvider = {
    async start(s) {
      // The agent must exist for Agora STT, but Tranz never subscribes to or plays its audio.
      // The LLM/TTS stages are kept minimal; they may still run and be billed by the provider.
      const agent = new Agent({
        client: client(),
        instructions: 'You are a passive meeting observer. Do not give advice or introduce yourself. Keep responses minimal.',
        greeting: '',
        advancedFeatures: { enable_rtm: true },
        parameters: { data_channel: 'rtm', enable_error_message: true, enable_metrics: true },
      })
        .withStt(new DeepgramSTT({ model: 'nova-3', language: 'en' }))
        .withLlm(new OpenAI({ model: 'gpt-4o-mini', maxHistory: 2, params: { max_tokens: 8 } }))
        .withTts(new MiniMaxTTS({ model: 'speech_2_6_turbo', voiceId: 'English_captivating_female1' }));
      const session = agent.createSession({
        name: `tranz_${s.id}`,
        channel: s.channel,
        agentUid: String(AGENT_UID),
        remoteUids: [String(s.uid)],
        idleTimeout: 60,
        expiresIn: ExpiresIn.hours(1),
        debug: false,
      });
      return session.start();
    },

    async stop(agentId) {
      // The SDK already treats 404 (agent gone) as success.
      await client().stopAgent(agentId);
    },

    credentials(s) {
      return {
        appId: c.AGORA_APP_ID,
        channel: s.channel,
        uid: s.uid,
        agentUid: AGENT_UID,
        rtcToken: RtcTokenBuilder.buildTokenWithUid(c.AGORA_APP_ID, c.AGORA_APP_CERTIFICATE, s.channel, s.uid, RtcRole.PUBLISHER, TOKEN_SECONDS, TOKEN_SECONDS),
        rtmToken: RtmTokenBuilder.buildToken(c.AGORA_APP_ID, c.AGORA_APP_CERTIFICATE, String(s.uid), TOKEN_SECONDS),
        expiresAt: Date.now() + TOKEN_SECONDS * 1000,
      };
    },

    // Mirrors the SDK's own app-credential auth for stopAgent. Not yet exercised against live Agora.
    async cleanupChannel(channel) {
      const agora = client();
      const token = generateConvoAIToken({ appId: c.AGORA_APP_ID, appCertificate: c.AGORA_APP_CERTIFICATE, channelName: channel, uid: 0 });
      const page = await agora.agents.list({ appid: c.AGORA_APP_ID, channel }, { headers: { Authorization: `agora token=${token}` } });
      for (const item of page.data) {
        if (item.agent_id && item.status !== 'STOPPED' && item.status !== 'FAILED') await agora.stopAgent(item.agent_id);
      }
    },
  };
  return provider;
}
