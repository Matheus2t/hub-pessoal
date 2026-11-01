import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {validateCurriculum,type Curriculum} from '../src/learn/content';
const catalogs=Object.fromEntries(['en','ru'].map(l=>[l,JSON.parse(readFileSync(`frontend/public/learn/${l}.json`,'utf8')) as Curriculum]));
for(const language of ['en','ru'])test(`complete ${language} catalog integrity`,()=>{
 const c=catalogs[language];validateCurriculum(c);expect(c.words).toHaveLength(150);expect(c.phrases).toHaveLength(50);
 for(const [skill,count] of [['listening',30],['dictation',30],['writing',40]] as const){const rows=c.exercises.filter(e=>e.skill===skill);expect(rows).toHaveLength(count);expect(new Set(rows.map(e=>e.audio||e.prompt)).size).toBe(count);}
 expect(new Set([...c.words,...c.phrases!].map(w=>w.word.toLowerCase())).size).toBe(200);
});
async function fakeVoice(page:Page,language:string){await page.addInitScript(language=>{
 const voice={lang:language==='ru'?'ru-RU':'en-US',name:'Controlled test voice',localService:true,default:true,voiceURI:'test'};
 Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[voice],cancel:()=>{(window as any).cancelled=((window as any).cancelled||0)+1},addEventListener:()=>{},removeEventListener:()=>{},speak:(u:any)=>{(window as any).spoken=(window as any).spoken||[];(window as any).spoken.push({text:u.text,lang:u.lang});setTimeout(()=>u.onend?.(),0)}}});
 Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {text:string;constructor(t:string){this.text=t}}});
 },language)}
for(const language of ['en','ru'])test(`study, review and audio ${language}`,async({page})=>{
 await fakeVoice(page,language);const c=catalogs[language];
 await page.goto(`/#/learn/${language}/vocabulary`);await expect(page.locator('.learn-word')).toHaveCount(20);
 await page.getByLabel('Buscar palavra ou tradução').fill('água');await expect(page.locator('.learn-word')).toHaveCount(1);await expect(page.locator('.learn-word')).toContainText(language==='en'?'water':'вода');
 await page.getByRole('button',{name:'Iniciar prática'}).click();await page.getByLabel('Sua resposta').fill('água');await page.getByRole('button',{name:'Verificar resposta'}).click();await expect(page.locator('.learn-feedback')).toContainText('correto');await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByRole('heading',{name:'Sessão concluída'})).toBeVisible();await page.reload();await expect(page.locator('.learn-word').first()).toContainText('Nova');
 await page.goto(`/#/learn/${language}/flashcards`);await page.getByRole('button',{name:'Iniciar prática'}).click();await expect(page.locator('.learn-grade')).toHaveCount(0);await page.getByRole('button',{name:'Revelar resposta'}).click();await page.getByRole('button',{name:'Bom',exact:true}).dblclick();await expect(page.locator('.learn-feedback')).toBeVisible();await expect(page.getByRole('button',{name:'Bom',exact:true})).toBeDisabled();
 await page.goto(`/#/learn/${language}`);await expect(page.locator('.learn-progress')).toContainText('100%');await expect(page.locator('.learn-progress dd').first()).toHaveText('2');
 for(const mode of ['listening','dictation','writing']){await page.goto(`/#/learn/${language}/${mode}`);await page.getByRole('button',{name:'Iniciar prática'}).click();const e=c.exercises.find(e=>e.skill===mode)!;
 if(mode!=='writing'){await expect(page.locator('.learn-session')).not.toContainText(`Texto do áudio: ${e.audio}`);await expect(page.getByRole('button',{name:'Verificar resposta'})).toBeDisabled();await page.getByRole('button',{name:'Ouvir / repetir'}).click();await expect(page.getByRole('button',{name:'Verificar resposta'})).toBeEnabled();}
 await page.getByLabel('Sua resposta').fill(mode==='writing'?e.answers.at(-1)!:e.answers[0]);await page.getByRole('button',{name:'Verificar resposta'}).click();await expect(page.locator('.learn-feedback')).toContainText('correto');await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.locator('.learn-session header')).toContainText('2 de');}
 await page.getByRole('button',{name:'Encerrar / voltar às opções'}).click();await page.getByRole('button',{name:'Iniciar prática'}).click();await page.getByRole('button',{name:'Verificar resposta'}).click();await expect(page.getByRole('alert')).toHaveText('Digite uma resposta.');await page.getByLabel('Sua resposta').fill('definitely wrong');await page.getByRole('button',{name:'Verificar resposta'}).click();await expect(page.locator('.learn-feedback')).toContainText('revisar');
 const spoken=await page.evaluate(()=>(window as any).spoken);expect(spoken.every((s:any)=>s.lang.startsWith(language))).toBe(true);expect(await page.evaluate(()=>(window as any).cancelled)).toBeGreaterThan(0);
});
test('no matching voice never completes a listening attempt',async({page})=>{
 await fakeVoice(page,'en');await page.goto('/#/learn/ru/listening');await page.getByRole('button',{name:'Iniciar prática'}).click();await expect(page.locator('learn-audio')).toContainText('Nenhuma voz compatível com russo');await expect(page.getByRole('button',{name:'Ouvir / repetir'})).toBeDisabled();await expect(page.getByRole('button',{name:'Verificar resposta'})).toBeDisabled();await expect(page.locator('.learn-feedback')).toHaveCount(0);
});
test('write failures cannot produce saved feedback; retries remain idempotent',async({page})=>{
 await page.addInitScript(()=>{const original=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(...args:Parameters<IDBDatabase['transaction']>){if(args[1]==='readwrite'&&sessionStorage.getItem('deny-write')==='yes')throw Error('private storage failure');return original.apply(this,args)} as IDBDatabase['transaction']});
 await page.goto('/#/learn/en/writing');await page.getByRole('button',{name:'Iniciar prática'}).click();await page.getByLabel('Sua resposta').fill(catalogs.en.exercises.find(e=>e.skill==='writing')!.answers[0]);
 await page.evaluate(()=>sessionStorage.setItem('deny-write','yes'));await page.getByRole('button',{name:'Verificar resposta'}).click();await expect(page.getByRole('alert')).toContainText('Não foi possível salvar');await expect(page.locator('.learn-feedback')).toHaveCount(0);await expect(page.locator('learn-session')).not.toContainText('private storage failure');
 await page.evaluate(()=>sessionStorage.setItem('deny-write','no'));await page.getByRole('button',{name:'Verificar resposta'}).click();await expect(page.locator('.learn-feedback')).toContainText('correto');await page.getByRole('link',{name:'Encerrar sessão',exact:true}).click();await expect(page.locator('.learn-progress')).toContainText('100%');
 await page.goto('/#/learn/ru');await expect(page.locator('.learn-progress')).toContainText('Sem respostas');
});
for(const width of [1920,1366,768,390,320])test(`study visuals ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});for(const language of ['en','ru']){await fakeVoice(page,language);for(const mode of ['vocabulary','flashcards','listening','dictation','writing']){await page.goto('/#/learn/'+language+'/'+mode);await expect(page.getByRole('button',{name:'Iniciar prática'})).toBeEnabled();if(mode!=='vocabulary')await page.getByRole('button',{name:'Iniciar prática'}).click();if(mode==='flashcards')await page.getByRole('button',{name:'Revelar resposta'}).click();for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`${language}-${mode}-${theme}.png`),animations:'disabled'});}}}
});
