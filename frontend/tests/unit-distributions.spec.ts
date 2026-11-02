import {test,expect} from '@playwright/test';import {simulateAnnouncements,type Distribution} from '../src/distributions';import fs from 'node:fs';
const events=JSON.parse(fs.readFileSync('scripts/data/ipe-reviewed-distributions.json','utf8')).events as Distribution[];
test('documented gross installments agree with independent decimal reference and never include FRE class totals',()=>{
 const r=simulateAnnouncements(events,'PETR4',100,'2026-01-01','2026-12-31');expect(r.rows).toHaveLength(3);expect(r.total).toBe('134.814262000000');expect(r.dividends).toBe('47.156696000000');expect(r.jcp).toBe('87.657566000000');
 expect(simulateAnnouncements(events,'PETR4',100,'2026-11-23','2026-11-23',false,true).total).toBe('67.407131000000');
 expect(simulateAnnouncements(events,'ABEV3',100,'2026-01-01','2026-12-31').total).toBe('7.500000000000');
 expect(()=>simulateAnnouncements(events,'PETR4',0,'2026-01-01','2026-12-31')).toThrow();expect(()=>simulateAnnouncements(events,'PETR4',1,'2026-02-30','2026-12-31')).toThrow();
 expect(simulateAnnouncements(events.map(e=>({...e,status:'cancelled' as const})),'PETR4',100,'2026-01-01','2026-12-31').rows).toHaveLength(0);
 expect(simulateAnnouncements(events,'PETR4',100,'2020-01-01','2020-12-31').rows).toHaveLength(0);
 expect(()=>simulateAnnouncements([...events,{...events.find(e=>e.symbol==='PETR4')!,record_date:'2026-09-01'}],'PETR4',100,'2026-01-01','2026-12-31')).toThrow('mais de uma base');
});
for(const width of [1920,1366,768,390,320])test(`unit announcements and simulator ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await page.goto('/#/acoes/proventos');await expect(page.locator('.distributions tbody tr')).toHaveCount(7);await expect(page.locator('.distributions tbody')).toContainText('0,67407131');await page.locator('.distributions .rf-fields select').nth(0).selectOption('WEGE3');await page.getByRole('button',{name:'Calendário',exact:true}).click();await page.locator('input[type=month]').fill('2027-03');await page.getByRole('button',{name:'2027-03-10: 1 registros',exact:true}).click();await expect(page.locator('.distributions tbody')).toContainText('0,100121212');
 await page.goto('/#/acoes/simulador-dividendos');await expect(page.getByRole('button',{name:'Simular anúncios'})).toBeEnabled();await page.getByLabel('Pagamento programado até',{exact:true}).fill('2026-12-31');await page.getByRole('button',{name:'Simular anúncios'}).click();await expect(page.getByRole('status')).toContainText('134,81');await expect(page.locator('.distributions tbody tr')).toHaveCount(3);await expect(page.locator('.distributions')).toContainText('não recebimentos liquidados');
 for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`simulator-${theme}.png`),fullPage:true,animations:'disabled'})}
});
