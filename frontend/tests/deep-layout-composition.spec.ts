import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const widths=[320,390,768,1024,1366,1440,1920] as const;
const themes=['dark','light'] as const;
const stage=process.env.UX_STAGE||'before';
const evidence=path.resolve('docs/ux-layout-refinement/evidence',stage);

for(const width of widths)for(const theme of themes){
 test(`layout composition ${width}px ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  const violations:string[]=[];
  const checkOverflow=async(label:string)=>{const result=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));if(result.document>result.viewport)violations.push(`${label} horizontal overflow ${result.document}px > ${result.viewport}px`)};
  await page.route('**/call/lobby',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({type:'channel',room:null})}));
  await page.goto('/#/renda-fixa');
  await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
  const income=page.locator('fixed-income-page panel-workspace[area="fixed-income-simulator"]');
  const form=income.locator('[slot="form"]'),empty=income.locator('[slot="empty"]');
  await expect(form).toBeVisible();await expect(empty).toBeVisible();
  const formBox=await form.boundingBox(),emptyBox=await empty.boundingBox();
  if(formBox&&emptyBox&&width>=1024&&formBox.height-emptyBox.height<100)
   violations.push(`Renda Fixa empty panel too tall: form=${Math.round(formBox.height)} result=${Math.round(emptyBox.height)}`);
  if(width===1366)console.log('UX_GEOMETRY fixed-income',JSON.stringify({width,theme,form:formBox,empty:emptyBox}));
  if([1366,390].includes(width)){
   fs.mkdirSync(evidence,{recursive:true});
   await page.screenshot({path:path.join(evidence,`fixed-income-${width}-${theme}.png`),fullPage:true,animations:'disabled'});
  }
  await checkOverflow('Renda Fixa');

  await page.goto('/#/call');
  await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
  const cards=page.locator('call-page .call-join-grid > section');
  await expect(cards).toHaveCount(2);
  const permanent=await cards.nth(0).boundingBox(),privateRoom=await cards.nth(1).boundingBox();
  if(permanent&&privateRoom&&width>820&&permanent.height>=privateRoom.height-20)
   violations.push(`Call lobby panels remain equal-height: permanent=${Math.round(permanent.height)} private=${Math.round(privateRoom.height)}`);
  if(permanent&&privateRoom&&width>820&&Math.abs(permanent.y-privateRoom.y)>3)
   violations.push('Call lobby panels do not align at the top');
  if(width===1366)console.log('UX_GEOMETRY call',JSON.stringify({width,theme,permanent,privateRoom}));
  if([1366,390].includes(width))await page.screenshot({path:path.join(evidence,`call-${width}-${theme}.png`),fullPage:true,animations:'disabled'});
  await checkOverflow('Call');

  await page.goto('/#/learn/en/dashboard');
  await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
  const overview=page.locator('learn-dashboard .learn-message[aria-label="Diagnóstico"]');
  await expect(overview).toBeVisible();await expect(overview).toContainText('Hoje');
  const overviewBox=await overview.boundingBox();
  const insights=overview.locator('.learn-dashboard-insight');
  let boxes:{x:number;y:number;width:number;height:number}[]=[];
  if(await insights.count()===4){
   boxes=await insights.evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));
   if(width>=768){
    if(Math.abs(boxes[0].y-boxes[1].y)>4)violations.push(`Learn dashboard first row is not aligned: ${JSON.stringify(boxes.slice(0,2))}`);
    if(Math.abs(boxes[2].y-boxes[3].y)>4)violations.push(`Learn dashboard second row is not aligned: ${JSON.stringify(boxes.slice(2,4))}`);
   }else if(!(boxes[1].y>=boxes[0].y+boxes[0].height-2&&boxes[2].y>=boxes[1].y+boxes[1].height-2)){
    violations.push('Learn dashboard insights do not stack on a narrow screen');
   }
  }else{
   const headings=await overview.locator('h3').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));
   boxes=headings;
   if(width>=768&&headings.length>=2&&headings[1].y-headings[0].y>24)
    violations.push(`Learn dashboard summary is a single vertical column: ${JSON.stringify(headings)}`);
  }
  if(width===1366)console.log('UX_GEOMETRY learn',JSON.stringify({width,theme,overview:overviewBox,boxes}));
  if([1366,390].includes(width))await page.screenshot({path:path.join(evidence,`learn-dashboard-${width}-${theme}.png`),fullPage:true,animations:'disabled'});

  await checkOverflow('Learn');
  expect(violations,violations.join('\n')).toEqual([]);
 });
}
