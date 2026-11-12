import {expect,test} from '@playwright/test';

const viewportWidths=[320,390,768,1366] as const;

for(const language of ['en','ru'] as const){
  test(`Learn V20.1 minimal study grid and navigation — ${language}`,async({page})=>{
    await page.goto(`/#/learn/${language}`);
    const home=page.locator('learn-home');
    await expect(home).toBeVisible();
    await expect(home.getByRole('heading',{name:'O que estudar'})).toBeVisible();
    await expect(home.locator('.learn-course__level')).toHaveCount(3);
    await expect(home.locator('.learn-study__tile')).toHaveCount(8);
    await expect(home.locator('.learn-more nav')).toBeHidden();
    await expect(home.locator('.learn-summary')).toContainText('Respostas');
    await expect(home.locator('.learn-curriculum,.learn-level-map,.learn-workspace,.learn-home-progress')).toHaveCount(0);
    await expect(home.locator('a[href$="/progression"]')).toHaveCount(0);
    await expect(home.locator('a[href$="/path"]')).toHaveCount(1);
    await home.locator(`.learn-study__tile[href="#/learn/${language}/dictation"]`).click();
    await expect(page.locator('.learn-practice-setup__header')).toContainText('Ditado');
    await expect(page.getByRole('navigation',{name:'Navegação do Learn'})).toBeVisible();
    await page.getByRole('navigation',{name:'Navegação do Learn'}).getByRole('link',{name:'Plano diário'}).click();
    await expect(page).toHaveURL(new RegExp(`#/learn/${language}/daily$`));
  });
}

test('Learn V20.1 stays within viewport in dark and light mode; no unreleased curriculum exposed',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const width of viewportWidths){
    await page.setViewportSize({width,height:920});
    for(const theme of ['dark','light'] as const){
      await page.goto('/#/learn/ru');
      await expect(page.locator('learn-home .learn-study__tile')).toHaveCount(8);
      await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
      const checks=await page.evaluate(()=>({
        horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth,
        hiddenMain:!document.querySelector('learn-home .learn-study'),
        leakedDraft:document.body.textContent?.includes('ru-listen-v13-01')||false,
      }));
      expect(checks,{width,theme}).toEqual({horizontalOverflow:false,hiddenMain:false,leakedDraft:false});
    }
  }
  expect(errors).toEqual([]);
});

test('Learn V20.1 progression keeps V12 gates, honest activity counts and collapsible details',async({page})=>{
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

test('Learn V20.1 keeps landing, eight activities and local-language isolation',async({page})=>{
  await page.goto('/#/learn');
  await expect(page.getByRole('heading',{name:'Escolha o idioma'})).toBeVisible();
  await expect(page.locator('.learn-language')).toHaveCount(2);
  await page.locator('.learn-language[href="#/learn/en"]').click();
  await expect(page.locator('learn-home .learn-study__tile')).toHaveCount(8);
  await page.getByRole('link',{name:'Trocar idioma'}).click();
  await page.locator('.learn-language[href="#/learn/ru"]').click();
  await expect(page.locator('learn-home .learn-study__tile')).toHaveCount(8);
  await expect(page.locator('.learn-hero__title')).toHaveText('Russo');
});

test('Learn V20.1 keeps extra tools collapsed and opens every existing route',async({page})=>{
 await page.goto('/#/learn/ru');
 const extra=page.locator('learn-home details.learn-more');
 await expect(extra).not.toHaveAttribute('open','');
 await expect(extra.locator('nav')).toBeHidden();
 await extra.locator('summary').click();
 await expect(extra).toHaveAttribute('open','');
 await expect(extra.locator('nav a')).toHaveCount(5);
 for(const route of ['daily','dashboard','errors','targeted','backup']){
   await expect(extra.locator(`a[href="#/learn/ru/${route}"]`)).toHaveCount(1);
 }
 await extra.locator('summary').click();
 await expect(extra.locator('nav')).toBeHidden();
 await expect(page.locator('learn-home .learn-study__tile')).toHaveCount(8);
 await expect(page.locator('.learn-hero__title')).toHaveText('Russo');
 await expect(page.locator('.learn-hero')).toHaveCount(1);
});

test('Learn V20.2 polish: levels compactos, chevron consistente e indicadores alinhados',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const width of [320,390,768,1366]){
    await page.setViewportSize({width,height:920});
    for(const theme of ['dark','light'] as const){
      await page.goto('/#/learn/ru');
      await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
      await expect(page.locator('learn-home .learn-study__tile')).toHaveCount(8);
      const metrics=await page.evaluate(()=>{
        const root=document.querySelector<HTMLElement>('.learn-page')!;
        const summary=[...document.querySelectorAll<HTMLElement>('.learn-summary dl div')];
        const levels=[...document.querySelectorAll<HTMLElement>('.learn-course__level')];
        const arrow=document.querySelector<HTMLElement>('.learn-more__chevron')!;
        const row=document.querySelector<HTMLElement>('.learn-course__levels')!;
        return {
          scrollWidth:document.documentElement.scrollWidth,
          viewport:window.innerWidth,
          levelCount:levels.length,
          groupBorder:getComputedStyle(row).borderTopWidth,
          levelInteriorBorder:getComputedStyle(levels[1]).borderLeftWidth,
          compactGap:getComputedStyle(root).getPropertyValue('--learn-v20-gap').trim(),
          reviewLabel:summary[1].querySelector('dt')?.textContent?.trim(),
          valueTops:summary.map(item=>Math.round(item.querySelector('dd')!.getBoundingClientRect().top)),
          chevronBorder:getComputedStyle(arrow).borderRightWidth
        };
      });
      expect(metrics.scrollWidth<=metrics.viewport,JSON.stringify({width,theme,metrics})).toBe(true);
      expect(metrics.levelCount).toBe(3);
      expect(metrics.groupBorder).toBe('1px');
      expect(metrics.levelInteriorBorder).toBe('1px');
      expect(metrics.compactGap.length).toBeGreaterThan(0);
      expect(metrics.reviewLabel).toBe('Revisões pendentes');
      expect(metrics.chevronBorder).not.toBe('0px');
      if(width<=390)expect(Math.max(...metrics.valueTops)-Math.min(...metrics.valueTops),JSON.stringify({width,theme,metrics})).toBeLessThanOrEqual(2);
    }
  }
  expect(errors).toEqual([]);
});

test('Learn V20.2 secondary tools stay keyboard navigable without altering routes',async({page})=>{
  await page.goto('/#/learn/en');
  const disclosure=page.locator('learn-home details.learn-more');
  const summary=disclosure.locator('summary');
  await expect(disclosure.locator('nav')).toBeHidden();
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('open','');
  await expect(disclosure.locator('nav a')).toHaveCount(5);
  await page.keyboard.press('Enter');
  await expect(disclosure).not.toHaveAttribute('open','');
});
