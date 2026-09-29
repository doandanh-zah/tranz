import {randomInt} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {ApiError} from './app';
import {segmentInput,type Session} from '../../packages/shared/contracts';
import {Store,type RecordSession} from './store';
import type {VoiceProvider} from './agora';
export function publicSession(s:RecordSession):Session{
 const {id,context,retain,state,startedAt,segments,artifact,processing,error}=s;
 return {id,context,retain,state,startedAt,segments,artifact,processing,error};
}
export class Lifecycle {
 private jobs=new Map<string,Promise<unknown>>();
 constructor(readonly store:Store,readonly voice:VoiceProvider){}
 get(id:string){const s=this.store.sessions.get(id);if(!s)throw new ApiError(404,'Session not found or deleted.');return s;}
 exclusive<T>(id:string,fn:()=>Promise<T>):Promise<T>{
  const previous=this.jobs.get(id)??Promise.resolve();const next=previous.catch(()=>{}).then(fn);this.jobs.set(id,next);
  void next.finally(()=>{if(this.jobs.get(id)===next)this.jobs.delete(id);}).catch(()=>{});return next;
 }
 start(id:string){return this.exclusive(id,async()=>{
  const s=this.get(id);if(s.agentId)return {accepted:true};if(s.state!=='created')throw new ApiError(409,'This session cannot restart. Start a new meeting.');
  s.state='connecting';this.store.save();
  try{s.agentId=await this.voice.start(s);this.store.save();return {accepted:true};}
  catch{ s.state='error';s.error='Agent start failed. Check provider configuration.';this.store.save();throw new ApiError(502,s.error);}
 });}
 stop(id:string){return this.exclusive(id,async()=>{
  const s=this.get(id);if(s.state==='stopped')return publicSession(s);
  s.state='stopping';this.store.save();
  try{if(s.agentId)await this.voice.stop(s.agentId);s.agentId=undefined;s.state='stopped';s.error=undefined;this.store.save();return publicSession(s);}
  catch{ s.error='Local capture stopped; remote cleanup is pending. Retry Stop.';this.store.save();throw new ApiError(502,s.error);}
 });}
 async reap(){for(const s of this.store.sessions.values()){
  if(s.state!=='stopped'&&(Date.now()-s.lastSeen>75000||Date.now()-s.startedAt>3600000))await this.stop(s.id).catch(()=>{});
  if(!s.retain&&s.state==='stopped'&&Date.now()-s.lastSeen>3600000){this.store.sessions.delete(s.id);this.store.save();}
 }}
}
export function sessionRoutes(app:FastifyInstance,life:Lifecycle){
 const idSchema=z.object({id:z.string().uuid()});
 const id=(p:unknown)=>idSchema.parse(p).id;
 app.get('/api/sessions',async()=>[...life.store.sessions.values()].filter(s=>s.retain||s.state!=='stopped').map(publicSession));
 app.post('/api/sessions',async req=>{
  const b=z.object({id:z.string().uuid(),profileId:z.string().uuid(),retain:z.boolean()}).parse(req.body);
  if(life.store.sessions.has(b.id))return publicSession(life.get(b.id));
  if([...life.store.sessions.values()].some(s=>s.state!=='stopped'))throw new ApiError(409,'Stop the existing session before starting another.');
  const profile=life.store.profiles.get(b.profileId);if(!profile)throw new ApiError(404,'Context profile not found.');
  const s:RecordSession={id:b.id,context:structuredClone(profile),retain:b.retain,state:'created',startedAt:Date.now(),lastSeen:Date.now(),segments:[],processing:'idle',channel:`tranz_${b.id}`,uid:randomInt(10000,1000000000),aiCalls:0};
  life.store.sessions.set(s.id,s);life.store.save();return publicSession(s);
 });
 app.get('/api/sessions/:id',async req=>publicSession(life.get(id(req.params))));
 app.post('/api/sessions/:id/credentials',async req=>{
  const s=life.get(id(req.params));if(['stopped','stopping','error'].includes(s.state))throw new ApiError(409,'Session is not active.');s.lastSeen=Date.now();return life.voice.credentials(s);
 });
 app.post('/api/sessions/:id/start',req=>life.start(id(req.params)));
 app.post('/api/sessions/:id/stop',req=>life.stop(id(req.params)));
 app.post('/api/sessions/:id/heartbeat',async req=>{
  const s=life.get(id(req.params));const b=z.object({state:z.enum(['connecting','listening','paused','reconnecting'])}).parse(req.body);
  if(['stopped','stopping','error'].includes(s.state))throw new ApiError(409,'Session ended.');
  s.lastSeen=Date.now();s.state=b.state;return {ok:true};
 });
 app.put('/api/sessions/:id/segments',async req=>{
  const s=life.get(id(req.params));if(!['listening','connecting','reconnecting'].includes(s.state))throw new ApiError(409,'Session is not listening.');
  const input=z.array(segmentInput).max(100).parse(req.body);
  for(const item of input){const old=s.segments.find(x=>x.id===item.id);if(old){if(item.revision>old.revision&&(!old.final||item.final))Object.assign(old,item,{translation:undefined,translationState:undefined});}else if(s.segments.length<3000)s.segments.push(item);}
  s.lastSeen=Date.now();life.store.save();return {ok:true};
 });
 app.delete('/api/sessions/:id',async req=>{
  const sessionId=id(req.params);await life.stop(sessionId);life.store.sessions.delete(sessionId);life.store.save();return {ok:true};
 });
 const timer=setInterval(()=>void life.reap(),15000);timer.unref();
 app.addHook('onClose',async()=>{clearInterval(timer);for(const s of life.store.sessions.values())if(s.state!=='stopped')await life.stop(s.id).catch(()=>{});});
}
