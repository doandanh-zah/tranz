import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../apps/server/store';
test('encrypted persistence omits ephemeral content and retains opted-in material',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tranz-test-'));try{
 const s=new Store(dir,'b'.repeat(64));const entry={id:'a',channel:'a',uid:1,lastSeen:0,aiCalls:0,context:{id:'p',version:1,name:'synthetic-private',role:'',facts:'secret-test-fact',goal:'',glossary:'',tone:'clear' as const},retain:false,state:'stopped' as const,startedAt:0,segments:[{id:'1',revision:1,text:'synthetic-sensitive-text',final:true,at:0}],processing:'idle' as const};
 s.sessions.set('a',entry);s.sessions.set('b',{...entry,id:'b',retain:true});s.save();
 assert.equal(readFileSync(join(dir,'store.enc')).includes(Buffer.from('synthetic-sensitive-text')),false);
 const reload=new Store(dir,'b'.repeat(64));assert.deepEqual(reload.sessions.get('a')?.segments,[]);assert.equal(reload.sessions.get('a')?.context.facts,'');assert.equal(reload.sessions.get('b')?.segments.length,1);
 assert.throws(()=>new Store(dir,'c'.repeat(64)));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
