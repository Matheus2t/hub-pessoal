/** Strictly local preferences. Never persist room IDs, invites, credentials or SDP. */
export interface SavedListening {microphone:number;screenAudio:number;muted:boolean}
export type LayoutPreference='regular'|'compact';

const key='2t:call:preferences:v1';
const normalize=(name:string)=>name.trim().slice(0,40).toLocaleLowerCase('pt-BR');
const clamp=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?
 Math.max(0,Math.min(200,Math.round(value))):100;

export class CallPreferences {
 nickname='';
 output='';
 layout:LayoutPreference='regular';
 private levels=new Map<string,SavedListening>();

 constructor(){
  try{
   const record=JSON.parse(localStorage.getItem(key)||'null');
   if(!record||record.version!==1)return;
   if(typeof record.nickname==='string')this.nickname=record.nickname.slice(0,40);
   if(typeof record.output==='string'&&record.output.length<=256)this.output=record.output;
   if(record.layout==='compact')this.layout='compact';
   if(Array.isArray(record.levels)){
    for(const pair of record.levels.slice(-24)){
     if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||pair[0].length>40)continue;
     const level=pair[1];
     if(!level||typeof level!=='object')continue;
     this.levels.set(pair[0],{
      microphone:clamp(level.microphone),screenAudio:clamp(level.screenAudio),muted:level.muted===true
     });
    }
   }
  }catch{/* Storage is optional and can be blocked or corrupted. */}
 }

 rememberName(name:string){this.nickname=name.trim().slice(0,40);this.save()}
 selectOutput(id:string){this.output=id.slice(0,256);this.save()}
 setLayout(layout:LayoutPreference){this.layout=layout;this.save()}
 listening(name:string){return this.levels.get(normalize(name))}
 rememberListening(name:string,levels:SavedListening){
  const id=normalize(name);
  if(!id)return;
  this.levels.delete(id);
  this.levels.set(id,{
   microphone:clamp(levels.microphone),screenAudio:clamp(levels.screenAudio),muted:levels.muted===true
  });
  while(this.levels.size>24)this.levels.delete(this.levels.keys().next().value!);
  this.save();
 }
 private save(){
  try{localStorage.setItem(key,JSON.stringify({
   version:1,nickname:this.nickname,output:this.output,layout:this.layout,levels:[...this.levels]
  }))}catch{/* A full/disabled storage must not affect calls. */}
 }
}
