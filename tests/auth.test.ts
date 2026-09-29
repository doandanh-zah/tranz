import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../apps/server/app';
import {configSchema} from '../apps/server/config';
test('health is public; private API needs auth and rejects unknown origins',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'tranz-auth-'));
 const app=await createApp(configSchema.parse({ACCESS_TOKEN:'test-only-'.repeat(8),DATA_KEY:'a'.repeat(64),DATA_DIR:dir}));
 try{assert.equal((await app.inject('/health')).statusCode,200);assert.equal((await app.inject('/api/status')).statusCode,401);assert.equal((await app.inject({url:'/api/status',headers:{authorization:'Bearer '+'test-only-'.repeat(8),origin:'https://evil.example'}})).statusCode,403);}finally{await app.close();rmSync(dir,{recursive:true,force:true});}
});

test('automatic pairing gives the token only to the paired extension origin', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'tranz-pair-'));
  const token = 'test-only-'.repeat(8);
  const extension = 'a'.repeat(32);
  const app = await createApp(configSchema.parse({ ACCESS_TOKEN: token, DATA_KEY: 'a'.repeat(64), DATA_DIR: dir, EXTENSION_ID: extension, AI_PROVIDER: 'openai' }));
  try {
    const paired = await app.inject({ url: '/api/pair', headers: { origin: `chrome-extension://${extension}` } });
    assert.equal(paired.statusCode, 200);
    assert.equal(paired.json().token, token);
    assert.equal((await app.inject({ url: '/api/pair' })).statusCode, 403);
    assert.equal((await app.inject({ url: '/api/pair', headers: { origin: 'http://127.0.0.1:5173' } })).statusCode, 403);
    assert.equal((await app.inject({ url: '/api/pair', headers: { origin: `chrome-extension://${'b'.repeat(32)}` } })).statusCode, 403);
    assert.equal((await app.inject({ url: '/api/pair', headers: { origin: 'https://evil.example' } })).statusCode, 403);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a session can start without a context profile', async () => {
  const { testApp } = await import('./helpers');
  const { randomUUID } = await import('node:crypto');
  const { request, close } = await testApp();
  try {
    const created = await request('POST', '/api/sessions', { id: randomUUID(), retain: false });
    assert.equal(created.status, 200);
    assert.equal(created.body.context.name, 'Cuộc họp nhanh');
    assert.equal(created.body.context.facts, '');
  } finally {
    await close();
  }
});
