import {test,expect} from '@playwright/test';
import {buildSync} from 'esbuild';
import {newCard,schedule,evaluateAnswer,summarize,DAY} from '../src/learn/engine';
import {validateCurriculum} from '../src/learn/content';
import {parseBackup} from '../src/learn/backup';
import type {Attempt,Backup} from '../src/learn/model';
const attempt:Attempt={id:'attempt-1',language:'en',itemId:'hello',skill:'vocabulary',topic:'Cumprimentos',answer:'olá',expected:'olá',correct:true,at:Date.UTC(2026,9,31,12),seconds:12};
test('normalization preserves words and explicit Russian ё policy',()=>{
 expect(evaluateAnswer(' Hello,   world! ',['hello world'])).toBe(true);
 expect(evaluateAnswer('word',['world'])).toBe(false);expect(evaluateAnswer('все',['всё'])).toBe(false);expect(evaluateAnswer('все',['всё'],true)).toBe(true);expect(evaluateAnswer('',['hello'])).toBe(false);expect(evaluateAnswer('I am fine',['I am well','I am fine'])).toBe(true);
});
test('schedule forget, hard and expanding good/easy intervals',()=>{
 const start=newCard('ru','word',0);expect(start.repetitions).toBe(0);const forgotten=schedule(start,0,1000);expect(forgotten.due).toBe(601000);expect(forgotten.repetitions).toBe(0);
 let card=schedule(start,2,0);expect(card.interval).toBe(1);card=schedule(card,2,DAY);expect(card.interval).toBe(6);card=schedule(card,2,7*DAY);expect(card.interval).toBe(15);card=schedule(card,3,22*DAY);expect(card.interval).toBeGreaterThan(15);expect(schedule(card,1,0).interval).toBe(1);
 for(let i=0;i<100;i++)card=schedule(card,0,i);expect(card.ease).toBeGreaterThanOrEqual(1.3);expect(()=>schedule(card,8 as never)).toThrow();
});
test('empty statistics and independent languages use actual events only',()=>{
 expect(summarize('ru',[attempt],[],attempt.at).attempts).toBe(0);expect(summarize('ru',[],[]).accuracy).toBeNull();const r=summarize('en',[attempt],[],attempt.at);expect(r.seconds).toBe(12);expect(r.studied).toBe(1);expect(r.streak).toBe(1);expect(r.mastered).toBe(0);
});
test('backup validates schema, versions, duplicate keys and numeric bounds',()=>{
 const base:Backup={format:'2t-learn',version:1,exportedAt:0,attempts:[attempt],cards:[newCard('en','hello',0)]};
 expect(parseBackup(JSON.stringify(base))).toEqual(base);
 for(const data of [{...base,version:2},{...base,attempts:[attempt,attempt]},{...base,cards:[base.cards[0],base.cards[0]]},{...base,attempts:[{...attempt,seconds:-1}]},{...base,attempts:[{...attempt,language:'xx'}]},{...base,cards:[{...base.cards[0],ease:99}]}])expect(()=>parseBackup(JSON.stringify(data))).toThrow();expect(()=>parseBackup('{')).toThrow();
});
test('real IndexedDB transactions persist, isolate languages and require confirmation',async({page})=>{
 const code=buildSync({entryPoints:['frontend/src/learn/storage.ts'],bundle:true,format:'iife',globalName:'LearnStore',write:false,platform:'browser'}).outputFiles[0].text;
 await page.route('**/learn-storage-test.js',route=>route.fulfill({contentType:'application/javascript',body:code}));
 await page.goto('/');await page.addScriptTag({url:'/learn-storage-test.js'});
 await page.evaluate(async(a)=>{const store=(window as any).LearnStore;const transition=(previous:any)=>({language:'en',itemId:'hello',interval:1,ease:2.5,repetitions:(previous?.repetitions||0)+1,due:86400000,updated:0,lastGrade:2});await store.recordAttempt(a,transition);await store.recordAttempt(a,transition);await store.saveCard({language:'en',itemId:'hello',interval:0,ease:2.5,repetitions:0,due:0,updated:0,lastGrade:null});},attempt);
 await page.reload();await page.addScriptTag({url:'/learn-storage-test.js'});
 const backup=await page.evaluate(async()=>{const store=(window as any).LearnStore;const en=await store.languageProgress('en'),ru=await store.languageProgress('ru');if(en.attempts.length!==1||ru.attempts.length!==0)throw Error('Isolation/dedup failed');return await store.snapshot()});
 expect(backup.attempts).toHaveLength(1);expect(backup.cards[0].repetitions).toBe(1);
 await page.evaluate(async(a)=>{const s=(window as any).LearnStore;try{await s.recordAttempt({...a,id:'invalid-transition'},()=>({broken:true}))}catch{}if((await s.snapshot()).attempts.length!==1)throw Error('Partial write escaped rollback')},attempt);
 const result=await page.evaluate(async(b)=>{const s=(window as any).LearnStore;let refused=false;try{await s.restoreBackup(JSON.stringify(b))}catch{refused=true}await s.restoreBackup(JSON.stringify(b),true);await s.restoreBackup(JSON.stringify(b),true);return {refused,count:(await s.snapshot()).attempts.length}},backup);expect(result).toEqual({refused:true,count:1});
});

test('curriculum rejects duplicated IDs and unknown references',()=>{
 const word={id:'hello',language:'en' as const,word:'hello',translation:'olá',example:'Hello, Ana.',exampleTranslation:'Olá, Ana.',level:'A1' as const,topic:'Cumprimentos',part:'interjeição'};
 const content={language:'en' as const,version:1 as const,words:[word],exercises:[]};validateCurriculum(content);expect(()=>validateCurriculum({...content,words:[word,word]})).toThrow();
 expect(()=>validateCurriculum({...content,exercises:[{id:'question',language:'en',skill:'writing',topic:'Cumprimentos',level:'A1',prompt:'Diga olá.',answers:['hello'],explanation:'Hello é um cumprimento.',wordIds:['missing']}]})).toThrow();
 expect(()=>validateCurriculum({...content,language:'ru',words:[{...word,language:'ru'}]})).toThrow();
});
