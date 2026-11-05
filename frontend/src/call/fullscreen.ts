/** Expands the existing viewer in place. Never owns or changes media. */
export class ScreenFullscreen {
 mode:''|'native'|'expanded'='';
 private target?:HTMLElement;
 private viewer?:string;
 private source?:MediaStream|string;
 private button?:HTMLButtonElement;
 private epoch=0;
 private pending=false;
 constructor(private changed:()=>void){}
 get supported(){return document.fullscreenEnabled&&typeof HTMLElement.prototype.requestFullscreen==='function'}
 modeFor(viewer:string){return this.viewer===viewer?this.mode:''}
 private fullscreenChanged=()=>{
  if(this.mode==='native'&&!this.pending&&document.fullscreenElement!==this.target)this.close();
 };
 private keydown=(event:KeyboardEvent)=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.close()}
  else if(event.key==='Tab'){
   const controls=Array.from(this.target?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]);
   const index=controls.indexOf(document.activeElement as HTMLButtonElement);
   const next=index<0?(event.shiftKey?controls.length-1:0):(index+(event.shiftKey?-1:1)+controls.length)%controls.length;
   event.preventDefault();controls[next]?.focus();
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
 async toggle(button:HTMLButtonElement,viewer:string,source:MediaStream|string|undefined){
  if(this.mode){this.close();return}
  const target=button.closest<HTMLElement>('.call-viewer');
  if(!source||!target)return;
  const epoch=++this.epoch;this.target=target;this.viewer=viewer;this.source=source;
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
 sync(source:(viewer:string)=>MediaStream|string|undefined){if(this.viewer&&(source(this.viewer)!==this.source||!this.target?.isConnected))this.close()}
 close(){
  const target=this.target,button=this.button;
  if(!target)return;
  this.epoch++;this.pending=false;
  document.removeEventListener('fullscreenchange',this.fullscreenChanged);
  document.removeEventListener('keydown',this.keydown,true);
  this.target=undefined;this.viewer=undefined;this.source=undefined;this.button=undefined;
  this.mode='';this.changed();
  void this.exit(target);
  if(button?.isConnected)button.focus({preventScroll:true});
 }
}
