/** Chrome keeps tab playback muted during tabCapture; explicitly restore only tab audio. */
export class Capture {
 private tab?:MediaStream;
 private mic?:MediaStream;
 private context?:AudioContext;
 private tabGain?:GainNode;
 private micGain?:GainNode;
 private output?:MediaStreamAudioDestinationNode;
 private paused=false;
 private muted=false;
 async start(streamId:string,onEnded:()=>void){
  if(this.context)throw new Error('Tranz đang nghe một cuộc họp khác. Hãy dừng phiên đó trước.');
  try{
   this.tab=await navigator.mediaDevices.getUserMedia({audio:{mandatory:{chromeMediaSource:'tab',chromeMediaSourceId:streamId}} as MediaTrackConstraints,video:false});
   this.mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   this.context=new AudioContext();
   await this.context.resume();
   this.output=this.context.createMediaStreamDestination();
   const tabSource=this.context.createMediaStreamSource(this.tab);
   tabSource.connect(this.context.destination);
   this.tabGain=this.context.createGain();this.micGain=this.context.createGain();
   tabSource.connect(this.tabGain).connect(this.output);
   this.context.createMediaStreamSource(this.mic).connect(this.micGain).connect(this.output);
   for(const track of [...this.tab.getTracks(),...this.mic.getTracks()])track.addEventListener('ended',onEnded,{once:true});
   this.apply();return this.output.stream.getAudioTracks()[0];
  }catch(e){await this.stop();throw e;}
 }
 setPaused(value:boolean){this.paused=value;this.apply();}
 setMuted(value:boolean){this.muted=value;this.apply();}
 private apply(){if(this.tabGain)this.tabGain.gain.value=this.paused?0:0.65;if(this.micGain)this.micGain.gain.value=this.paused||this.muted?0:0.65;}
 async stop(){
  for(const stream of [this.tab,this.mic,this.output?.stream])for(const track of stream?.getTracks()??[])track.stop();
  this.tab=undefined;this.mic=undefined;this.output=undefined;
  await this.context?.close().catch(()=>{});this.context=undefined;this.paused=false;this.muted=false;
 }
}
