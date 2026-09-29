import {AgoraClient,Agent,Area,DeepgramSTT,OpenAI,MiniMaxTTS,ExpiresIn} from 'agora-agents';
import tokenBuilders from 'agora-token';
const {RtcTokenBuilder,RtcRole,RtmTokenBuilder}=tokenBuilders;
import type {Config} from './config';
import type {RecordSession} from './store';
import type {Credentials} from '../../packages/shared/contracts';
export interface VoiceProvider {start(s:RecordSession):Promise<string>;stop(id:string):Promise<void>;credentials(s:RecordSession):Credentials;}
export function agoraProvider(c:Config):VoiceProvider{
 const client=()=>new AgoraClient({area:Area.US,appId:c.AGORA_APP_ID,appCertificate:c.AGORA_APP_CERTIFICATE});
 return {
  async start(s){
   const agent=new Agent({client:client(),instructions:'You are a passive meeting observer. Do not give advice or introduce yourself. Keep responses minimal.',greeting:'',advancedFeatures:{enable_rtm:true},parameters:{data_channel:'rtm',enable_error_message:true,enable_metrics:true}})
    .withStt(new DeepgramSTT({model:'nova-3',language:'en'}))
    .withLlm(new OpenAI({model:'gpt-4o-mini',maxHistory:2,params:{max_tokens:8}}))
    .withTts(new MiniMaxTTS({model:'speech_2_6_turbo',voiceId:'English_captivating_female1'}));
   const session=agent.createSession({name:`tranz_${s.id}`,channel:s.channel,agentUid:'9001',remoteUids:[String(s.uid)],idleTimeout:60,expiresIn:ExpiresIn.hours(1),debug:false});
   return session.start();
  },
  async stop(id){try{await client().stopAgent(id);}catch(error){if(!(error&&typeof error==='object'&&'statusCode' in error&&error.statusCode===404))throw error;}},
  credentials(s){return {appId:c.AGORA_APP_ID,channel:s.channel,uid:s.uid,agentUid:9001,rtcToken:RtcTokenBuilder.buildTokenWithUid(c.AGORA_APP_ID,c.AGORA_APP_CERTIFICATE,s.channel,s.uid,RtcRole.PUBLISHER,600,600),rtmToken:RtmTokenBuilder.buildToken(c.AGORA_APP_ID,c.AGORA_APP_CERTIFICATE,String(s.uid),600),expiresAt:Date.now()+600000};}
 };
}
