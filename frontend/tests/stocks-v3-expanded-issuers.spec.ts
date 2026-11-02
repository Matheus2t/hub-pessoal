import {test,expect} from '@playwright/test';
import fs from 'node:fs';

test('56 distinct issuers keep all original accounting periods and real TIM controls',async({request})=>{
 const m=await(await request.get('/financials/manifest.json')).json();
 expect(Object.keys(m.companies)).toHaveLength(56);
 expect(new Set(Object.values(m.companies).map((i:any)=>i.cnpj)).size).toBe(56);
 const data=await Promise.all(Object.values(m.companies).map(async(i:any)=>(await request.get('/financials/'+i.path)).json()));
 let annual=0;
 for(const d of data){
  const rows=d.periods.filter((p:any)=>p.kind==='annual');expect(rows).toHaveLength(5);annual+=rows.length;
  const baseline='frontend/public/financials/snapshots/c4d08cc815576f4c/'+d.issuer.symbol+'.json';
  if(fs.existsSync(baseline))expect(d.periods).toEqual(JSON.parse(fs.readFileSync(baseline,'utf8')).periods);
 }
 expect(annual).toBe(280);
 const tim=data.find(d=>d.issuer.symbol==='TIMS3');expect(tim.periods.every((p:any)=>p.document.scope==='ind')).toBe(true);
 expect(tim.periods.find((p:any)=>p.kind==='annual'&&p.end==='2025-12-31').values.profit).toBe(4311984000);
});

test('every new issuer has a usable individual page',async({page})=>{
 test.setTimeout(90000);
 await page.route('https://s3.tradingview.com/**',r=>r.abort());await page.route('https://widgets.tradingview-widget.com/**',r=>r.abort());
 const symbols=['TIMS3','BPAC3','CMIN3','CSNA3','CEAB3','KLBN3','RDOR3','DASA3','EMBJ3','BMOB3','ALLD3','CURY3','DIRR3','RAIL3','MOTV3','SBSP3','CSMG3','SAPR3','RAPT4','POMO4','FRAS3','LEVE3','ROMI3','KEPL3','VULC3','GRND3','MDIA3','SLCE3','TEND3','MRVE3','EZTC3'];
 for(const symbol of symbols){
  await page.goto('/#/acoes/'+symbol);await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
  await expect(page.locator('.financial-metrics')).toBeVisible();await expect(page.locator('#cvm-reference option')).toHaveCount(5);
 }
});

for(const width of [1920,1366,768,390,320])test(`expanded issuers sources and themes ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await page.route('https://s3.tradingview.com/**',r=>r.abort());await page.route('https://widgets.tradingview-widget.com/**',r=>r.abort());
 for(const symbol of ['TIMS3','BPAC3','CMIN3','CSNA3','CEAB3','KLBN3']){
  await page.goto('/#/acoes/'+symbol);await page.getByRole('button',{name:'Consultar dados CVM',exact:true}).click();
  await expect(page.locator('.financial-metrics')).toBeVisible();
  if(symbol==='TIMS3'){await expect(page.locator('.financial-metrics')).toContainText('Lucro líquido individual');await expect(page.locator('financial-analysis')).toContainText('consolidada zerada');}
  else{await page.getByText('Identificação do emissor',{exact:true}).click();await expect(page.getByRole('link',{name:'Fonte oficial de identificação'}).first()).toHaveAttribute('href',/^https:\/\//);}
 }
 for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('financial-analysis').screenshot({path:info.outputPath(`issuer-${theme}.png`),animations:'disabled'});}
});
