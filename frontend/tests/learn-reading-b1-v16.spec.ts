import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {readingB1V16For,readingB1V16Units} from '../src/learn/reading-b1-v16-content';
import {isLearnReadingV16PreviewEnabled} from '../src/learn/pilot-preview';
import {serveBuiltSite} from './helpers/serve-built-site';

test('V16 preserva 10 textos, 40 questões, 10 tarefas de escrita e todos os IDs legados',()=>{
 expect(readingB1V16Units).toHaveLength(10);
 expect(readingB1V16For('en')).toHaveLength(5);
 expect(readingB1V16For('ru')).toHaveLength(5);
 const ids=readingB1V16Units.flatMap(u=>[u.id,u.transferTask.id,...u.questions.map(q=>q.id)]);
 expect(new Set(ids).size).toBe(60);
 expect(readingB1V16Units.every(u=>u.level==='B1'&&u.public===false&&
  u.questions.length===4&&u.transferTask.useForReadingMastery===false)).toBe(true);
 expect(readingB1V16Units.flatMap(u=>u.questions)).toHaveLength(40);
 expect(readingB1V16Units.flatMap(u=>u.questions).filter(q=>q.kind==='single_choice')).toHaveLength(20);
 expect(readingB1V16Units.flatMap(u=>u.questions).filter(q=>q.kind==='open_response')).toHaveLength(20);
 for(const lang of ['en','ru'] as const){
  const catalog=JSON.parse(readFileSync(`frontend/public/learn/${lang}.json`,'utf8'));
  expect(catalog.exercises).toHaveLength(237);
  const oldIds=new Set([
   ...catalog.exercises.map((x:{id:string})=>x.id),
   ...catalog.readings.map((x:{id:string})=>x.id),
  ]);
  for(const unit of readingB1V16For(lang)){
   expect(oldIds.has(unit.legacyReadingId)).toBe(true);
   expect(oldIds.has(unit.id)).toBe(false);
   expect(oldIds.has(unit.transferTask.id)).toBe(false);
   expect(unit.questions.every(q=>!oldIds.has(q.id)&&q.evidenceSpans.length>0)).toBe(true);
   expect(unit.questions.every(q=>q.kind==='single_choice'
    ?q.optionsPt.length===3&&q.optionsPt.some(o=>o.id===q.correctOptionId)
    :q.illustrativeAnswerPt!==null&&q.correctOptionId===null)).toBe(true);
  }
 }
});

test('V16 exige localhost e opt-in, mantendo a página pública bloqueada',async({page})=>{
 expect(isLearnReadingV16PreviewEnabled('matheus2t.com.br','?learn-preview=reading-v16')).toBe(false);
 expect(isLearnReadingV16PreviewEnabled('localhost','')).toBe(false);
 expect(isLearnReadingV16PreviewEnabled('localhost','?learn-preview=reading-v16')).toBe(true);
 expect(isLearnReadingV16PreviewEnabled('127.0.0.1','?learn-preview=reading-v16')).toBe(true);
 await serveBuiltSite(page);
 await page.goto('/#/learn/en/reading-b1');
 await expect(page.getByRole('heading',{name:'Prévia indisponível'})).toBeVisible();
 await expect(page.locator('learn-reading-v16')).toHaveCount(0);
 await page.goto('/#/learn/ru/reading-b1');
 await expect(page.getByRole('heading',{name:'Prévia indisponível'})).toBeVisible();
});

test('V16 inglês permite responder, concluir, consultar evidências e avançar sem notas',async({page})=>{
 await serveBuiltSite(page);
 await page.goto('/?learn-preview=reading-v16#/learn/en');
 await page.getByRole('link',{name:/Leitura B1 V16/}).click();
 const panel=page.locator('learn-reading-v16');
 await expect(panel.getByRole('heading',{name:'Leitura e interpretação B1'})).toBeVisible();
 await expect(panel.getByRole('heading',{name:'A workshop that changed its plan'})).toBeVisible();
 await expect(panel.locator('.learn-reading-v16__text p')).toHaveCount(2);
 await expect(panel.locator('.learn-reading-v16__question')).toHaveCount(4);
 const submit=panel.getByRole('button',{name:'Concluir interpretação'});
 await expect(submit).toBeDisabled();
 const cards=panel.locator('.learn-reading-v16__question');
 await cards.nth(0).getByRole('radio').nth(2).check();
 await cards.nth(1).getByRole('textbox',{name:'Sua interpretação'}).fill('They can prepare tools before the visit.');
 await cards.nth(2).getByRole('radio').nth(0).check();
 await cards.nth(3).getByRole('textbox',{name:'Sua interpretação'}).fill('They will split the workshop and prepare tools.');
 await expect(submit).toBeEnabled();
 await expect(panel.getByText('Referência editorial (não homologada)')).toHaveCount(0);
 await submit.click();
 await expect(panel.getByText('Referência editorial (não homologada)')).toHaveCount(4);
 await expect(panel.getByText('Leitura concluída nesta aba. Nenhuma nota foi atribuída ou armazenada.')).toBeVisible();
 await panel.getByRole('button',{name:'Consultar critérios de escrita'}).click();
 await expect(panel.getByRole('heading',{name:'Escrita de transferência'})).toBeVisible();
 await expect(panel.locator('.learn-reading-v16__transfer li')).toHaveCount(3);
 await panel.getByRole('button',{name:'Próximo'}).click();
 await expect(panel.getByRole('heading',{name:'A library tries a new schedule'})).toBeVisible();
 await expect(panel.getByText('Referência editorial (não homologada)')).toHaveCount(0);
 await expect(panel.getByRole('button',{name:'Concluir interpretação'})).toBeDisabled();
 await page.reload();
 await expect(panel.getByRole('heading',{name:'A workshop that changed its plan'})).toBeVisible();
 await expect(submit).toBeDisabled();
});

test('V16 russo oferece todos os textos e mantém a escrita como atividade separada',async({page})=>{
 await serveBuiltSite(page);
 await page.goto('/?learn-preview=reading-v16#/learn/ru/reading-b1');
 const panel=page.locator('learn-reading-v16');
 await expect(panel.getByRole('heading',{name:'Книги для соседей'})).toBeVisible();
 await expect(panel.locator('.learn-reading-v16__question')).toHaveCount(4);
 await expect(panel.getByText('A escrita livre exige revisão humana')).toBeVisible();
 const select=panel.getByLabel('Texto B1');
 await expect(select.locator('option')).toHaveCount(5);
 await select.selectOption('ru-reading-b1-v16-05');
 await expect(panel.locator('.learn-reading-v16__text')).toBeVisible();
 await expect(panel.locator('.learn-reading-v16__question')).toHaveCount(4);
 await expect(panel.getByRole('button',{name:'Concluir interpretação'})).toBeDisabled();
 await expect(panel.locator('.learn-reading-v16__transfer textarea')).toHaveCount(1);
});

test('V16 sem overflow horizontal em mobile/tablet/desktop nos dois temas',async({page})=>{
 await serveBuiltSite(page);
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:900});
  await page.goto('/?learn-preview=reading-v16#/learn/ru/reading-b1');
  await expect(page.locator('learn-reading-v16').getByRole('heading',{name:'Leitura e interpretação B1'})).toBeVisible();
  for(const theme of ['dark','light']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   const dims=await page.evaluate(()=>({
    actual:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth
   }));
   expect(dims.actual,`${width}px ${theme}`).toBeLessThanOrEqual(dims.viewport);
  }
 }
});
