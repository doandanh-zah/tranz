import {Runtime} from './runtime';
const runtime=new Runtime();
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id||message?.target!=='offscreen')return;
 void (async()=>{
  if(message.type==='start')await runtime.start(message.id,message.token,message.streamId);
  if(message.type==='pause')await runtime.pause(message.value);
  if(message.type==='mute')runtime.mute(message.value);
  if(message.type==='stop')await runtime.stop();
  return {ok:true};
 })().then(respond).catch(()=>respond({error:'Audio session failed or stopped. Check permissions, backend and provider configuration.'}));
 return true;
});
