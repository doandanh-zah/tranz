import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import type {Profile,Session} from '../../packages/shared/contracts';
export type RecordSession=Session & {channel:string;uid:number;agentId?:string;lastSeen:number;aiCalls:number};
type Database={profiles:Profile[];sessions:RecordSession[]};
export class Store {
 profiles=new Map<string,Profile>();sessions=new Map<string,RecordSession>();
 private file:string;private key:Buffer;
 constructor(dir:string,key:string){
  mkdirSync(dir,{recursive:true,mode:0o700});this.file=join(dir,'store.enc');this.key=Buffer.from(key,'hex');
  if(existsSync(this.file)){
   const b=readFileSync(this.file);const d=createDecipheriv('aes-256-gcm',this.key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));
   const db=JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString()) as Database;
   for(const p of db.profiles)this.profiles.set(p.id,p);
   for(const s of db.sessions)this.sessions.set(s.id,s);
  }
 }
 save(){
  // Persist cleanup metadata even for ephemeral sessions; never persist their content.
  const sessions=[...this.sessions.values()].map(s=>s.retain?s:{...s,context:{id:'',version:0,name:'',role:'',facts:'',goal:'',glossary:'',tone:'clear'},segments:[],artifact:undefined});
  const iv=randomBytes(12);const c=createCipheriv('aes-256-gcm',this.key,iv);
  const body=Buffer.concat([c.update(JSON.stringify({profiles:[...this.profiles.values()],sessions})),c.final()]);
  writeFileSync(this.file+'.tmp',Buffer.concat([iv,c.getAuthTag(),body]),{mode:0o600});renameSync(this.file+'.tmp',this.file);
 }
}
