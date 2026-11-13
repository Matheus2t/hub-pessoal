import {test,expect} from '@playwright/test';
import {existsSync,readFileSync} from 'node:fs';
import {extname,relative,resolve,sep} from 'node:path';

/** Test on a simulated real hostname, NOT localhost (where previews intentionally work). */
test('published Learn offers both legacy languages and V11 but never unlocks V12–V19 drafts',async({page})=>{
 const root=resolve('dist');
 const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp'};
 await page.route('https://matheus2t.com.br/**',async route=>{
  const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
  const file=resolve(root,pathname==='/'?'index.html':pathname.slice(1));
  const inside=relative(root,file);
  if(inside==='..'||inside.startsWith('..'+sep)||!existsSync(file))return route.fulfill({status:404,body:'Not found'});
  return route.fulfill({status:200,contentType:types[extname(file)]||'application/octet-stream',body:readFileSync(file)});
 });
 for(const language of ['en','ru'] as const){
  await page.goto(`https://matheus2t.com.br/#/learn/${language}`);
  await expect(page.locator('.learn-hero__title')).toHaveText(language==='en'?'Inglês':'Russo');
  await page.goto(`https://matheus2t.com.br/#/learn/${language}/bridges`);
  await expect(page.locator('learn-bridge-v11').getByRole('heading',{name:'Atividades-ponte'})).toBeVisible();
 }
 const gated=[
  ['progression-v12','progression','learn-progression'],
  ['listening-v13','listening-v13','learn-listening-v13-preview'],
  ['dictation-v14','dictation-v14','learn-dictation-v14'],
  ['reading-v16','reading-b1','learn-reading-v16'],
  ['progress-v17','progress-v17','learn-progression-v17'],
  ['audio-v19','audio-v19','learn-v19-local-preview'],
 ] as const;
 for(const [flag,route,component] of gated){
  await page.goto(`https://matheus2t.com.br/?learn-preview=${flag}#/learn/en/${route}`);
  await expect(page.getByRole('heading',{name:/Prévia indisponível|Página do Learn não encontrada/}),`Rota pública protegida: ${route}`).toBeVisible();
  await expect(page.locator(component)).toHaveCount(0);
 }
 const names=['/learn/en.json','/learn/ru.json','/learn/pedagogy-v1/audio-assets.json'];
 const allowed=await page.evaluate(async items=>Promise.all(items.map(async path=>(await fetch(path)).status)),names);
 expect(allowed).toEqual([200,200,200]);
 const blocked=['/learn/progression-v12.json','/learn/v13/preview.json','/learn/v14/dictations.json','/learn/v19/preview.json','/learn/audio/en-listen-v13-01.mp3','/learn/pedagogy-v1/en-pilot.json'];
 const denied=await page.evaluate(async items=>Promise.all(items.map(async path=>(await fetch(path)).status)),blocked);
 expect(denied).toEqual(blocked.map(()=>404));
});
