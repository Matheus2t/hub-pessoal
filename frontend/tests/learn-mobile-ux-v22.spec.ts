import {test,expect} from '@playwright/test';

const widths=[320,390,768] as const;
for(const language of ['en','ru'] as const){
 for(const width of widths){
  test(`mobile UX: ${language} writing retains visible feedback and keyboard focus at ${width}px`,async({page})=>{
   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setViewportSize({width,height:700});
   await page.goto(`/#/learn/${language}/writing`);
   await page.getByRole('button',{name:'Iniciar prática'}).click();
   const session=page.locator('learn-session');
   const question=session.locator('.learn-question');
   await expect(question).toBeVisible();
   await expect(question).toHaveAttribute('tabindex','-1');
   await expect(question).toBeFocused();
   const input=session.getByRole('textbox',{name:'Sua resposta'});
   await expect(input).toHaveAttribute('lang',language);
   await input.fill(language==='ru'?'Привет, мир.':'Hello, world.');
   await session.getByRole('button',{name:'Verificar resposta'}).click();
   const feedback=session.locator('.learn-feedback');
   await expect(feedback).toBeVisible();
   await expect(feedback).toHaveAttribute('role','status');
   await expect(feedback).toBeFocused();
   expect(await page.evaluate(()=>{
    const target=document.querySelector<HTMLElement>('learn-session .learn-feedback')!;
    const rect=target.getBoundingClientRect();
    return rect.top<innerHeight&&rect.bottom>0;
   })).toBe(true);
   await session.getByRole('button',{name:'Continuar'}).click();
   await expect(session.locator('.learn-question')).toBeFocused();
   await expect(session.locator('.learn-session-count')).toHaveText('2 de 10');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   expect(errors).toEqual([]);
  });
 }
}

for(const width of [320,390] as const){
 test(`mobile UX: Russian phonetic controls remain at least 44px at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:680});
  await page.goto('/#/learn/ru/writing');
  await page.getByRole('button',{name:'Iniciar prática'}).click();
  const editor=page.locator('learn-phonetic-editor');
  await expect(editor).toBeVisible();
  const toggle=editor.getByRole('button',{name:'Fonético ligado'});
  const buttons=editor.getByRole('group',{name:'Inserir letras russas'}).getByRole('button');
  await expect(buttons).toHaveCount(10);
  const controls=await page.evaluate(()=>{
   const els=[...document.querySelectorAll<HTMLElement>('.learn-phonetic-editor__symbols button,.learn-phonetic-editor__toggle')];
   return els.map(el=>({name:el.getAttribute('aria-label')||el.textContent?.trim(),
    width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
  });
  expect(controls).toHaveLength(11);
  for(const control of controls){
   expect(control.width,JSON.stringify(control)).toBeGreaterThanOrEqual(44);
   expect(control.height,JSON.stringify(control)).toBeGreaterThanOrEqual(44);
  }
  await toggle.focus();await expect(toggle).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(editor.getByRole('button',{name:'Fonético desligado'})).toHaveAttribute('aria-pressed','false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}

test('mobile UX: flashcard feedback and following card stay reachable by keyboard',async({page})=>{
 await page.setViewportSize({width:320,height:700});
 await page.goto('/#/learn/en/flashcards');
 await page.getByRole('button',{name:'Iniciar prática'}).click();
 const session=page.locator('learn-session');
 await expect(session.locator('.learn-question')).toBeFocused();
 await session.getByRole('button',{name:'Revelar resposta'}).click();
 await session.getByRole('button',{name:'Bom'}).click();
 await expect(session.locator('.learn-feedback')).toBeFocused();
 await session.getByRole('button',{name:'Continuar'}).click();
 await expect(session.locator('.learn-question')).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
