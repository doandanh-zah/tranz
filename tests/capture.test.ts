import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Capture} from '../apps/extension/src/capture';
test('partial capture failure releases the already-acquired tab track',async()=>{
 let stopped=0,calls=0;
 const old=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>{if(calls++)throw new Error('denied');return {getTracks:()=>[{stop:()=>stopped++}]};}}}});
 try{const capture=new Capture();await assert.rejects(capture.start('synthetic-id',()=>{}));assert.equal(stopped,1);await capture.stop();assert.equal(stopped,1);}finally{if(old)Object.defineProperty(globalThis,'navigator',old);}
});
