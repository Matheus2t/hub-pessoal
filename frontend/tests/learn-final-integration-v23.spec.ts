import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {Exercise} from '../src/learn/content';
import {serveBuiltSite} from './helpers/serve-built-site';

/** Final end-to-end integration: a real browser, local IndexedDB and the backup UI. */
test('EN/RU responses survive navigation, export and atomic v3 restoration without crossing languages',async({page})=>{
 await serveBuiltSite(page);
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 const saved:Array<{language:'en'|'ru';id:string;answer:string}>=[];
 for(const language of ['en','ru'] as const){
  await page.goto(`/#/learn/${language}/writing`);
  await page.getByRole('button',{name:'Iniciar prática'}).click();
  const session=page.locator('learn-session');
  const exercise=await session.evaluate(el=>(el as unknown as {exercises:Exercise[]}).exercises[0]);
  expect(exercise.language).toBe(language);
  expect(exercise.skill).toBe('writing');
  await session.getByRole('textbox',{name:'Sua resposta'}).fill(exercise.answers[0]);
  await session.getByRole('button',{name:'Verificar resposta'}).click();
  await expect(session.locator('.learn-feedback')).toContainText('encontrada nas opções cadastradas');
  await expect(session.locator('.learn-feedback')).toBeFocused();
  saved.push({language,id:exercise.id,answer:exercise.answers[0]});
  await page.goto(`/#/learn/${language}`);
  await expect(page.locator('.learn-summary dl div').first().locator('dd')).toHaveText('1');
 }
 await page.goto('/#/learn/en/backup');
 await expect(page.getByRole('heading',{name:'Backup local'})).toBeVisible();
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'Baixar backup JSON'}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/^2t-learn-\d{4}-\d{2}-\d{2}\.json$/);
 const filePath=await download.path();
 expect(filePath).not.toBeNull();
 const backupRaw=readFileSync(filePath!,'utf8');
 const backup=JSON.parse(backupRaw);
 expect(backup.format).toBe('2t-learn');
 expect(backup.version).toBe(3);
 expect(backup.attempts).toHaveLength(2);
 for(const row of saved){
  expect(backup.attempts).toContainEqual(expect.objectContaining({
   language:row.language,itemId:row.id,answer:row.answer,correct:true
  }));
 }
 expect(backup.attempts.every((a:{assessmentOutcome?:string})=>a.assessmentOutcome===undefined)).toBe(true);

 // Add another attempt, then restore the earlier file to confirm replacement,
 // not an implicit merge or a partial overwrite.
 await page.goto('/#/learn/en/writing');
 await page.getByRole('button',{name:'Iniciar prática'}).click();
 await page.getByRole('textbox',{name:'Sua resposta'}).fill('This unknown answer is not an approved translation.');
 await page.getByRole('button',{name:'Verificar resposta'}).click();
 await expect(page.locator('learn-session .learn-feedback')).toContainText('resultado incerto');
 await page.goto('/#/learn/en/backup');
 await page.locator('learn-backup input[type=file]').setInputFiles({
  name:'learn-integrated-v23.json',mimeType:'application/json',buffer:Buffer.from(backupRaw)
 });
 const dialog=page.getByRole('dialog',{name:'Substituir dados do Learn?'});
 await expect(dialog).toBeVisible();
 await expect(dialog).toContainText('2 tentativas');
 await expect(dialog.getByRole('button',{name:'Restaurar e substituir'})).toBeDisabled();
 await dialog.getByLabel('Confirmo substituir os dados dos dois idiomas').check();
 await dialog.getByRole('button',{name:'Restaurar e substituir'}).click();
 await expect(dialog).toHaveCount(0);
 await expect(page.getByRole('status').filter({hasText:'Backup restaurado'})).toBeVisible();

 for(const language of ['en','ru'] as const){
  await page.goto(`/#/learn/${language}`);
  await expect(page.locator('.learn-summary dl div').first().locator('dd')).toHaveText('1');
 }
 await page.reload();
 await expect(page.locator('.learn-summary dl div').first().locator('dd')).toHaveText('1');
 const stored=await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
   const request=indexedDB.open('2t-learn',3);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  const values=await new Promise<unknown[]>((resolve,reject)=>{
   const request=db.transaction('attempts','readonly').objectStore('attempts').getAll();
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  db.close();
  return {version:3,attempts:values};
 });
 expect(stored.attempts).toHaveLength(2);
 expect((stored.attempts as Array<{language:string}>).map(a=>a.language).sort()).toEqual(['en','ru']);
 expect(errors).toEqual([]);
});

test('publicly available V11 stays formatively usable without creating evaluated records',async({page})=>{
 await serveBuiltSite(page);
 for(const language of ['en','ru'] as const){
  await page.goto(`/#/learn/${language}/bridges`);
  const panel=page.locator('learn-bridge-v11');
  await expect(panel.getByRole('heading',{name:'Atividades-ponte'})).toBeVisible();
  await expect(panel.getByRole('textbox',{name:/Sua resposta/})).toBeVisible();
  await panel.getByRole('textbox',{name:/Sua resposta/}).fill('Resposta de prática');
  await panel.getByRole('button',{name:'Conferir exemplos de resposta'}).click();
  await expect(panel.getByRole('heading',{name:'Exemplo de resposta'})).toBeVisible();
  await expect(panel.getByText('Uma resposta diferente pode estar correta')).toBeVisible();
  await expect(panel.getByRole('button',{name:'Verificar resposta'})).toHaveCount(0);
 }
 const counts=await page.evaluate(async()=>{
  const request=indexedDB.open('2t-learn',3);
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error);
  });
  const count=await new Promise<number>((resolve,reject)=>{
   const q=db.transaction('attempts','readonly').objectStore('attempts').count();
   q.onsuccess=()=>resolve(q.result);
   q.onerror=()=>reject(q.error);
  });
  db.close();return count;
 });
 expect(counts).toBe(0);
});
