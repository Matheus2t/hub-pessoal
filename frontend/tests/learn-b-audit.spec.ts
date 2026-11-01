import {test,expect,type Page} from '@playwright/test';
import {buildSync} from 'esbuild';
import {readFileSync} from 'node:fs';
import {newCard,schedule,DAY,evaluateAnswer} from '../src/learn/engine';
import type {Backup,Language,Grade} from '../src/learn/model';
import type {Curriculum} from '../src/learn/content';
const catalogs=Object.fromEntries(['en','ru'].map(l=>[l,JSON.parse(readFileSync(`frontend/public/learn/${l}.json`,'utf8')) as Curriculum]));
async function store(page:Page){
 const code=buildSync({entryPoints:['frontend/src/learn/storage.ts'],bundle:true,format:'iife',globalName:'LearnAudit',write:false}).outputFiles[0].text;
 await page.route('**/learn-audit.js',r=>r.fulfill({contentType:'application/javascript',body:code}));
 await page.addScriptTag({url:'/learn-audit.js'});
}
test('catalog review: stable references, Russian gender, ё and accepted variants',()=>{
 for(const l of ['en','ru']){
  const c=catalogs[l];expect(c.words.map(w=>w.id)).toEqual(Array.from({length:150},(_,i)=>`${l}-word-${String(i+1).padStart(3,'0')}`));
  expect(c.phrases!.map(w=>w.id)).toEqual(Array.from({length:50},(_,i)=>`${l}-phrase-${String(i+1).padStart(3,'0')}`));
  for(const [skill,ids] of [['listening',Array.from({length:30},(_,i)=>i+1)],['dictation',[17,...Array.from({length:29},(_,i)=>i+32)]],['writing',Array.from({length:40},(_,i)=>i+61)]] as const)expect(c.exercises.filter(e=>e.skill===skill).map(e=>e.id)).toEqual(ids.map(id=>`${l}-${skill}-${String(id).padStart(3,'0')}`));
  for(const e of c.exercises.filter(e=>['listening','dictation','writing'].includes(e.skill))){const word=c.words.find(w=>w.id===e.wordIds[0])!;expect(word).toBeTruthy();expect(e.level).toBe(word.level);expect(e.topic).toBe(word.topic);if(e.skill==='dictation'){expect(e.answers).toEqual([word.example]);expect(e.audio).toBe(word.example);}for(const a of e.answers)expect(evaluateAnswer(a,e.answers,e.acceptYoAsE)).toBe(true);}
  expect(c.exercises.find(e=>e.id===`${l}-listening-009`)!.answers).toContain('boa noite');
 }
 expect(catalogs.ru.words.find(w=>w.word==='кровать')!.gender).toBe('feminino');
 const yo=catalogs.ru.exercises.find(e=>e.id==='ru-dictation-017')!;expect(evaluateAnswer('Ребенок спит',yo.answers,yo.acceptYoAsE)).toBe(false);expect(evaluateAnswer('  РЕБЁНОК СПИТ! ',yo.answers,yo.acceptYoAsE)).toBe(true);
});
for(const l of ['en','ru'] as Language[])test(`combined vocabulary filters and pagination ${l}`,async({page})=>{
 await page.goto(`/#/learn/${l}/vocabulary`);await expect(page.locator('.learn-word')).toHaveCount(20);
 await page.getByRole('button',{name:'Próxima página'}).click();await expect(page.locator('.learn-pagination')).toContainText('Página 2');
 await page.getByRole('combobox',{name:/^Tema/}).selectOption('Transporte e viagens');await page.getByLabel('Nível').selectOption('A2');
 await expect(page.locator('.learn-word')).toHaveCount(1);await expect(page.locator('.learn-word')).toContainText(l==='en'?'journey':'поездка');
 await page.getByLabel('Buscar palavra ou tradução').fill('viagem');await expect(page.locator('.learn-word')).toHaveCount(1);
 await page.getByLabel('Buscar palavra ou tradução').fill('água');await expect(page.locator('.learn-word')).toHaveCount(0);await expect(page.getByRole('button',{name:'Iniciar prática'})).toBeDisabled();
 await page.getByLabel('Buscar palavra ou tradução').fill('');await page.getByLabel('Nível').selectOption('');await expect(page.locator('.learn-word')).toHaveCount(15);await expect(page.locator('.learn-pagination')).toContainText('Página 1');
 await page.getByRole('combobox',{name:/^Tema/}).selectOption('');await page.getByLabel('Buscar palavra ou tradução').fill('boa noite');await page.getByRole('button',{name:'Iniciar prática'}).click();await page.getByLabel('Sua resposta').fill('Boa noite!');await page.getByRole('button',{name:'Verificar resposta'}).click();await expect(page.locator('.learn-feedback')).toContainText('correto');
});
test('large v1 backup preserves due dates, language isolation and review filters after reload',async({page})=>{
 await page.goto('/#/learn/en');await store(page);const now=Date.now();
 const backup:Backup={format:'2t-learn',version:1,exportedAt:now,attempts:[],cards:[]};
 for(const l of ['en','ru'] as Language[])for(let i=0;i<100;i++){
  const w=catalogs[l].words[i];const c={...newCard(l,w.id,now),repetitions:4,interval:21,lastGrade:2 as Grade,due:now+(i<50?-DAY:DAY)};backup.cards.push(c);
  for(let n=0;n<10;n++)backup.attempts.push({id:`history-${l}-${i}-${n}`,language:l,itemId:w.id,skill:'vocabulary',topic:w.topic,answer:w.translation,expected:w.translation,correct:true,at:now-n*DAY,seconds:5});
 }
 await page.evaluate(async b=>{await (window as any).LearnAudit.restoreBackup(JSON.stringify(b))},backup);
 await page.reload();await store(page);
 const restored=await page.evaluate(async()=> (window as any).LearnAudit.snapshot()) as Backup;
 expect(restored.attempts).toEqual([...backup.attempts].sort((a,b)=>a.id.localeCompare(b.id)));expect(restored.cards).toEqual(backup.cards);
 for(const l of ['en','ru']){
  await page.goto(`/#/learn/${l}/flashcards`);await expect(page.locator('learn-activity')).toContainText('50 itens disponíveis');
  for(const [filter,count] of [['due',50],['future',50],['learning',0],['all',150],['phrases',50]] as const){await page.getByLabel('Tipo de sessão').selectOption(filter);await expect(page.locator('learn-activity')).toContainText(`${count} itens disponíveis`);}
 }
});
for(const l of ['en','ru'] as Language[])test(`all four flash grades persist exactly once ${l}`,async({page})=>{
 await page.goto(`/#/learn/${l}/flashcards`);await page.getByRole('button',{name:'Iniciar prática'}).click();await store(page);
 for(const [grade,label] of ['Esqueci','Difícil','Bom','Fácil'].entries()){
  await page.getByRole('button',{name:'Revelar resposta'}).click();await page.getByRole('button',{name:label,exact:true}).dblclick();await expect(page.locator('.learn-feedback')).toBeVisible();
  const data=await page.evaluate(async()=> (window as any).LearnAudit.snapshot()) as Backup;
  expect(data.attempts).toHaveLength(grade+1);const card=data.cards.find(c=>c.itemId===catalogs[l].words[grade].id)!;expect(card.lastGrade).toBe(grade);
  expect(card.due-card.updated).toBe(Math.round(schedule(newCard(l,card.itemId),grade as Grade).interval*DAY));
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
 }
 await page.reload();await store(page);expect((await page.evaluate(async()=> (window as any).LearnAudit.snapshot())).attempts).toHaveLength(4);
});
test('leaving during delayed write commits original language only, without stale session feedback',async({page})=>{
 await page.addInitScript(()=>{
  const original=IDBFactory.prototype.open;
  IDBFactory.prototype.open=function(...args:Parameters<IDBFactory['open']>){const delay=sessionStorage.getItem('delay-learn')==='yes';if(delay)sessionStorage.removeItem('delay-learn');const r=original.apply(this,args);if(delay)r.addEventListener('success',e=>{e.stopImmediatePropagation();(window as any).releaseLearnWrite=()=>r.onsuccess?.call(r,e)});return r};
 });
 await page.goto('/#/learn/en/flashcards');await page.getByRole('button',{name:'Iniciar prática'}).click();await page.getByRole('button',{name:'Revelar resposta'}).click();
 await page.evaluate(()=>sessionStorage.setItem('delay-learn','yes'));await page.getByRole('button',{name:'Bom',exact:true}).click();await expect.poll(()=>page.evaluate(()=>typeof (window as any).releaseLearnWrite)).toBe('function');
 await page.goto('/#/learn/ru/writing');await page.getByRole('button',{name:'Iniciar prática'}).click();await page.evaluate(()=>(window as any).releaseLearnWrite());
 await store(page);await expect.poll(async()=> (await page.evaluate(async()=> (window as any).LearnAudit.snapshot())).attempts.length).toBe(1);
 const data=await page.evaluate(async()=> (window as any).LearnAudit.snapshot()) as Backup;expect(data.attempts[0].language).toBe('en');expect(data.cards[0].language).toBe('en');await expect(page.locator('.learn-feedback')).toHaveCount(0);await expect(page.getByLabel('Sua resposta')).toHaveValue('');
 await page.reload();await expect(page.locator('learn-activity')).toBeVisible();
});
for(const l of ['en','ru'])test(`audio completion gate, replay and speed ${l}`,async({page})=>{
 await page.addInitScript(l=>{
  const voice={lang:l==='ru'?'ru-RU':'en-US',name:'Controlled',localService:true};
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[voice],cancel:()=>{},addEventListener:()=>{},removeEventListener:()=>{},speak:(u:any)=>{(window as any).audioUtterance=u}}});
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {text:string;constructor(t:string){this.text=t}}});
 },l);
 await page.goto(`/#/learn/${l}/dictation`);await page.getByRole('button',{name:'Iniciar prática'}).click();await page.getByLabel('Velocidade').selectOption('0.5');await page.getByRole('button',{name:'Ouvir / repetir'}).click();
 expect(await page.evaluate(()=>(window as any).audioUtterance.rate)).toBe(.5);await expect(page.getByRole('button',{name:'Verificar resposta'})).toBeDisabled();
 await page.evaluate(()=>(window as any).audioUtterance.onerror());await expect(page.locator('learn-audio')).toContainText('Não foi possível reproduzir');await expect(page.getByRole('button',{name:'Verificar resposta'})).toBeDisabled();
 await page.getByRole('button',{name:'Ouvir / repetir'}).click();await page.evaluate(()=>(window as any).audioUtterance.onend());await expect(page.getByRole('button',{name:'Verificar resposta'})).toBeEnabled();
 await page.getByLabel('Sua resposta').fill(catalogs[l].exercises.find(e=>e.skill==='dictation')!.answers[0]);await page.getByRole('button',{name:'Verificar resposta'}).click();await expect(page.locator('.learn-feedback')).toContainText('correto');await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByRole('button',{name:'Verificar resposta'})).toBeDisabled();
});
