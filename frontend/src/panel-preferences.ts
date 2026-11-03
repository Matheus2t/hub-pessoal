export type PanelMode='essential'|'complete'|'custom';
export type PanelSize='small'|'medium'|'large';
export interface PanelDefinition {id:string;title:string;required?:boolean;essential?:boolean;available?:boolean;size?:PanelSize;resizable?:boolean;role?:'form'|'chart';hint?:string}
export interface PanelState {id:string;visible:boolean;size:PanelSize}
export interface PanelPreferences {version:1;mode:PanelMode;panels:PanelState[]}
export interface PreferenceStorage {getItem(key:string):string|null;setItem(key:string,value:string):void}
const sizes:PanelSize[]=['small','medium','large'];
export const panelPreferenceKey=(area:string)=>`2t:panels:v1:${area}`;
export function defaultPanels(defs:PanelDefinition[]):PanelPreferences{return {version:1,mode:'complete',panels:defs.map(d=>({id:d.id,visible:true,size:d.size||'medium'}))}}
export function normalizePanels(value:unknown,defs:PanelDefinition[]):PanelPreferences {
 const p=value as PanelPreferences;
 if(!p||p.version!==1||!['essential','complete','custom'].includes(p.mode)||!Array.isArray(p.panels)||p.panels.length>100)throw Error('Invalid panel preferences');
 const seen=new Set<string>(),panels:PanelState[]=[];
 for(const item of p.panels){
  if(!item||typeof item.id!=='string'||!/^[a-z0-9.-]{1,80}$/.test(item.id)||typeof item.visible!=='boolean'||!sizes.includes(item.size))throw Error('Invalid panel entry');
  if(!seen.has(item.id)){panels.push({id:item.id,visible:item.visible,size:item.size});seen.add(item.id)}
 }
 for(const d of defs)if(!seen.has(d.id))panels.push({id:d.id,visible:true,size:d.size||'medium'});
 return {version:1,mode:p.mode,panels}; // Unknown valid IDs survive updates, without becoming visible modules.
}
export function readPanelPreferences(area:string,defs:PanelDefinition[],storage?:PreferenceStorage){
 try{const raw=(storage||window.localStorage).getItem(panelPreferenceKey(area));if(raw&&raw.length>50000)throw Error();return {value:raw?normalizePanels(JSON.parse(raw),defs):defaultPanels(defs),notice:''}}
 catch{return {value:defaultPanels(defs),notice:'Preferências indisponíveis. Usando o layout padrão.'}}
}
export function savePanelPreferences(area:string,prefs:PanelPreferences,storage?:PreferenceStorage){try{(storage||window.localStorage).setItem(panelPreferenceKey(area),JSON.stringify(prefs));return true}catch{return false}}
export function resolvePanels(defs:PanelDefinition[],prefs:PanelPreferences){
 const order=prefs.mode==='custom'?prefs.panels.map(p=>p.id):defs.map(d=>d.id);
 return defs.map(d=>{const saved=prefs.panels.find(p=>p.id===d.id);const intentVisible=!!d.required||prefs.mode==='complete'||(prefs.mode==='essential'?!!d.essential:saved?.visible!==false);return {...d,intentVisible,visible:d.available!==false&&intentVisible,size:prefs.mode==='custom'&&d.resizable!==false?saved?.size||d.size||'medium':d.size||'medium'}}).sort((a,b)=>Number(!!b.required)-Number(!!a.required)||order.indexOf(a.id)-order.indexOf(b.id));
}
export function editPanel(prefs:PanelPreferences,defs:PanelDefinition[],id:string,patch:Partial<Pick<PanelState,'visible'|'size'>>){
 const material=prefs.mode==='custom'?normalizePanels(prefs,defs).panels:resolvePanels(defs,prefs).map(d=>({id:d.id,visible:d.intentVisible,size:d.size}));
 const known=new Set(material.map(p=>p.id));const panels=[...material,...prefs.panels.filter(p=>!known.has(p.id))].map(p=>p.id===id?{...p,...patch}:p);
 return normalizePanels({version:1,mode:'custom',panels},defs);
}
export function movePanel(prefs:PanelPreferences,defs:PanelDefinition[],id:string,direction:number){
 const base=editPanel(prefs,defs,id,{}),movable=resolvePanels(defs,base).filter(d=>!d.required),index=movable.findIndex(d=>d.id===id),target=index+direction;
 if(index<0||target<0||target>=movable.length)return base;
 const a=base.panels.findIndex(p=>p.id===id),b=base.panels.findIndex(p=>p.id===movable[target].id);[base.panels[a],base.panels[b]]=[base.panels[b],base.panels[a]];return base;
}
