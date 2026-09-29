import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import type {Lifecycle} from './sessions';
import type {TextAI} from './ai';
import {ApiError} from './app';
export function translationRoutes(app:FastifyInstance,life:Lifecycle,ai:TextAI){
 const pending=new Map<string,Promise<unknown>>();
 app.post('/api/sessions/:id/translate',async req=>{
  const {id}=z.object({id:z.string().uuid()}).parse(req.params);const s=life.get(id);
  const {segmentId,revision}=z.object({segmentId:z.string(),revision:z.number().int()}).parse(req.body);
  const segment=s.segments.find(x=>x.id===segmentId);if(!segment||segment.revision!==revision||!segment.final)throw new ApiError(409,'Transcript changed or is not final.');
  if(segment.translation)return segment;
  const key=`${id}:${segmentId}:${revision}`;if(pending.has(key))return pending.get(key);
  if(s.aiCalls>=500)throw new ApiError(429,'Session AI request limit reached.');
  s.aiCalls++;segment.translationState='pending';
  const job=(async()=>{try{
   const result=await ai.json('Translate the English text into Vietnamese, preserving uncertainty and technical terms. Return {"translation":string}.',{text:segment.text,glossary:s.context.glossary},z.object({translation:z.string().min(1).max(8000)}));
   if(life.store.sessions.get(id)!==s||segment.revision!==revision)throw new ApiError(409,'Transcript changed or session deleted.');
   segment.translation=result.translation;segment.translationState='ready';life.store.save();return segment;
  }catch(e){if(life.store.sessions.get(id)===s&&segment.revision===revision){segment.translationState='error';life.store.save();}throw e;}finally{pending.delete(key);}})();pending.set(key,job);return job;
 });
}
