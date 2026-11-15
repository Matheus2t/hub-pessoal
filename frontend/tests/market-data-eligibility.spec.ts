import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {eligibleAnnualSymbols,hasFinancialValue,type Manifest} from '../src/financial-data';
import {eligibleAnnouncementSymbols,eligibleDistributionEvents,eligibleDistributionSymbols,type Distribution} from '../src/distributions';
import {stocks} from '../src/market-catalog';

const financial=JSON.parse(fs.readFileSync('frontend/public/financials/manifest.json','utf8')) as Manifest;
const eventData=(directory:string):Distribution[]=>{
 const manifest=JSON.parse(fs.readFileSync(`frontend/public/financials/${directory}/manifest.json`,'utf8'));
 return JSON.parse(fs.readFileSync(`frontend/public/financials/${directory}/${manifest.path}`,'utf8')).events as Distribution[];
};
const distributions=[...eventData('distributions'),...eventData('distributions-unit')];

test('CVM eligibility follows annual manifest coverage and keeps legitimate zero values',()=>{
 const symbols=eligibleAnnualSymbols(financial);
 expect(stocks).toHaveLength(65);
 expect(symbols).toHaveLength(56);
 expect(symbols).toContain('PETR4');
 for(const symbol of ['AXIA3','BBAS3','BBDC3','BBSE3','BRAV3','BRST3','CXSE3','SANB3','UGPA3'])expect(symbols).not.toContain(symbol);
 expect(hasFinancialValue(0)).toBe(true);
 expect(hasFinancialValue(null)).toBe(false);
 expect(hasFinancialValue(Number.NaN)).toBe(false);
 const incomplete={...financial,coverage:{...financial.coverage,PETR4:{periods:1,references:[{kind:'annual',start:'2025-01-01',end:'2025-12-31',version:1,available:['revenue'],unavailable:[]}]}}};
 expect(eligibleAnnualSymbols(incomplete)).not.toContain('PETR4');
});

test('distribution availability is source- and basis-specific, and zero is valid',()=>{
 expect(eligibleDistributionSymbols(distributions,'per_share')).toHaveLength(22);
 expect(eligibleDistributionSymbols(distributions,'class_total')).toHaveLength(47);
 const unit=distributions.find(event=>event.amount_basis==='per_share')!;
 const zero={...unit,id:'zero-valid-event',amount:'0',gross_per_share:'0'};
 expect(eligibleDistributionEvents([zero],'per_share')).toContainEqual(zero);
 expect(eligibleDistributionEvents([{...zero,id:'missing-unit',gross_per_share:null}],'per_share')).toHaveLength(0);
 expect(eligibleDistributionEvents([{...zero,id:'missing-source',source:{...zero.source,url:'javascript:alert(1)'}}],'per_share')).toHaveLength(0);
 expect(eligibleDistributionEvents(distributions,'class_total').every(event=>event.amount_basis==='class_total')).toBe(true);
});

test('announced simulator only offers complete unambiguous events in the selected interval',()=>{
 const symbols=eligibleAnnouncementSymbols(distributions,'2025-01-01','2027-12-31');
 expect(symbols).toHaveLength(12);
 expect(symbols).toContain('PETR4');
 expect(symbols).not.toContain('CPFE3');
 expect(eligibleAnnouncementSymbols(distributions,'2020-01-01','2020-12-31')).toEqual([]);
 expect(eligibleAnnouncementSymbols(distributions,'2025-01-01','2027-12-31',false,false)).toEqual([]);
 const petr=distributions.find(event=>event.symbol==='PETR4'&&event.status==='scheduled')!;
 expect(eligibleAnnouncementSymbols([...distributions,{...petr,id:'ambiguous-basis',record_date:'2026-09-01'}],'2025-01-01','2027-12-31')).not.toContain('PETR4');
});

test('comparison and distribution tools expose only their own eligible choices',async({page})=>{
 await page.goto('/#/acoes/comparar');
 const comparison=page.locator('financial-comparison');
 const company=page.locator('#cvm-company-0');
 await expect(company).toBeVisible();
 const comparisonSymbols=stocks.filter(stock=>eligibleAnnualSymbols(financial).includes(stock.symbol)).map(stock=>stock.symbol);
 await expect(company.locator('option')).toHaveCount(comparisonSymbols.length+1); // opções válidas + placeholder
 await expect(company).toHaveValue('PETR4');
 await expect(page.locator('#cvm-company-1')).toHaveValue('VALE3');
 for(const symbol of comparisonSymbols)await expect(company.locator(`option[value="${symbol}"]`)).toHaveCount(1);
 const noCvmCoverage=stocks.find(stock=>!eligibleAnnualSymbols(financial).includes(stock.symbol))!;
 await expect(company.locator(`option[value="${noCvmCoverage.symbol}"]`)).toHaveCount(0);

 await page.goto('/#/acoes/rankings');
 await expect(page.locator('.rk-summary > div:first-child strong')).toContainText('56');
 await expect(page.locator('.rk-company')).toHaveCount(56); // ROE: all 56 issuers have a finite 2025 value
 await page.locator('#rk-metric').selectOption('profit_growth');
 await expect(page.locator('.rk-company')).toHaveCount(51); // Missing growth is not treated as zero

 await page.goto('/#/acoes/proventos');
 const historyCompany=page.locator('distributions-page .distribution-company select');
 await expect(historyCompany.locator('option')).toHaveCount(23); // Todas + 22 IPE issuers
 await page.locator('#distribution-basis').selectOption('class_total');
 await expect(historyCompany.locator('option')).toHaveCount(48); // Todas + 47 FRE issuers

 await page.goto('/#/acoes/simulador-dividendos');
 const announcedCompany=page.locator('distributions-page .rf-fields select').first();
 await expect(announcedCompany.locator('option')).toHaveCount(12);
 await expect(announcedCompany.locator('option[value="PETR4"]')).toHaveCount(1);
 const announcementSymbols=eligibleAnnouncementSymbols(distributions,'2025-01-01','2027-12-31');
 await expect(announcedCompany).toHaveValue(announcementSymbols[0]);
 const noAnnouncement=eligibleDistributionSymbols(distributions,'per_share').find(symbol=>!announcementSymbols.includes(symbol))!;
 await expect(announcedCompany.locator(`option[value="${noAnnouncement}"]`)).toHaveCount(0);
 await page.getByLabel('Pagamento programado a partir de',{exact:true}).fill('2020-01-01');
 await page.getByLabel('Pagamento programado até',{exact:true}).fill('2020-12-31');
 await expect(announcedCompany.locator('option')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Simular anúncios'})).toBeDisabled();
 await expect(page.getByRole('status')).toContainText('Nenhuma empresa possui anúncios completos');

 await page.goto('/#/acoes/proventos');
 await expect(historyCompany).toHaveValue('');
 await expect(page.locator('.distributions tbody tr')).toHaveCount(25);

 await page.goto('/#/acoes/AXIA3');
 await expect(page.getByRole('heading',{name:'AXIA3',exact:true})).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);

 await page.goto('/#/acoes/dy');
 await expect(page.locator('distributions-page .dy-form')).toBeVisible();
 await expect(page.locator('distributions-page select')).toHaveCount(0);
 await page.goto('/#/acoes/aportes');
 await expect(page.locator('market-contributions')).toBeVisible();
 await expect(page.locator('market-contributions select')).toHaveCount(0); // Simulador usa premissas manuais, sem seleção de empresa
 expect(await comparison.count()).toBe(0);
});
