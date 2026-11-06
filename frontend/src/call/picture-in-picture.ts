/** Owns the browser window for the existing remote screen video. */
export class ScreenPictureInPicture {
 private root:HTMLElement|null=null;
 private video?:HTMLVideoElement;
 private events?:AbortController;
 private observer=new MutationObserver(()=>this.syncVideo());
 busy=false;
 error='';

 constructor(private changed:()=>void){}

 get active(){return !!this.video&&document.pictureInPictureElement===this.video}
 get available(){
  const video=this.video;
  return !!video&&document.pictureInPictureEnabled&&
   typeof video.requestPictureInPicture==='function'&&typeof document.exitPictureInPicture==='function'&&
   !video.disablePictureInPicture&&!video.ended&&video.readyState>=HTMLMediaElement.HAVE_METADATA&&video.videoWidth>0;
 }

 sync(root:HTMLElement|null){
  if(this.root===root)return;
  this.observer.disconnect();
  this.root=root;
  if(root)this.observer.observe(root,{childList:true});
  this.syncVideo();
 }

 async toggle(){
  const video=this.video;
  if(!video||!this.available||this.busy)return;
  const events=this.events;
  this.busy=true;this.error='';this.changed();
  try{
   if(this.active)await document.exitPictureInPicture();
   else{
    await video.requestPictureInPicture();
    // The room or share may have ended while the browser opened its window.
    if(events!==this.events||!this.available)await this.exit(video);
   }
  }catch{
   if(events===this.events)this.error='Não foi possível alternar a janela flutuante.';
  }finally{
   this.busy=false;this.changed();
  }
 }

 private syncVideo(){
  const video=this.root?.querySelector('video')??undefined;
  if(this.video===video)return;
  if(this.video)void this.exit(this.video);
  this.events?.abort();
  this.events=undefined;this.video=video;this.error='';
  if(video){
   this.events=new AbortController();
   for(const event of ['loadedmetadata','emptied','ended','enterpictureinpicture','leavepictureinpicture']){
    video.addEventListener(event,this.onVideoChange,{signal:this.events.signal});
   }
  }
  this.changed();
 }

 private onVideoChange=(event:Event)=>{
  if((event.type==='emptied'||event.type==='ended')&&this.video)void this.exit(this.video);
  this.error='';this.changed();
 };

 private async exit(video:HTMLVideoElement){
  if(document.pictureInPictureElement!==video)return;
  try{await document.exitPictureInPicture()}catch{/* The browser may already be closing the window. */}
 }
}
