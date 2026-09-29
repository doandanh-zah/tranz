import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../apps/server/store';
import {Lifecycle} from '../apps/server/sessions';
import type {VoiceProvider} from '../apps/server/agora';
test('concurrent starts and stops invoke provider once and never report accepted as listening',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'tranz-life-'));try{
 const store=new Store(dir,'d'.repeat(64));let starts=0,stops=0;
 const provider={start:async()=>{starts++;return 'synthetic-agent';},stop:async()=>{stops++;},credentials:()=>{throw new Error('unused');}} satisfies VoiceProvider;
 const life=new Lifecycle(store,provider);store.sessions.set('s',{id:'s',channel:'s',uid:1,lastSeen:Date.now(),aiCalls:0,context:{id:'p',version:1,name:'synthetic',role:'',facts:'',goal:'',glossary:'',tone:'clear'},retain:false,state:'created',startedAt:Date.now(),segments:[],processing:'idle'});
 await Promise.all([life.start('s'),life.start('s')]);assert.equal(starts,1);assert.equal(life.get('s').state,'connecting');
 await Promise.all([life.stop('s'),life.stop('s')]);assert.equal(stops,1);assert.equal(life.get('s').state,'stopped');
 await assert.rejects(life.start('s'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
