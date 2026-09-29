import {test} from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../apps/server/store';
import {Lifecycle} from '../apps/server/sessions';
import {translationRoutes} from '../apps/server/translation';
test('a delayed translation cannot overwrite a corrected transcript revision',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'tranz-trans-'));const app=Fastify();try{
 const store=new Store(dir,'e'.repeat(64));const id=randomUUID();const segment={id:'seg',text:'Synthetic sentence.',final:true,revision:1,at:0};
 store.sessions.set(id,{id,channel:'test',uid:1,lastSeen:0,aiCalls:0,context:{id:'p',version:1,name:'synthetic',role:'',facts:'',goal:'',glossary:'',tone:'clear'},retain:true,state:'listening',startedAt:0,segments:[segment],processing:'idle'});
 const life=new Lifecycle(store,{start:async()=>'',stop:async()=>{},credentials:()=>{throw new Error('unused');}});
 let release!:()=>void;const wait=new Promise<void>(r=>{release=r;});let begun!:()=>void;const entered=new Promise<void>(r=>{begun=r;});
 translationRoutes(app,life,{json:async(_a,_b,schema)=>{begun();await wait;return schema.parse({translation:'Bản dịch thử nghiệm.'});}});
 const request=app.inject({method:'POST',url:`/api/sessions/${id}/translate`,payload:{segmentId:'seg',revision:1}}).then(r=>r);
 await entered;segment.revision=2;segment.text='Corrected synthetic sentence.';release();const response=await request;assert.equal(response.statusCode,409);assert.equal('translation' in segment,false);
 }finally{await app.close();rmSync(dir,{recursive:true,force:true});}
});
