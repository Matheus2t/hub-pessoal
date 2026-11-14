import {test,expect} from '@playwright/test';
import {stocks} from '../src/market-catalog';
for(const width of [1920,1366,768,390,320]) test(`platform areas at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto('/#/');
 await expect(page.locator('home-page .tool-card')).toHaveCount(4);
 await expect(page.getByRole('heading',{name:'Início',exact:true})).toBeVisible();
 await expect(page.locator('home-page .platform-lead')).toHaveCount(0);
 await expect(page.locator('.platform-name, .area-index, .area-tag')).toHaveCount(0);
 await expect(page.locator('tool-card, .category-filters, .catalog-search, tradingview-widget')).toHaveCount(0);
 const navigation=page.getByRole('navigation',{name:'Navegação principal'});
 await expect(navigation.getByRole('link')).toHaveCount(width<=700?2:5);
 await expect(navigation.getByRole('link',{name:'Início',exact:true})).toBeVisible();
 await expect(navigation.locator('.areas-menu summary')).toHaveText('Áreas');
 await expect(navigation.getByRole('link',{name:'Call',exact:true})).toHaveCount(0);
 await navigation.locator('.areas-menu summary').click();
 for(const area of ['Call','Calculadoras','Mercado de Ações','Renda Fixa','Learn / Изучать'])
   await expect(navigation.getByRole('link',{name:area,exact:true})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(navigation.locator('.areas-menu')).not.toHaveAttribute('open','');
 await navigation.locator('.teams-menu summary').click();
 const teamsMenu=navigation.locator('.teams-menu');
 for(const team of ['Philadelphia 76ers','São Paulo Futebol Clube','FC Barcelona']){
   const link=teamsMenu.getByRole('link',{name:team,exact:true});
   await expect(link).toBeVisible();
   await expect.poll(()=>link.locator('img').evaluate(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0)).toBe(true);
 }
 await page.keyboard.press('Escape');
 await expect(page.locator('home-page a.home-call[href="#/call"]')).toBeVisible();
 if(width<=600){
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await expect(navigation.locator('.nav-team-icons')).toBeHidden();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight+1 || document.querySelector('.page-footer')!.getBoundingClientRect().bottom>=innerHeight-50)).toBe(true);
 await page.screenshot({path:info.outputPath('home-dark.png'),fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'Ativar tema claro'}).click();
 await page.screenshot({path:info.outputPath('home-light.png'),fullPage:true,animations:'disabled'});
 await page.locator('home-page').getByRole('link',{name:/Calculadoras/}).focus();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Calculadoras',exact:true})).toBeVisible();
 const catalog=page.locator('calculator-catalog');
 await expect(catalog.locator('tool-card')).toHaveCount(8);await expect(catalog.locator('.category-filters')).toHaveCount(0);
 await catalog.getByRole('searchbox').fill('sac');await expect(catalog.locator('tool-card')).toHaveCount(1);
 await page.getByRole('link',{name:'Abrir Financiamento SAC'}).focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/#\/sac$/);
 await page.getByRole('navigation',{name:'Caminho da página'}).getByRole('link',{name:'Calculadoras',exact:true}).click();
 await expect(page.locator('calculator-catalog tool-card')).toHaveCount(8);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await navigation.getByRole('link',{name:'Início',exact:true}).click();
 await page.locator('home-page').getByRole('link',{name:/Mercado de Ações/}).click();
 await page.locator('.market-directory-toggle').click();
 await expect(page.locator('.stock-item')).toHaveCount(stocks.length);
});
test('legacy routes and calculator breadcrumbs',async({page})=>{
 await page.goto('/#/ferramentas');await expect(page).toHaveURL(/#\/calculadoras$/);
 for(const route of ['calculadora','juros-simples','price','sac']){
 await page.goto('/#/'+route);const crumbs=page.getByRole('navigation',{name:'Caminho da página'});
 await expect(crumbs.getByRole('link')).toHaveCount(2);
 await crumbs.getByRole('link',{name:'Calculadoras',exact:true}).click();await expect(page.locator('calculator-catalog tool-card')).toHaveCount(8);
 }
});
