import {expect,test} from '@playwright/test';

const viewportWidths=[320,390,768,1366] as const;

for(const language of ['en','ru'] as const){
  test(`Learn V20 workspace hierarchy and navigation — ${language}`,async({page})=>{
    await page.goto(`/#/learn/${language}`);
    const home=page.locator('learn-home');
    await expect(home).toBeVisible();
    await expect(home.getByRole('heading',{name:'Organize o estudo. Depois, pratique.'})).toBeVisible();
    await expect(home.locator('.learn-level-card')).toHaveCount(3);
    await expect(home.locator('.learn-area-link')).toHaveCount(8);
    await expect(home.locator('.learn-hub-nav a')).toHaveCount(6);
    await expect(home.getByText('A1–B1 organiza objetivos de estudo.')).toBeVisible();
    await expect(home.getByText('Novos roteiros sem gravação aprovada')).toBeVisible();
    await expect(home.locator('a[href$="/progression"]')).toHaveCount(0);
    const first=home.locator('.learn-level-card').first();
    await expect(first).toHaveAttribute('href',`#/learn/${language}/path`);
    await home.locator(`.learn-area-link[href="#/learn/${language}/dictation"]`).click();
    await expect(page.locator('.learn-practice-setup__header')).toContainText('Ditado');
    await expect(page.getByRole('navigation',{name:'Navegação do Learn'})).toBeVisible();
    await page.getByRole('navigation',{name:'Navegação do Learn'}).getByRole('link',{name:'Plano diário'}).click();
    await expect(page).toHaveURL(new RegExp(`#/learn/${language}/daily$`));
  });
}

test('Learn V20 stays within viewport in dark and light mode; no unreleased curriculum exposed',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const width of viewportWidths){
    await page.setViewportSize({width,height:920});
    for(const theme of ['dark','light'] as const){
      await page.goto('/#/learn/ru');
      await expect(page.locator('learn-home .learn-area-link')).toHaveCount(8);
      await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
      const checks=await page.evaluate(()=>({
        horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth,
        hiddenMain:!document.querySelector('learn-home .learn-curriculum'),
        leakedDraft:document.body.textContent?.includes('ru-listen-v13-01')||false,
      }));
      expect(checks,{width,theme}).toEqual({horizontalOverflow:false,hiddenMain:false,leakedDraft:false});
    }
  }
  expect(errors).toEqual([]);
});

test('Learn V20 progression keeps V12 gates, honest activity counts and collapsible details',async({page})=>{
  await page.goto('/#/learn/en/progression');
  await expect(page.getByRole('heading',{name:'Prévia indisponível'})).toBeVisible();
  await expect(page.locator('.learn-progression-stage')).toHaveCount(0);

  await page.goto('/?learn-preview=progression-v12#/learn/en/progression');
  await expect(page.getByRole('heading',{name:'Progressão de estudo'})).toBeVisible();
  const stages=page.locator('.learn-progression-stage');
  await expect(stages).toHaveCount(15);
  await expect(page.locator('.learn-progression-bar')).toHaveCount(15);
  await expect(stages.first().locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow','0');
  const details=stages.first().locator('details.learn-progression-caveat');
  await expect(details).toBeVisible();
  await expect(details).not.toHaveAttribute('open','');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open','');
  await expect(page.getByText('Atividades-ponte V11 indisponíveis')).toBeVisible();
  for(const width of viewportWidths){
    await page.setViewportSize({width,height:900});
    for(const theme of ['dark','light'] as const){
      await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
      const overflow=await page.evaluate(()=>({
        doc:document.documentElement.scrollWidth,
        viewport:window.innerWidth,
        offenders:[...document.querySelectorAll<HTMLElement>('.learn-page *')]
          .filter(el=>el.getBoundingClientRect().right>window.innerWidth+1)
          .slice(0,8).map(el=>({tag:el.tagName,klass:el.className?.toString().slice(0,60),right:Math.round(el.getBoundingClientRect().right)})),
      }));
      expect(overflow.doc<=overflow.viewport,JSON.stringify({width,theme,overflow})).toBe(true);
    }
  }
});

test('Learn V20 keeps landing, eight activities and local-language isolation',async({page})=>{
  await page.goto('/#/learn');
  await expect(page.getByRole('heading',{name:'Escolha o idioma'})).toBeVisible();
  await expect(page.locator('.learn-language')).toHaveCount(2);
  await page.locator('.learn-language[href="#/learn/en"]').click();
  await expect(page.locator('learn-home .learn-area-link')).toHaveCount(8);
  await page.getByRole('link',{name:'Trocar idioma'}).click();
  await page.locator('.learn-language[href="#/learn/ru"]').click();
  await expect(page.locator('learn-home .learn-area-link')).toHaveCount(8);
  await expect(page.locator('.learn-hero__title')).toHaveText('Russo');
});
