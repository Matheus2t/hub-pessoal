/** Expands the existing viewer in place. Never owns or changes media. */
export class ScreenFullscreen {
 mode:''|'native'|'expanded'='';
 private target?:HTMLElement;
 private source?:MediaStream|string;
 private button?:HTMLButtonElement;
 private epoch=0;
 private pending=false;
 constructor(private changed:()=>void){}
 get supported(){return document.fullscreenEnabled&&typeof HTMLElement.prototype.requestFullscreen==='function'}
 private fullscreenChanged=()=>{
  if(this.mode==='native'&&!this.pending&&document.fullscreenElement!==this.target)this.close();
 };
 private keydown=(event:KeyboardEvent)=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.close()}
  else if(event.key==='Tab'){
   // The overlay has one control. Keep keyboard focus out of the covered page.
   event.preventDefault();this.button?.focus();
  }
 };
 private expand(){
  this.mode='expanded';
  this.button?.focus({preventScroll:true});
  this.changed();
 }
 private async exit(target:HTMLElement){
  if(document.fullscreenElement!==target)return;
  try{await document.exitFullscreen()}catch{/* The browser may already have left fullscreen. */}
 }
 async toggle(button:HTMLButtonElement,source:MediaStream|string|undefined){
  if(this.mode){this.close();return}
  const target=button.closest<HTMLElement>('.call-preview');
  if(!source||!target)return;
  const epoch=++this.epoch;this.target=target;this.source=source;
  this.button=button;
  document.addEventListener('fullscreenchange',this.fullscreenChanged);
  document.addEventListener('keydown',this.keydown,true);
  if(!this.supported){this.expand();return}
  this.mode='native';this.pending=true;this.changed();
  try{
   await target.requestFullscreen();
   // A late native request must not survive a stopped stream or a route change.
   if(epoch!==this.epoch){
    if(this.target!==target||this.mode!=='native')await this.exit(target);
    return;
   }
   this.pending=false;
   if(document.fullscreenElement===target)button.focus({preventScroll:true});
   else this.close();
  }catch{
   if(epoch===this.epoch){this.pending=false;this.expand()}
  }
 }
 sync(source:MediaStream|string|undefined){if(this.mode&&(source!==this.source||!this.target?.isConnected))this.close()}
 close(){
  const target=this.target,button=this.button;
  if(!target)return;
  this.epoch++;this.pending=false;
  document.removeEventListener('fullscreenchange',this.fullscreenChanged);
  document.removeEventListener('keydown',this.keydown,true);
  this.target=undefined;this.source=undefined;this.button=undefined;
  this.mode='';this.changed();
  void this.exit(target);
  if(button?.isConnected)button.focus({preventScroll:true});
 }
}
