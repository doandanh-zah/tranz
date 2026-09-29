import {Capture} from './capture';
const capture=new Capture();
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id||message?.target!=='offscreen')return;
 void (async()=>{
  if(message.type==='start')await capture.start(message.streamId,()=>void capture.stop());
  if(message.type==='pause')capture.setPaused(message.value);
  if(message.type==='mute')capture.setMuted(message.value);
  if(message.type==='stop')await capture.stop();
  return {ok:true};
 })().then(respond).catch(()=>respond({error:'Audio capture failed. Check permissions and retry.'}));
 return true;
});
