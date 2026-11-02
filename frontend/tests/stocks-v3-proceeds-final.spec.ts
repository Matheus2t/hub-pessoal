import {test,expect} from '@playwright/test';
import {simulateAnnouncements,selectDistributions,summarizeDistributions,hasExactDate,type Distribution} from '../src/distributions';
import fs from 'node:fs';
const events=JSON.parse(fs.readFileSync('scripts/data/ipe-reviewed-distributions.json','utf8')).events as Distribution[];

test('real components, exact dates and duplicate handling preserve financial values',()=>{
 const b3=simulateAnnouncements(events,'B3SA3',100,'2026-10-07','2026-10-07');expect(b3.total).toBe('22.663462787000');expect(b3.annual).toEqual([{year:'2026',total:'22.663462787000'}]);
 expect(simulateAnnouncements(events,'GGBR3',100,'2026-12-15','2026-12-15').total).toBe('34.000000000000');
 expect(simulateAnnouncements(events,'CPLE3',100,'2026-01-01','2026-12-31').total).toBe('45.453469202000');
 for(const s of ['CPFE3','SUZB3','EGIE3','VIVT3','CMIG3','HYPE3','RDOR3','LREN3','GRND3'])expect(simulateAnnouncements(events,s,100,'2025-01-01','2027-12-31').rows).toHaveLength(0);
 expect(simulateAnnouncements([...events,...events],'PETR4',100,'2026-01-01','2026-12-31').total).toBe('134.814262000000');
 expect(()=>simulateAnnouncements([...events,{...events[0],amount:'999'}],'PETR4',100,'2026-01-01','2026-12-31')).toThrow('divergentes');
 expect(summarizeDistributions(events,'GRND3','per_share')[0].total).toBe('0.064950000000');
 expect(summarizeDistributions(events,'B3SA3','per_share')[0].jcp).toBe('0.226634627870');
 expect(hasExactDate(events.find(e=>e.symbol==='LREN3')!,'payment_date')).toBe(false);
});

test('date filters are chronological and do not replace unknowns by deadlines',()=>{
 const sorted=selectDistributions(events,'','','','','record_date').map(e=>e.record_date||'9999');
 expect(sorted).toEqual([...sorted].sort());
 const filtered=selectDistributions(events,'GRND3','dividend','2026','scheduled','record_date','2026-08-01','2026-09-01');
 expect(filtered).toHaveLength(1);expect(filtered[0].amount).toBe('0.03170');
 expect(selectDistributions(events,'CPFE3','','2026','','payment_date')).toHaveLength(0);
});

for(const width of [1920,1366,768,390,320])test(`verified units, graph and precise calendar ${width}`,async({page,request},info)=>{
 await page.setViewportSize({width,height:1000});
 const m=await(await request.get('/financials/distributions-unit/manifest.json')).json();expect(m.events).toBe(26);expect(m.companies).toHaveLength(22);
 await page.goto('/#/acoes/proventos');await expect(page.locator('.distributions tbody tr')).toHaveCount(25);
 await page.getByRole('button',{name:'Próxima',exact:true}).click();await expect(page.locator('.distributions tbody tr')).toHaveCount(1);
 await page.locator('.distributions .rf-fields select').nth(0).selectOption('CPFE3');
 await expect(page.locator('.distributions tbody')).toContainText('Até 2026-12-31');
 await expect(page.locator('.distribution-chart')).toContainText('Cada base de elegibilidade');
 await page.getByRole('button',{name:'Calendário',exact:true}).click();await page.locator('input[type=month]').fill('2026-12');
 await expect(page.getByRole('button',{name:'2026-12-31: 0 registros',exact:true})).toBeVisible();
 await page.locator('.distributions .rf-fields select').nth(0).selectOption('GGBR3');
 await page.locator('.distributions .rf-fields select').nth(2).selectOption('record_date');
 await page.locator('input[type=month]').fill('2026-11');await page.getByRole('button',{name:'2026-11-10: 1 registros',exact:true}).click();
 await expect(page.locator('.distributions tbody')).toContainText('2026-12-15');
 for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`proceeds-${theme}.png`),fullPage:true,animations:'disabled'});}
 await page.goto('/#/acoes/simulador-dividendos');await page.getByRole('combobox',{name:'Ação',exact:true}).selectOption('B3SA3');
 await page.getByRole('button',{name:'Simular anúncios',exact:true}).click();await expect(page.getByRole('status')).toContainText('22,66');
 await page.getByRole('combobox',{name:'Ação',exact:true}).selectOption('CPFE3');await page.getByRole('button',{name:'Simular anúncios',exact:true}).click();
 await expect(page.locator('.distributions')).toContainText('Nenhum anúncio elegível');await expect(page.locator('.distributions')).not.toContainText('Total bruto programado');
});
