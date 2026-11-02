import {test,expect} from '@playwright/test';
import {equivalentCDI,readScenarios,writeScenarios} from '../src/fixed-income-tools';
import {project,irRate,iofRate,type Investment} from '../src/fixed-income';
import {projectContributions} from '../src/market-tools';
const input:Investment={product:'lci',amount:10000,start:'2026-11-02',maturity:'2028-11-02',indexation:'cdi',cdi:10,percentage:90,fixed:0,selic:0,spread:0,inflation:0,real:0,custody:0,fee:0,otherSelic:0,liquidity:'maturity',grace:0};
test('equivalence solves the same net engine; taxes, inverse, bounds and rounding',()=>{
 const result=equivalentCDI(input,{...input,product:'cdb'});expect(result.percentage).toBeGreaterThan(90);expect(Math.abs(result.difference)).toBeLessThanOrEqual(.01);
 const inverse=equivalentCDI({...input,product:'cdb',percentage:result.percentage},input);expect(Math.abs(inverse.percentage-90)).toBeLessThan(.001);
 for(const days of [1,15,29,30,180,181,360,361,720,721]){const maturity=new Date(Date.parse(input.start)+days*86400000).toISOString().slice(0,10),source={...input,product:'cdb' as const,maturity,percentage:100};const r=equivalentCDI(source,source);expect(Math.abs(r.difference)).toBeLessThanOrEqual(.01);expect(r.result.final.irRate).toBe(irRate(days));expect(project(source).final.iof).toBeCloseTo(project(source).final.profit*iofRate(days),1)}
 expect(()=>equivalentCDI({...input,cdi:1000,percentage:1000,maturity:'2076-11-02'},{...input,cdi:1000,maturity:'2076-11-02'})).toThrow('limite numérico');expect(()=>equivalentCDI(input,{...input,cdi:9})).toThrow();expect(()=>equivalentCDI({...input,cdi:0},{...input,cdi:0})).toThrow();expect(()=>equivalentCDI(input,{...input,product:'ipca'})).toThrow();
});
test('scenario storage preserves inputs, rejects invalid or duplicate data and propagates quota errors',()=>{
 let raw:string|null=null;const storage={getItem:()=>raw,setItem:(_:string,v:string)=>{raw=v}},row={id:'one',name:'Meu cenário',at:1,input};writeScenarios([row],storage);expect(readScenarios(storage)).toEqual([row]);expect(()=>writeScenarios([row,row],storage)).toThrow();expect(readScenarios(storage)).toEqual([row]);expect(()=>writeScenarios([row],{setItem:()=>{throw Error('quota')}})).toThrow('quota');
});
test('stock contributions separate dividends from price growth and exclude deposit from current income',()=>{
 const zero=projectContributions(1000,100,12,0,0,true).at(-1)!;expect(zero.total).toBe(2200);expect(zero.total).toBe(zero.invested);
 const one=projectContributions(1000,100,1,0,12,false)[0];expect(one.balance).toBe(1100);expect(one.cash).toBe(10);expect(one.total).toBe(1110);
 expect(projectContributions(1000,0,12,12,0,true).at(-1)!.total).toBeCloseTo(1120,8);
 expect(projectContributions(1000,0,12,0,12,true).at(-1)!.total).toBeGreaterThan(projectContributions(1000,0,12,0,12,false).at(-1)!.total);
 expect(()=>projectContributions(1,0,0,1,0,true)).toThrow();expect(()=>projectContributions(1,0,600,-100,0,true)).toThrow();
});
test('fixed scenarios can be saved, reopened, duplicated, compared and deleted with confirmation',async({page})=>{
 await page.goto('/#/renda-fixa');await page.getByLabel('Valor aplicado', {exact:false}).first().fill('10000');
 await page.locator('fixed-income-fields').first().getByLabel('CDI anual', {exact:false}).fill('10');await page.locator('fixed-income-fields').first().getByLabel('Percentual do CDI', {exact:false}).fill('100');
 await page.getByLabel('Nome do cenário').fill('CDB pessoal');await page.getByRole('button',{name:'Salvar simulação atual'}).click();await expect(page.getByRole('status').filter({hasText:'Cenário salvo'})).toBeVisible();await page.getByRole('button',{name:'Duplicar',exact:true}).click();await expect(page.getByText('CDB pessoal (cópia)',{exact:true})).toBeVisible();await page.reload();await expect(page.getByText('CDB pessoal (cópia)',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Reabrir',exact:true}).first().click();await expect(page.getByTestId('rf-net')).toBeVisible();for(const box of await page.locator('fixed-income-tools input[type=checkbox]').all())await box.check();await page.getByRole('button',{name:'Comparar selecionados'}).click();await expect(page.locator('.rf-saved-result')).toContainText('CDB pessoal');await page.getByRole('button',{name:'Excluir',exact:true}).first().click();await page.getByRole('button',{name:'Cancelar',exact:true}).click();await expect(page.getByText('CDB pessoal (cópia)',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Excluir',exact:true}).first().click();await page.getByRole('button',{name:'Confirmar exclusão'}).click();await expect(page.getByRole('button',{name:'Reabrir',exact:true})).toHaveCount(1);
});
for(const width of [1920,1366,768,390,320])test(`new tools visual ${width}`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:1000});
 for(const route of ['learn/en/path','learn/ru/path','acoes/rankings','acoes/aportes','renda-fixa','times']){
  if(route==='times')await page.route('**/api/sports/*',r=>r.fulfill({json:{season:'',sections:{schedule:{state:'unavailable',items:[],note:'Provedor indisponível no teste',source:'fixture de teste',updated_at:''},results:{state:'empty',items:[],note:'',updated_at:''}}}}));
  await page.goto('/#/'+route);await expect(page.locator('main h1').first()).toBeVisible();if(route.includes('/path'))await expect(page.getByRole('heading',{name:'Trilha de aprendizado',exact:true})).toBeVisible();if(route.includes('rankings'))await expect(page.getByText('Carregando amostra…')).toHaveCount(0);
  if(route==='acoes/aportes'){await page.getByRole('button',{name:'Simular aportes'}).click();await expect(page.getByText('Patrimônio projetado:').first()).toBeVisible()}
  for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(route==='acoes/aportes'){await expect.poll(()=>page.locator('market-contributions .button.primary').evaluate(el=>{const style=getComputedStyle(el),lum=(color:string)=>{const rgb=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722},a=lum(style.color),b=lum(style.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)})).toBeGreaterThanOrEqual(4.5)}await page.screenshot({path:info.outputPath(`${route.replaceAll('/','-')}-${theme}.png`),fullPage:true,animations:'disabled'})}
 }
 expect(errors).toEqual([]);
});
