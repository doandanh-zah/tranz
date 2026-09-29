let creating:Promise<void>|undefined;
chrome.action.onClicked.addListener(tab=>{
 if(tab.id){void chrome.storage.session.set({meetingTabId:tab.id});void chrome.sidePanel.open({tabId:tab.id});}
});
async function offscreen(){
 const contexts=await chrome.runtime.getContexts({contextTypes:[chrome.runtime.ContextType.OFFSCREEN_DOCUMENT]});
 if(contexts.length)return;
 creating??=chrome.offscreen.createDocument({url:'offscreen.html',reasons:[chrome.offscreen.Reason.USER_MEDIA,chrome.offscreen.Reason.AUDIO_PLAYBACK],justification:'Capture selected meeting audio with explicit user start and preserve meeting playback.'}).finally(()=>{creating=undefined;});
 await creating;
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id||message?.target!=='worker')return;
 void (async()=>{
  if(message.type==='start'){
   const {meetingTabId}=await chrome.storage.session.get('meetingTabId');
   if(typeof meetingTabId!=='number')throw new Error('Click the Tranz toolbar icon on your meeting tab first.');
   const tab=await chrome.tabs.get(meetingTabId);
   if(!tab.url?.startsWith('https://meet.google.com/'))throw new Error('Open a Google Meet tab, then click the Tranz toolbar icon.');
   await offscreen();
   const streamId=await chrome.tabCapture.getMediaStreamId({targetTabId:meetingTabId});
   return chrome.runtime.sendMessage({...message,target:'offscreen',streamId});
  }
  return chrome.runtime.sendMessage({...message,target:'offscreen'});
 })().then(result=>respond(result??{ok:true})).catch(()=>respond({error:'Capture unavailable. Reopen Tranz on the meeting tab and check microphone permission.'}));
 return true;
});
chrome.tabs.onRemoved.addListener(tabId=>{void chrome.storage.session.get('meetingTabId').then(({meetingTabId})=>{if(tabId===meetingTabId)void chrome.runtime.sendMessage({target:'offscreen',type:'stop'}).catch(()=>{});});});
