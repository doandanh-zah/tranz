import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { timingSafeEqual,createHash } from 'node:crypto';
import { ZodError } from 'zod';
import { textAI, type AiAccount, type TextAI } from './ai';
import { codexAI, codexOptions } from './codex';
import { translationRoutes } from './translation';
import { assistanceRoutes } from './assistance';
import { learningRoutes } from './learning';
import { Store } from './store';
import { agoraProvider, type VoiceProvider } from './agora';
import { Lifecycle, sessionRoutes } from './sessions';
import type { Config } from './config';
export class ApiError extends Error { constructor(public statusCode:number,message:string){super(message);} }
export async function createApp(config:Config,voice?:VoiceProvider,ai?:TextAI){
 const app=Fastify({logger:false,bodyLimit:256*1024});
 const allowed=new Set(['http://127.0.0.1:5173',`http://127.0.0.1:${config.PORT}`,...(config.EXTENSION_ID?[`chrome-extension://${config.EXTENSION_ID}`]:[])]);
 await app.register(cors,{origin:(origin,cb)=>cb(null,!origin||allowed.has(origin)),methods:['GET','POST','PUT','DELETE'],allowedHeaders:['Content-Type','Authorization']});
 await app.register(rateLimit,{max:240,timeWindow:'1 minute'});
 app.addHook('onRequest',async(req,reply)=>{
  reply.header('Cache-Control','no-store').header('X-Content-Type-Options','nosniff');
  if(req.method==='OPTIONS'||req.url==='/health')return;
  if(req.headers.origin&&!allowed.has(req.headers.origin))throw new ApiError(403,'Extension này chưa được ghép với Tranz trên máy. Đặt EXTENSION_ID trong .env bằng ID của extension rồi khởi động lại Tranz.');
  if(req.url==='/api/pair')return;
  const supplied=req.headers.authorization?.replace(/^Bearer /,'')??'';
  const hash=(s:string)=>createHash('sha256').update(s).digest();
  if(!timingSafeEqual(hash(supplied),hash(config.ACCESS_TOKEN)))throw new ApiError(401,'Extension chưa kết nối được với Tranz trên máy này. Hãy mở lại panel.');
 });
 app.setErrorHandler((error,_req,reply)=>{
  const status=error instanceof ZodError?400:error instanceof ApiError?error.statusCode:(error && typeof error==='object' && 'statusCode' in error?Number(error.statusCode):500);
  reply.code(status).send({error:error instanceof ApiError?error.message:status===400?'Yêu cầu không hợp lệ. Kiểm tra lại thông tin rồi thử lại.':status===429?'Quá nhiều yêu cầu. Vui lòng chờ một chút.':'Thao tác không thành công. Hãy thử lại.'});
 });
 app.get('/health',async()=>({ok:true,version:'0.1.0'}));
 // Automatic pairing: hand the local access token only to the paired extension. Browsers set Origin
 // themselves, so web pages cannot claim chrome-extension://<EXTENSION_ID>; local programs could, but
 // they can already read .env. The developer preview (127.0.0.1:5173) still pastes the token by hand.
 app.get('/api/pair',async req=>{
  if(!config.EXTENSION_ID)throw new ApiError(409,'Tranz trên máy chưa biết ID của extension. Đặt EXTENSION_ID trong .env rồi khởi động lại Tranz.');
  if(req.headers.origin!==`chrome-extension://${config.EXTENSION_ID}`)throw new ApiError(403,'Chỉ extension Tranz đã ghép mới tự kết nối được.');
  return {token:config.ACCESS_TOKEN};
 });
 const store=new Store(config.DATA_DIR,config.DATA_KEY);
 const life=new Lifecycle(store,voice??agoraProvider(config));
 sessionRoutes(app,life);
 const assistant:TextAI=ai??(config.AI_PROVIDER==='chatgpt'?codexAI(codexOptions(config)):textAI(config));
 // `ai` is true only when requests can be attempted: an API key is set, or ChatGPT sign-in is complete.
 const account=async()=>{try{return {account:await assistant.account?.()};}catch(error){return {error:error instanceof Error?error.message:'Không dùng được AI.'};}};
 app.get('/api/status',async()=>{const {account:a,error}=await account();return {agora:!!(config.AGORA_APP_ID&&config.AGORA_APP_CERTIFICATE),ai:a?a.ready:!error,provider:a?.provider??config.AI_PROVIDER,model:config.AI_PROVIDER==='chatgpt'?(config.CODEX_MODEL??'ChatGPT default'):config.AI_MODEL};});
 app.get('/api/ai/account',async()=>{const {account:a,error}=await account();if(error)throw new ApiError(503,error);return a satisfies AiAccount|undefined;});
 app.post('/api/ai/login',async()=>{if(!assistant.login)throw new ApiError(409,'Đăng nhập chỉ dùng cho chế độ ChatGPT.');return assistant.login();});
 app.post('/api/ai/logout',async()=>{if(!assistant.logout)throw new ApiError(409,'Đăng xuất chỉ dùng cho chế độ ChatGPT.');await assistant.logout();return {ok:true};});
 app.addHook('onClose',async()=>{(assistant as {close?:()=>void}).close?.();});
 translationRoutes(app,life,assistant);
 assistanceRoutes(app,life,assistant);
 learningRoutes(app,life,assistant,{autoFinalize:!!ai||!!config.AI_API_KEY});
 return app;
}
