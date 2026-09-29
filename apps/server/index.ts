import { configSchema } from './config';
import { createApp } from './app';
const result=configSchema.safeParse(process.env);
if(!result.success){console.error('Backend configuration invalid. Run npm run setup and configure .env.');process.exit(1);}
const app=await createApp(result.data);
await app.listen({host:'127.0.0.1',port:result.data.PORT});
console.log(`Tranz backend ready at http://127.0.0.1:${result.data.PORT}`);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>void app.close().then(()=>process.exit(0)));
