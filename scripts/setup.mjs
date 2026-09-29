import {existsSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(existsSync('.env')){console.log('.env already exists; preserved.');}else{
 writeFileSync('.env',`ACCESS_TOKEN=${randomBytes(32).toString('hex')}\nDATA_KEY=${randomBytes(32).toString('hex')}\nAGORA_APP_ID=\nAGORA_APP_CERTIFICATE=\nAI_BASE_URL=https://api.openai.com/v1\nAI_API_KEY=\nAI_MODEL=gpt-4o-mini\n`,{mode:0o600});
 console.log('Created private .env. Configure provider credentials locally. Pair the extension using ACCESS_TOKEN; set EXTENSION_ID after loading the extension.');
}
