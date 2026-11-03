import {test,expect} from '@playwright/test';

const entries = [
 ['Comparar empresas','#/acoes/comparar'],
 ['Rankings por setor','#/acoes/rankings'],
 ['Simulador de aportes','#/acoes/aportes'],
 ['Proventos','#/acoes/proventos'],
 ['DY manual','#/acoes/dy'],
] as const;

for (const width of [1366,390,320]) {
 test('ações navigation looks interactive, responsive and accessible at '+width,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/#/acoes');
  const nav=page.getByRole('navigation',{name:'Ferramentas de análise'});
  await expect(nav).toBeVisible();
  const links=nav.getByRole('link');
  await expect(links).toHaveCount(5);
  for(const [label,href] of entries){
   const link=nav.getByRole('link',{name:label,exact:true});
   await expect(link).toHaveAttribute('href',href);
   await expect(link).toHaveCSS('display','inline-flex');
   await expect(link).toHaveCSS('border-top-style','solid');
   await expect(link).toHaveCSS('text-decoration-line','none');
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const first=links.first();
  const bg=await first.evaluate(e=>getComputedStyle(e).backgroundColor);
  await first.hover();
  await expect.poll(()=>first.evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(bg);
  await first.focus();
  await expect(first).toBeFocused();
  await expect(first).toHaveCSS('outline-style','solid');
  await expect(page.locator('market-page [slot=chart] tv-advanced-chart')).toBeAttached();
  await expect(page.locator('market-page iframe.market-quotes-frame')).toBeAttached();
 });
}
test('Ações shortcuts open correct tools and highlight selected route',async({page})=>{
 await page.goto('/#/acoes');
 for (const [label,href] of entries) {
  await page.getByRole('navigation',{name:'Ferramentas de análise'}).getByRole('link',{name:label,exact:true}).click();
  await expect(page).toHaveURL(new RegExp(href.replaceAll('/','\\/')+'$'));
  const nav=page.getByRole('navigation',{name:'Ferramentas de análise'});
  await expect(nav.getByRole('link')).toHaveCount(5);
  await expect(nav.getByRole('link',{name:label,exact:true})).toHaveAttribute('aria-current','page');
  await expect(nav.locator('[aria-current=page]')).toHaveCount(1);
  const current=nav.getByRole('link',{name:label,exact:true});
  await expect(current).toHaveCSS('background-color',await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--text').trim()==='#efefef'?'rgb(239, 239, 239)':'rgb(25, 25, 25)'));
 }
 await page.goto('/#/acoes/ITUB4');
 await expect(page.getByRole('navigation',{name:'Ferramentas de análise'}).getByRole('link')).toHaveCount(5);
 await expect(page.locator('market-page [slot=chart]')).toBeVisible();
});
