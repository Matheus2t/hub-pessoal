import {test,expect} from '@playwright/test';
import {selectPractice} from '../src/learn/selection';
import {learningPath} from '../src/learn/path';
import {newCard,DAY} from '../src/learn/engine';
import type {Backup,Attempt} from '../src/learn/model';
import en from '../public/learn/en.json';
import type {Curriculum} from '../src/learn/content';
const empty:Backup={format:'2t-learn',version:2,exportedAt:0,attempts:[],cards:[]};
const c=en as Curriculum,now=Date.UTC(2026,10,2),words=c.words;
test('selection prioritizes due/errors, reserves new content, isolates languages and is reproducible',()=>{
 const attempt:Attempt={id:'a',language:'en',itemId:words[0].id,topic:words[0].topic,skill:'vocabulary',answer:'x',expected:'y',correct:false,at:now-DAY,seconds:1};
 const data={...empty,attempts:[attempt],cards:[newCard('en',words[0].id,now-DAY)]};
 const result=selectPractice([...words,...words,{...words[0],id:'ru-other',language:'ru'}],data,'en','mixed',10,now);
 expect(result[0].id).toBe(words[0].id);expect(result[1].id).not.toBe(words[0].id);expect(new Set(result.map(w=>w.id)).size).toBe(10);expect(result.every(w=>w.language==='en')).toBe(true);
 expect(result).toEqual(selectPractice(words,data,'en','mixed',10,now));expect(selectPractice(words,data,'en','new',1,now)[0].id).not.toBe(words[0].id);
 const exposed={...empty,attempts:words.slice(0,10).map((w,i)=>({...attempt,id:`a${i}`,itemId:w.id,correct:true,topic:w.topic}))};
 expect(selectPractice(words,exposed,'en','new',10,now).every(w=>!exposed.attempts.some(a=>a.itemId===w.id))).toBe(true);
});
test('path mastery requires coverage, recent success and distinct days',()=>{
 const e=c.exercises[0],rows=Array.from({length:3},(_,i)=>({id:`p${i}`,language:'en' as const,itemId:e.id,skill:e.skill,topic:e.topic,answer:e.answers[0],expected:e.answers[0],correct:true,at:now-i*DAY,seconds:1}));
 const unit=(d:Backup)=>learningPath(c,d,'en').find(u=>u.exercises.some(q=>q.id===e.id))!;
 expect(unit({...empty,attempts:rows}).mastered).toBe(1);expect(unit({...empty,attempts:rows.map(a=>({...a,at:now}))}).mastered).toBe(0);
 expect(unit({...empty,attempts:[{...rows[0],language:'ru'}]}).coverage).toBe(0);
});
for(const l of ['en','ru'])test(`reading saves due card without credit or duplication; path works ${l}`,async({page})=>{
 await page.goto(`/#/learn/${l}/reading`);await page.locator('.learn-unit-choice').first().click();const add=page.getByRole('button',{name:'Adicionar à revisão'}).first();await add.click();await expect(page.getByRole('button',{name:'Já está na revisão'}).first()).toBeDisabled();await page.reload();await page.locator('.learn-unit-choice').first().click();await expect(page.getByRole('button',{name:'Já está na revisão'}).first()).toBeDisabled();
 const counts=await page.evaluate(async()=>new Promise<{a:number;c:number}>(resolve=>{const r=indexedDB.open('2t-learn');r.onsuccess=()=>{const db=r.result,t=db.transaction(['attempts','cards']);let a=0,c=0;const x=t.objectStore('attempts').count(),y=t.objectStore('cards').count();x.onsuccess=()=>a=x.result;y.onsuccess=()=>c=y.result;t.oncomplete=()=>{db.close();resolve({a,c})}}}));expect(counts).toEqual({a:0,c:1});
 await page.goto(`/#/learn/${l}/path`);await expect(page.getByRole('heading',{name:'Trilha de aprendizado'})).toBeVisible();await page.getByRole('button',{name:'Estudar unidade'}).first().click();await expect(page.locator('learn-session')).toBeVisible();
});
