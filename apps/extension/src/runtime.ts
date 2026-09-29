import AgoraRTC,{type IAgoraRTCClient,type ILocalAudioTrack} from 'agora-rtc-sdk-ng';
import AgoraRTM from 'agora-rtm';
import {AgoraVoiceAI,AgoraVoiceAIEvents,MessageType,TurnStatus} from 'agora-agent-client-toolkit';
import {Capture} from './capture';
import {Api} from './api';
import type {Credentials,Segment} from '../../../packages/shared/contracts';
AgoraRTC.setLogLevel(4);
AgoraRTC.disableLogUpload();
export class Runtime {
 private capture=new Capture();private rtc?:IAgoraRTCClient;private rtm?:InstanceType<typeof AgoraRTM.RTM>;private ai?:AgoraVoiceAI;private track?:ILocalAudioTrack;
 private api?:Api;private id?:string;private generation=0;private heartbeat?:ReturnType<typeof setInterval>;private flushTimer?:ReturnType<typeof setInterval>;private starting?:Promise<void>;private stopJob?:Promise<void>;
 private segments=new Map<string,Segment>();private dirty=new Map<string,Segment>();private flushing=false;private state:'connecting'|'listening'|'paused'|'reconnecting'='connecting';private renewing=false;
 async start(id:string,token:string,streamId:string){
  if(this.id)throw new Error('An audio session already exists.');this.id=id;this.api=new Api(token);const generation=++this.generation;
  const check=()=>{if(generation!==this.generation)throw new Error('Session canceled.');};
  const run=async()=>{
   const media=await this.capture.start(streamId,()=>void this.stop());check();
   const creds=await this.api!.call<Credentials>(`/sessions/${id}/credentials`,'POST');check();
   this.rtc=AgoraRTC.createClient({mode:'rtc',codec:'vp8'});
   this.rtm=new AgoraRTM.RTM(creds.appId,String(creds.uid),{logLevel:'none',logUpload:false});
   this.rtc.on('token-privilege-will-expire',()=>void this.renew());
   this.rtc.on('token-privilege-did-expire',()=>void this.stop());
   this.rtc.on('connection-state-change',(next)=>{if(next==='RECONNECTING'){this.state='reconnecting';this.capture.setPaused(true);}else if(next==='CONNECTED'&&this.state==='reconnecting'){void this.stop();}else if(next==='DISCONNECTED')void this.stop();});
   this.rtm.addEventListener('tokenPrivilegeWillExpire',()=>void this.renew());
   await this.rtm.login({token:creds.rtmToken});check();
   this.ai=await AgoraVoiceAI.init({rtcEngine:this.rtc,rtmEngine:this.rtm,enableLog:false,enableAgoraMetrics:false});check();
   this.ai.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED,items=>{
    if(this.state==='paused'||generation!==this.generation)return;
    for(const item of items){
     if(item.metadata?.object!==MessageType.USER_TRANSCRIPTION||!item.text.trim())continue;
     const key=`${item.uid}:${item.stream_id}:${item.turn_id}`;const old=this.segments.get(key);const final=item.status===TurnStatus.END;
     if(old?.text===item.text&&old.final===final)continue;
     const next:Segment={id:key,text:item.text.slice(0,4000),final,revision:(old?.revision??0)+1,at:Date.now()};
     this.segments.set(key,next);this.dirty.set(key,next);
    }
   });
   this.ai.on(AgoraVoiceAIEvents.AGENT_ERROR,()=>void this.stop());
   // No user-published handler: agent audio is never subscribed, played or mixed.
   let joined=false;this.rtc.on('user-joined',user=>{if(String(user.uid)===String(creds.agentUid))joined=true;});
   this.rtc.on('user-left',user=>{if(String(user.uid)===String(creds.agentUid))void this.stop();});
   await this.rtc.join(creds.appId,creds.channel,creds.rtcToken,creds.uid);check();
   await this.ai.subscribeMessage(creds.channel);check();
   this.track=AgoraRTC.createCustomAudioTrack({mediaStreamTrack:media});await this.rtc.publish(this.track);check();
   await this.api!.call(`/sessions/${id}/start`,'POST');check();
   const deadline=Date.now()+20000;
   while(!joined&&Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,100));check();}
   if(!joined)throw new Error('Agent did not join.');
   this.state='listening';await this.beat();
   this.heartbeat=setInterval(()=>void this.beat().catch(()=>void this.stop()),15000);
   this.flushTimer=setInterval(()=>void this.flush().catch(()=>void this.stop()),750);
  };
  this.starting=run();try{await this.starting;}catch(e){this.starting=undefined;await this.stop();throw e;}finally{this.starting=undefined;}
 }
 private beat(){return this.api!.call(`/sessions/${this.id}/heartbeat`,'POST',{state:this.state});}
 private async flush(){if(this.flushing||!this.dirty.size||!this.id)return;this.flushing=true;const batch=[...this.dirty.values()].slice(0,100);try{await this.api!.call(`/sessions/${this.id}/segments`,'PUT',batch);for(const item of batch)if(this.dirty.get(item.id)?.revision===item.revision)this.dirty.delete(item.id);}finally{this.flushing=false;}}
 private async renew(){if(this.renewing||!this.id)return;this.renewing=true;try{const c=await this.api!.call<Credentials>(`/sessions/${this.id}/credentials`,'POST');await this.rtc?.renewToken(c.rtcToken);await this.rtm?.renewToken(c.rtmToken);}catch{await this.stop();}finally{this.renewing=false;}}
 async pause(value:boolean){this.capture.setPaused(value);this.state=value?'paused':'listening';await this.beat();}
 mute(value:boolean){this.capture.setMuted(value);}
 stop():Promise<void>{
  if(this.stopJob)return this.stopJob;this.generation++;const pending=this.starting;
  this.stopJob=(async()=>{
   clearInterval(this.heartbeat);clearInterval(this.flushTimer);await this.capture.stop();
   if(pending)await pending.catch(()=>{});await this.capture.stop();
   await this.flush().catch(()=>{});this.track?.close();this.track=undefined;
   this.ai?.destroy();this.ai=undefined;await this.rtc?.leave().catch(()=>{});this.rtc=undefined;await this.rtm?.logout().catch(()=>{});this.rtm=undefined;
   const id=this.id;this.id=undefined;this.segments.clear();this.dirty.clear();
   if(id)await this.api?.call(`/sessions/${id}/stop`,'POST');
  })().finally(()=>{this.stopJob=undefined;});return this.stopJob;
 }
}
