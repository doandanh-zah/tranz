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
 translationRoutes(app,life,{json:async(_a,_b,schema)=>{begun();await wait;return schema.parse({translations:[{id:'seg',translation:'Bản dịch thử nghiệm.'}]});}});
 const request=app.inject({method:'POST',url:`/api/sessions/${id}/translate`,payload:{segmentId:'seg',revision:1}}).then(r=>r);
 await entered;segment.revision=2;segment.text='Corrected synthetic sentence.';release();const response=await request;assert.equal(response.statusCode,409);assert.equal('translation' in segment,false);
 }finally{await app.close();rmSync(dir,{recursive:true,force:true});}
});

test('batched translation links each result to its own line and revision', async () => {
  const { listeningSession, mockAI, testApp } = await import('./helpers');
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const { ai, calls } = mockAI(async (call) => {
    await gate;
    const lines = (call.data as { lines: { id: string; text: string }[] }).lines;
    // Synthetic MOCK output: the provider skips the last line to exercise the missing-result path.
    return { translations: lines.slice(0, -1).map((line) => ({ id: line.id, translation: `VI: ${line.text}` })) };
  });
  const { request, close } = await testApp({ ai });
  try {
    const { id } = await listeningSession(request, ['Synthetic one.', 'Synthetic two.', 'Synthetic three.']);
    const items = ['s1', 's2', 's3'].map((segmentId) => ({ segmentId, revision: 1 }));
    const pendingBatch = request('POST', `/api/sessions/${id}/translate-batch`, { items });
    await new Promise((r) => setTimeout(r, 20));
    // A duplicate batch while the first is in flight must not call the provider again.
    assert.deepEqual((await request('POST', `/api/sessions/${id}/translate-batch`, { items })).body, { segments: [] });
    await request('PUT', `/api/sessions/${id}/segments`, [{ id: 's2', text: 'Synthetic two, corrected.', final: true, revision: 2, at: 1 }]);
    release();
    assert.equal((await pendingBatch).status, 200);
    const segments = (await request('GET', `/api/sessions/${id}`)).body.segments;
    assert.equal(segments[0].translation, 'VI: Synthetic one.');
    assert.equal(segments[1].translation, undefined);
    assert.equal(segments[1].revision, 2);
    assert.equal(segments[2].translationState, 'error');
    assert.equal(calls.length, 1);
    assert.equal((await request('POST', `/api/sessions/${id}/translate-batch`, { items: Array.from({ length: 9 }, () => items[0]) })).status, 400);
  } finally {
    await close();
  }
});
