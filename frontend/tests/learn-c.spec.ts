import {test,expect,type Page} from '@playwright/test';
import {buildSync} from 'esbuild';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
import {validateCurriculum,type Curriculum} from '../src/learn/content';
import {difficultTopics,errorItems} from '../src/learn/recovery';
import type {Attempt,Language} from '../src/learn/model';
const catalogs=Object.fromEntries(['en','ru'].map(l=>[l,JSON.parse(readFileSync(`frontend/public/learn/${l}.json`,'utf8')) as Curriculum]));
async function storage(page:Page){const code=buildSync({entryPoints:['frontend/src/learn/storage.ts'],bundle:true,format:'iife',globalName:'LearnC',write:false}).outputFiles[0].text;await page.route('**/learn-c-store.js',r=>r.fulfill({contentType:'application/javascript',body:code}));await page.addScriptTag({url:'/learn-c-store.js'});}
for(const l of ['en','ru'] as Language[])test(`C content and all B identifiers preserved ${l}`,()=>{
 const c=catalogs[l],base=JSON.parse(execFileSync('git',['show',`f2ab5f8:frontend/public/learn/${l}.json`],{encoding:'utf8'}));validateCurriculum(c);
 for(const key of ['words','phrases','exercises'] as const)for(const row of base[key])expect(c[key]!.some(e=>e.id===row.id)).toBe(true);
 expect(c.readings).toHaveLength(15);expect(c.lessons).toHaveLength(15);for(const skill of ['reading','grammar','test'])expect(c.exercises.filter(e=>e.skill===skill)).toHaveLength(skill==='test'?35:45);
 expect(new Set(c.readings!.map(r=>r.text)).size).toBe(15);expect(new Set(c.lessons!.map(r=>r.explanation)).size).toBe(15);
 for(const u of [...c.readings!,...c.lessons!])expect(u.questionIds).toHaveLength(3);
 expect(()=>validateCurriculum({...c,readings:[{...c.readings![0],questionIds:['missing']}]})).toThrow();
});
for(const l of ['en','ru'] as Language[])for(const mode of ['reading','grammar'] as const)test(`${mode} answers persist and opening never completes ${l}`,async({page})=>{
 const c=catalogs[l],unit=mode==='reading'?c.readings![0]:c.lessons![0];
 await page.goto(`/#/learn/${l}/${mode}`);await page.getByRole('button',{name:new RegExp(unit.title)}).click();await storage(page);expect((await page.evaluate(async()=> (window as any).LearnC.snapshot())).attempts).toHaveLength(0);
 if(mode==='reading'){await page.getByText('Tradução de apoio',{exact:true}).click();await expect(page.locator('.learn-prose')).toContainText(unit.translation);}
 await page.getByRole('button',{name:'Responder questões'}).click();
 for(const id of unit.questionIds){const e=c.exercises.find(e=>e.id===id)!;await page.getByLabel('Sua resposta').fill(e.answers[0]);await page.getByRole('button',{name:'Verificar resposta'}).click();await expect(page.locator('.learn-feedback')).toContainText('correto');await page.getByRole('button',{name:'Continuar',exact:true}).click();}
 await expect(page.getByRole('heading',{name:'Sessão concluída'})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:new RegExp(unit.title)})).toContainText('3/3 questões respondidas');
});
for(const l of ['en','ru'] as Language[])test(`assessment draft reload, atomic completion, dedup and new attempt ${l}`,async({page})=>{
 const qs=catalogs[l].exercises.filter(e=>e.skill==='test').slice(0,30);await page.goto(`/#/learn/${l}/test`);await page.getByRole('button',{name:'Iniciar avaliação'}).click();await storage(page);
 await page.getByRole('button',{name:'Finalizar avaliação'}).click();await expect(page.getByRole('alert')).toContainText('Responda todas');
 for(let i=0;i<qs.length;i++){await page.getByLabel('Sua resposta').fill(qs[i].answers[0]);if(i===1){await page.reload();await expect(page.getByLabel('Sua resposta')).toHaveValue(qs[i].answers[0]);await storage(page);expect((await page.evaluate(async()=> (window as any).LearnC.snapshot())).attempts).toHaveLength(0);}
 if(i<qs.length-1)await page.getByRole('button',{name:'Próxima questão',exact:true}).click();}
 await expect(page.getByRole('heading',{name:'Correção',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Finalizar avaliação'}).dblclick();await expect(page.getByRole('heading',{name:'Resultado',exact:true})).toBeVisible();await expect(page.locator('learn-assessment')).toContainText('30 questões · 30 acertos · 0 erros · 100%');
 await page.reload();await storage(page);expect((await page.evaluate(async()=> (window as any).LearnC.snapshot())).attempts).toHaveLength(30);await expect(page.getByRole('heading',{name:'Resultado',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Nova avaliação'}).click();await page.goto(`/#/learn/${l==='en'?'ru':'en'}`);await expect(page.locator('.learn-progress')).toContainText('Sem respostas');
});
test('error notebook preserves missing content and prioritizes recurring real difficulties',async({page})=>{
 await page.goto('/#/learn/en/errors');await expect(page.locator('learn-errors')).toContainText('Nenhum erro');await storage(page);const e=catalogs.en.exercises.find(e=>e.skill==='writing')!;
 const attempt=(id:string,itemId:string,correct=false):Attempt=>({id,language:'en',itemId,skill:'writing',topic:e.topic,answer:correct?e.answers[0]:'wrong',expected:e.answers[0],correct,at:Date.now(),seconds:2});
 const rows=[attempt('error1',e.id),attempt('error2',e.id),attempt('error3',e.id),attempt('missing','removed-item')];
 expect(difficultTopics('ru',rows)).toEqual([]);expect(difficultTopics('en',rows)[0].total).toBe(4);expect(errorItems('en',rows)[0].errors).toHaveLength(3);
 await page.evaluate(async rows=>{for(const a of rows)await (window as any).LearnC.recordAttempt(a)},rows);await page.reload();await expect(page.locator('learn-errors')).toContainText('Conteúdo original indisponível');
 await page.goto('/#/learn/en/targeted');await page.getByRole('button',{name:'Revisar meus erros'}).click();await page.getByLabel('Sua resposta').fill(e.answers[0]);await page.getByRole('button',{name:'Verificar resposta'}).click();await expect(page.locator('.learn-feedback')).toContainText('correto');
 await page.goto('/#/learn/en/errors');await expect(page.locator('learn-errors')).toContainText('Corrigido posteriormente');await expect(page.locator('learn-errors')).toContainText('3 erros');await page.getByRole('combobox',{name:/^Histórico/}).selectOption('pending');await expect(page.locator('learn-errors')).not.toContainText('Corrigido posteriormente');
});
test('assessment rollback and failed finalization never expose saved results',async({page})=>{
 await page.goto('/#/learn/en');await storage(page);
 const result=await page.evaluate(async()=>{const s=(window as any).LearnC,original=IDBObjectStore.prototype.add;let calls=0;IDBObjectStore.prototype.add=function(...args:Parameters<IDBObjectStore['add']>){if(++calls===2)throw new DOMException('write failed');return original.apply(this,args)};let rejected=false;try{await s.recordAssessment([1,2,3].map(n=>({id:`batch-${n}`,itemId:`en-test-0${n}`,language:'en',skill:'test',topic:'Test',answer:'a',expected:'a',correct:true,at:Date.now(),seconds:1})))}catch{rejected=true}finally{IDBObjectStore.prototype.add=original}return {rejected,count:(await s.snapshot()).attempts.length}});expect(result).toEqual({rejected:true,count:0});
});
for(const width of [1920,1366,768,390,320])test(`C visual and keyboard ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});for(const l of ['en','ru'])for(const mode of ['reading','grammar','test','errors','targeted']){await page.goto(`/#/learn/${l}/${mode}`);if(['reading','grammar'].includes(mode))await page.locator('.learn-unit-choice').first().click();if(mode==='test')await page.getByRole('button',{name:'Iniciar avaliação'}).click();for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`${l}-${mode}-${theme}.png`),animations:'disabled'});}await page.locator('main a').first().focus();await expect(page.locator('main a').first()).toBeFocused();}
});
