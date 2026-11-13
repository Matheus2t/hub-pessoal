import {test,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {serveBuiltSite} from './helpers/serve-built-site';

/** These tests require an actual public (VERCEL=1/LEARN_PUBLIC_BUILD=1) dist. */
test('public Learn keeps language catalogs working but refuses private editorial JSON',async({page})=>{
 await serveBuiltSite(page);
 await page.goto('/#/learn/en');
 await expect(page.locator('.learn-hero__title')).toHaveText('Inglês');
 await page.goto('/#/learn/ru');
 await expect(page.locator('.learn-hero__title')).toHaveText('Russo');
 const unavailable=[
  '/learn/pedagogy-v1/en-pilot.json',
  '/learn/pedagogy-v1/ru-pilot.json',
  '/learn/pedagogy-v1/en-diagnostic.json',
  '/learn/pedagogy-v1/ru-diagnostic.json',
  '/learn/pedagogy-v1/pilot-task-rubrics.json',
  '/learn/pedagogy-v1/en-reading-guide.json',
  '/learn/progression-v12.json',
  '/learn/v13/preview.json',
  '/learn/v19/preview.json',
  '/learn/audio/en-listen-v13-01.mp3',
 ];
 for(const path of unavailable){
  const result=await page.evaluate(async url=>(await fetch(url,{cache:'no-store'})).status,path);
  expect(result,path).toBe(404);
 }
 const approved=await page.evaluate(async()=>({
  en:(await fetch('/learn/en.json')).status,
  ru:(await fetch('/learn/ru.json')).status,
  audio:(await fetch('/learn/pedagogy-v1/audio-assets.json')).status,
 }));
 expect(approved).toEqual({en:200,ru:200,audio:200});
});

test('public hostname and forged preview parameters never unlock V13, V16, V17 or V19',async({page})=>{
 const root=resolve('dist'),types:Record<string,string>={'.js':'text/javascript','.css':'text/css','.json':'application/json','.html':'text/html'};
 await page.route('https://matheus2t.com.br/**',async route=>{
  const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
  const candidate=resolve(root,pathname==='/'?'index.html':pathname.slice(1));
  if(!candidate.startsWith(root+'/')||!existsSync(candidate))return route.fulfill({status:404,body:'Not found'});
  const {readFileSync}=await import('node:fs');
  const ext=candidate.slice(candidate.lastIndexOf('.'));
  return route.fulfill({status:200,contentType:types[ext]||'application/octet-stream',body:readFileSync(candidate)});
 });
 for(const [flag,route,selector] of [
  ['listening-v13','listening-v13','learn-listening-v13-preview'],
  ['reading-v16','reading-b1','learn-reading-v16'],
  ['progress-v17','progress-v17','learn-progression-v17'],
  ['audio-v19','audio-v19','learn-v19-local-preview'],
 ] as const){
  await page.goto(`https://matheus2t.com.br/?learn-preview=${flag}#/learn/en/${route}`);
  await expect(page.locator(selector)).toHaveCount(0);
  await expect(page.getByRole('heading',{name:/Prévia indisponível|Página do Learn não encontrada/})).toBeVisible();
 }
});
