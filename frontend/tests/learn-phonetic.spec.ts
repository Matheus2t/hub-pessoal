import {test,expect} from '@playwright/test';
import {PhoneticBuffer,transliterate} from '../src/learn/phonetic';
import {answerLanguage,type Curriculum} from '../src/learn/content';
import {readFileSync} from 'node:fs';
const ru=JSON.parse(readFileSync('frontend/public/learn/ru.json','utf8')) as Curriculum;

test('phonetic alphabet, digraphs, capitals and original Cyrillic are deterministic',()=>{
  expect(transliterate('privet').value).toBe('привет');
  expect(transliterate('spasibo').value).toBe('спасибо');
  expect(transliterate('moy novyy').value).toBe('мой новый');
  expect(transliterate('joga').value).toBe('йога');
  expect(transliterate('G').value).toBe('Г');
  expect(transliterate('Sh shch zh ch ya yu yo').value).toBe('Ш щ ж ч я ю ё');
  expect(transliterate('Privet, мир!').value).toBe('Привет, мир!');
  expect(transliterate('shch',false).value).toBe('shch');
});
test('editor model supports merged letters, backspace, forward delete and selection replace',()=>{
  const b=new PhoneticBuffer();
  expect(b.edit('insertText','s',0,0).value).toBe('с');
  expect(b.edit('insertText','h',1,1)).toMatchObject({value:'ш',position:1});
  expect(b.edit('deleteContentBackward',null,1,1).value).toBe('');
  expect(b.undo().value).toBe('ш');
  expect(b.redo().value).toBe('');
  b.external('privet');
  expect(b.value).toBe('привет');
  expect(b.edit('insertText','g',3,4).value).toBe('пригет');
  expect(b.undo().value).toBe('привет');
  expect(b.redo().value).toBe('пригет');
  expect(b.edit('deleteContentForward',null,0,0).value).toBe('ригет');
  expect(b.edit('insertFromPaste','мир',0,0).value).toBe('мирригет');
});
test('phonetic editor obeys length, multiline insertion and on/off preference',()=>{
  const b=new PhoneticBuffer('shch');
  expect(b.value).toBe('щ');
  expect(b.edit('insertText','g',1,1,1)).toMatchObject({value:'щ',changed:false});
  expect(b.edit('insertLineBreak',null,1,1).value).toBe('щ\n');
  expect(b.setEnabled(false).value).toBe('щ\n');
  expect(b.edit('insertText','g',2,2).value).toBe('щ\ng');
  expect(b.setEnabled(true).value).toBe('щ\nг');
});
test('target language protects Portuguese translation fields',()=>{
  const vocabulary=ru.exercises.find(e=>e.skill==='listening')!;
  const writing=ru.exercises.find(e=>e.skill==='writing')!;
  expect(answerLanguage(vocabulary)).toBe('pt-BR');
  expect(answerLanguage(writing)).toBe('ru');
});

test('Russian input maps physical US keys and preserves caret on internal changes',async({page})=>{
  await page.goto('/#/learn/ru/test');
  await page.getByRole('button',{name:'Iniciar avaliação'}).click();
  const i=ru.exercises.filter(e=>e.skill==='test').slice(0,30).findIndex(e=>answerLanguage(e)==='ru');
  expect(i).toBeGreaterThanOrEqual(0);
  await page.getByRole('button',{name:new RegExp('^Questão '+(i+1)+'(?: respondida)?$')}).click();
  const field=page.getByRole('textbox',{name:'Sua resposta'});
  await expect(page.locator('learn-phonetic-editor')).toBeVisible();
  await expect(page.getByRole('button',{name:'Fonético ligado'})).toHaveAttribute('aria-pressed','true');
  await field.click();
  await page.keyboard.type('privet');
  await expect(field).toHaveValue('привет');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('shch');
  await expect(field).toHaveValue('щ');
  await page.keyboard.press('Backspace');
  await expect(field).toHaveValue('');
  await page.keyboard.type('g');
  await expect(field).toHaveValue('г');
  await page.keyboard.press('ControlOrMeta+Z');
  await expect(field).toHaveValue('');
  await page.keyboard.press('ControlOrMeta+Y');
  await expect(field).toHaveValue('г');
  await page.getByRole('button',{name:'Inserir ь'}).click();
  await expect(field).toHaveValue('гь');
  await page.reload();
  await page.getByRole('button',{name:new RegExp('^Questão '+(i+1)+'(?: respondida)?$')}).click();
  await expect(page.getByRole('textbox',{name:'Sua resposta'})).toHaveValue('гь');
});
test('cursor edits, selected text, clipboard and native Cyrillic work on assessment',async({page})=>{
  await page.goto('/#/learn/ru/test');
  await page.getByRole('button',{name:'Iniciar avaliação'}).click();
  const i=ru.exercises.filter(e=>e.skill==='test').slice(0,30).findIndex(e=>answerLanguage(e)==='ru');
  await page.getByRole('button',{name:new RegExp('^Questão '+(i+1)+'(?: respondida)?$')}).click();
  const field=page.getByRole('textbox',{name:'Sua resposta'});
  await field.fill('privet');
  await expect(field).toHaveValue('привет');
  await field.evaluate((el:HTMLTextAreaElement)=>{el.focus();el.setSelectionRange(3,4)});
  await page.keyboard.type('g');
  await expect(field).toHaveValue('пригет');
  await field.evaluate((el:HTMLTextAreaElement)=>{el.focus();el.setSelectionRange(0,0)});
  await page.keyboard.press('Delete');
  await expect(field).toHaveValue('ригет');
  await field.fill('мир');
  await expect(field).toHaveValue('мир');
  await field.evaluate((el:HTMLTextAreaElement)=>{el.focus();el.setSelectionRange(3,3);const dt=new DataTransfer();dt.setData('text/plain',' spasibo');el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt}))});
  await expect(field).toHaveValue('мир спасибо');
});
test('toggle and Portuguese/English exercises remain unchanged',async({page})=>{
  await page.goto('/#/learn/ru/test');
  await page.getByRole('button',{name:'Iniciar avaliação'}).click();
  await expect(page.locator('learn-phonetic-editor')).toHaveCount(0);
  await page.getByLabel('Sua resposta').fill('farmácia');
  await expect(page.getByLabel('Sua resposta')).toHaveValue('farmácia');
  const i=ru.exercises.filter(e=>e.skill==='test').slice(0,30).findIndex(e=>answerLanguage(e)==='ru');
  await page.getByRole('button',{name:new RegExp('^Questão '+(i+1)+'(?: respondida)?$')}).click();
  const field=page.getByRole('textbox',{name:'Sua resposta'});
  await page.getByRole('button',{name:'Fonético ligado'}).click();
  await expect(page.getByRole('button',{name:'Fonético desligado'})).toHaveAttribute('aria-pressed','false');
  await field.fill('privet');
  await expect(field).toHaveValue('privet');
  await page.getByRole('button',{name:'Fonético desligado'}).click();
  await expect(field).toHaveValue('привет');
  await page.goto('/#/learn/en/writing');
  await page.getByRole('button',{name:'Iniciar prática'}).click();
  await expect(page.locator('learn-phonetic-editor')).toHaveCount(0);
});
test('Russian writing sessions use phonetic mode for Cyrillic without touching review events',async({page})=>{
  await page.goto('/#/learn/ru/writing');
  await page.getByRole('button',{name:'Iniciar prática'}).click();
  const editor=page.locator('learn-phonetic-editor');
  await expect(editor).toBeVisible();
  const field=editor.getByRole('textbox',{name:'Sua resposta'});
  await field.fill('privet');
  await expect(field).toHaveValue('привет');
  await field.fill(ru.exercises.find(e=>e.skill==='writing')!.answers[0]);
  await page.getByRole('button',{name:'Verificar resposta'}).click();
  await expect(page.locator('.learn-feedback')).toContainText('encontrada nas opções cadastradas');
});

test('IME composition, manual signs and small-screen layout remain usable',async({page})=>{
  await page.setViewportSize({width:320,height:750});
  await page.goto('/#/learn/ru/test');
  await page.getByRole('button',{name:'Iniciar avaliação'}).click();
  const i=ru.exercises.filter(e=>e.skill==='test').slice(0,30).findIndex(e=>answerLanguage(e)==='ru');
  await page.getByRole('button',{name:new RegExp('^Questão '+(i+1)+'(?: respondida)?$')}).click();
  const field=page.getByRole('textbox',{name:'Sua resposta'});
  await field.evaluate((el:HTMLTextAreaElement)=>{
    el.focus();
    el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
    el.value='мир';
    el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:'мир',isComposing:true}));
    el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'мир'}));
  });
  await expect(field).toHaveValue('мир');
  await page.getByRole('button',{name:'Inserir ъ'}).click();
  await expect(field).toHaveValue('миръ');
  for(const theme of ['dark','light']){
    await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});
test('phonetic preference survives reload and does not change English',async({page})=>{
  await page.goto('/#/learn/ru/writing');
  await page.getByRole('button',{name:'Iniciar prática'}).click();
  await page.getByRole('button',{name:'Fonético ligado'}).click();
  await expect(page.getByRole('button',{name:'Fonético desligado'})).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name:'Iniciar prática'}).click();
  await expect(page.getByRole('button',{name:'Fonético desligado'})).toBeVisible();
  await page.getByLabel('Sua resposta').fill('privet');
  await expect(page.getByLabel('Sua resposta')).toHaveValue('privet');
  await page.goto('/#/learn/en/writing');
  await page.getByRole('button',{name:'Iniciar prática'}).click();
  await expect(page.locator('learn-phonetic-editor')).toHaveCount(0);
});
