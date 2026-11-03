import {test,expect} from '@playwright/test';
import {defaultPanels,readPanelPreferences,savePanelPreferences,panelPreferenceKey,normalizePanels,resolvePanels,editPanel,movePanel,type PanelDefinition} from '../src/panel-preferences';
const defs:PanelDefinition[]=[{id:'form',title:'Simulação',required:true,size:'small',resizable:false},{id:'summary',title:'Resultados',essential:true},{id:'chart',title:'Gráfico',essential:true},{id:'table',title:'Tabela',size:'large'}];
function storage(){const data=new Map<string,string>();return {data,getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>{data.set(k,v)}}}

test('three real modes preserve custom settings and cannot hide essential controls',()=>{
 let p=defaultPanels(defs);expect(resolvePanels(defs,p).filter(d=>d.visible)).toHaveLength(4);
 p=editPanel(p,defs,'chart',{visible:false,size:'large'});p=editPanel(p,defs,'form',{visible:false,size:'large'});
 expect(resolvePanels(defs,p).find(d=>d.id==='chart')?.visible).toBe(false);
 expect(resolvePanels(defs,p).find(d=>d.id==='form')).toMatchObject({visible:true,size:'small'});
 expect(resolvePanels(defs,{...p,mode:'essential'}).filter(d=>d.visible).map(d=>d.id)).toEqual(['form','summary','chart']);
 expect(resolvePanels(defs,{...p,mode:'complete'}).filter(d=>d.visible)).toHaveLength(4);
 expect(resolvePanels(defs,p).find(d=>d.id==='chart')?.size).toBe('large');
});
test('independent areas, browser reload, corrupt recovery and failed writes',()=>{
 const s=storage(),p=editPanel(defaultPanels(defs),defs,'table',{visible:false});
 expect(savePanelPreferences('calculator',p,s)).toBe(true);
 expect(readPanelPreferences('calculator',defs,s).value).toEqual(p);
 expect(readPanelPreferences('market',defs,s).value.mode).toBe('complete');
 s.setItem(panelPreferenceKey('market'),'{broken');
 expect(readPanelPreferences('market',defs,s).notice).toBeTruthy();expect(s.getItem(panelPreferenceKey('market'))).toBe('{broken');
 expect(savePanelPreferences('calculator',p,{getItem:s.getItem,setItem:()=>{throw Error('quota')}})).toBe(false);
 expect(readPanelPreferences('calculator',defs,s).value).toEqual(p);
});
test('module additions, temporarily unavailable modules and forward fields do not discard preferences',()=>{
 const saved={version:1,mode:'custom',panels:[{id:'future-module',visible:false,size:'small'},{id:'chart',visible:false,size:'large'}]};
 const p=normalizePanels(saved,defs);
 expect(p.panels.find(d=>d.id==='future-module')).toMatchObject({visible:false,size:'small'});
 expect(resolvePanels([...defs,{id:'new-module',title:'Novo'}],normalizePanels(p,[...defs,{id:'new-module',title:'Novo'}])).find(d=>d.id==='new-module')?.visible).toBe(true);
 expect(resolvePanels(defs.map(d=>({...d,available:d.id!=='summary'})),p).find(d=>d.id==='summary')?.visible).toBe(false);
 expect(p.panels.find(d=>d.id==='summary')?.visible).toBe(true);
});
test('reordering moves optional modules and restore recreates safe defaults',()=>{
 let p=movePanel(defaultPanels(defs),defs,'table',-1);p=movePanel(p,defs,'table',-1);
 expect(resolvePanels(defs,p).map(d=>d.id)).toEqual(['form','table','summary','chart']);
 expect(resolvePanels(defs,movePanel(p,defs,'form',1)).map(d=>d.id)[0]).toBe('form');
 expect(defaultPanels(defs)).toEqual({version:1,mode:'complete',panels:defs.map(d=>({id:d.id,visible:true,size:d.size||'medium'}))});
 for(const invalid of [null,{version:2,mode:'complete',panels:[]},{version:1,mode:'custom',panels:[{id:'chart',visible:'yes',size:'large'}]}])expect(()=>normalizePanels(invalid,defs)).toThrow();
});
