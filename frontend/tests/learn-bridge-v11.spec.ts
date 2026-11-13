import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {bridgeV11Drafts,bridgeDraftsForLanguage} from '../src/learn/bridge-v11-content';
import {serveBuiltSite} from './helpers/serve-built-site';

test('V11 conserva 24 IDs editoriais únicos e não modifica o catálogo legado',()=>{
 expect(bridgeV11Drafts).toHaveLength(24);
 expect(new Set(bridgeV11Drafts.map(x=>x.draftId)).size).toBe(24);
 expect(bridgeDraftsForLanguage('en')).toHaveLength(12);
 expect(bridgeDraftsForLanguage('ru')).toHaveLength(12);
 expect(bridgeV11Drafts.filter(x=>x.skill==='listening_script')).toHaveLength(4);
 for(const lang of ['en','ru'] as const){
  const catalog=JSON.parse(readFileSync(`frontend/public/learn/${lang}.json`,'utf8'));
  expect(catalog.exercises).toHaveLength(237);
  const oldIds=new Set(catalog.exercises.map((x:{id:string})=>x.id));
  expect(bridgeDraftsForLanguage(lang).every(x=>!oldIds.has(x.draftId))).toBe(true);
  expect(bridgeDraftsForLanguage(lang).filter(x=>x.transition==='A1_to_A2')).toHaveLength(6);
  expect(bridgeDraftsForLanguage(lang).filter(x=>x.transition==='A2_to_B1')).toHaveLength(6);
 }
 expect(bridgeV11Drafts.filter(x=>x.public)).toHaveLength(20);
 expect(bridgeV11Drafts.filter(x=>!x.public&&x.skill==='listening_script')).toHaveLength(4);
 expect(bridgeV11Drafts.every(x=>x.public===(x.skill!=='listening_script')&&x.existingCatalogExercise===false&&
  x.reviewVersion==='v11'&&x.reviewStatus.includes('requires_independent')&&
  x.acceptedAnswerExamples.length>0&&x.scoringCriteria.length>0)).toBe(true);
});

test('V11 está disponível publicamente sem flag e acessível pelos níveis do Learn',async({page})=>{
 await serveBuiltSite(page);
 await page.goto('/#/learn/en');
 await expect(page.getByRole('link',{name:/Atividades-ponte/})).toHaveAttribute('href','#/learn/en/bridges');
 await page.getByRole('link',{name:/Atividades-ponte/}).click();
 await expect(page.locator('learn-bridge-v11').getByRole('heading',{name:'Atividades-ponte'})).toBeVisible();
 await page.goto('/#/learn/ru');
 await expect(page.getByRole('link',{name:/Atividades-ponte/})).toHaveAttribute('href','#/learn/ru/bridges');
 await page.goto('/#/learn/ru/bridges');
 await expect(page.locator('learn-bridge-v11').getByRole('heading',{name:'Atividades-ponte'})).toBeVisible();
 expect(new URL(page.url()).searchParams.has('learn-preview')).toBe(false);
 await page.goto('/#/learn/xx/bridges');
 await expect(page.getByRole('heading',{name:'Página do Learn não encontrada'})).toBeVisible();
});

test('V11 permite usar 20 tarefas formativas sem notas ou histórico',async({page})=>{
 await serveBuiltSite(page);
 await page.goto('/#/learn/en/bridges');
 const panel=page.locator('learn-bridge-v11');
 await expect(panel.getByRole('heading',{name:'Atividades-ponte'})).toBeVisible();
 await expect(panel.getByRole('button',{name:/A1 → A2/})).toHaveAttribute('aria-pressed','true');
 await expect(panel.getByRole('heading',{name:'Formar pergunta com do/does.'})).toBeVisible();
 await expect(panel.getByText('She works here.')).toBeVisible();
 const answer=panel.getByRole('textbox',{name:/Sua resposta/});
 await answer.fill('Does she work here?');
 await panel.getByRole('button',{name:'Conferir exemplos de resposta'}).click();
 await expect(panel.getByRole('heading',{name:'Exemplo de resposta'})).toBeVisible();
 await expect(panel.getByText('Uma resposta diferente pode estar correta')).toBeVisible();
 await expect(panel.getByRole('button',{name:'Verificar resposta'})).toHaveCount(0);
 await panel.getByRole('button',{name:'Próxima'}).click();
 await expect(panel.getByRole('heading',{name:'Ligar pessoa, rotina e horário.'})).toBeVisible();
 await expect(answer).toBeEmpty();
 await expect(panel.getByRole('heading',{name:'Exemplo de resposta'})).toHaveCount(0);
 await panel.getByRole('button',{name:/A2 → B1/}).click();
 await expect(panel.getByRole('heading',{name:'Contrastar evento datado e experiência.'})).toBeVisible();
 const select=panel.getByLabel('Atividade', {exact:true});
 await select.selectOption('en-bridge-v10-09');
 await expect(panel.getByRole('heading',{name:'Identificar justificativa em diálogo.'})).toBeVisible();
 await expect(panel.getByText('Áudio ainda indisponível.')).toBeVisible();
 await expect(panel.locator('learn-audio, learn-recording-player, audio')).toHaveCount(0);
 await expect(panel.locator('textarea')).toHaveCount(0);
 await panel.getByRole('button',{name:'Consultar roteiro de referência'}).click();
 await expect(panel.getByText(/Why didn't you take the plane/)).toBeVisible();
 await page.reload();
 await expect(panel.getByRole('heading',{name:'Formar pergunta com do/does.'})).toBeVisible();
 await expect(panel.locator('textarea')).toBeEmpty();
});

test('V11 russo preserva o conteúdo original e não simula correção de produção escrita',async({page})=>{
 await serveBuiltSite(page);
 await page.goto('/#/learn/ru/bridges');
 const panel=page.locator('learn-bridge-v11');
 await expect(panel.getByRole('heading',{name:'Atividades-ponte'})).toBeVisible();
 await expect(panel.getByRole('button',{name:/A1 → A2/})).toHaveAttribute('aria-pressed','true');
 const select=panel.getByLabel('Atividade',{exact:true});
 await select.selectOption('ru-bridge-v10-03');
 await expect(panel.getByRole('heading',{name:'Encontrar local e rotina em texto curto.'})).toBeVisible();
 await expect(panel.locator('textarea')).toBeVisible();
 await panel.getByRole('button',{name:'Conferir exemplos de resposta'}).click();
 await expect(panel.getByText('Os exemplos são ilustrativos.')).toBeVisible();
 await panel.getByRole('button',{name:/A2 → B1/}).click();
 await select.selectOption('ru-bridge-v10-11');
 await expect(panel.getByText('Áudio ainda indisponível.')).toBeVisible();
 await expect(panel.locator('audio')).toHaveCount(0);
});

test('V11 não provoca overflow horizontal nas telas e temas do Learn',async({page})=>{
 await serveBuiltSite(page);
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:900});
  await page.goto('/#/learn/en/bridges');
  const panel=page.locator('learn-bridge-v11');
  await expect(panel.getByRole('heading',{name:'Atividades-ponte'})).toBeVisible();
  for(const theme of ['dark','light']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   const result=await page.evaluate(()=>({
    actual:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
    panel:document.querySelector('learn-bridge-v11')?.getBoundingClientRect().width,
   }));
   expect(result.actual,`${width}px ${theme}`).toBeLessThanOrEqual(result.viewport);
  }
 }
});
