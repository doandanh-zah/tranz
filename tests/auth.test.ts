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
