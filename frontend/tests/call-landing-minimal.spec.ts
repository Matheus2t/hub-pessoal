import {test,expect} from '@playwright/test';

// Presentation-only checks. No credentials, real rooms or media permissions.
test('Call retains room actions but removes requested copy',async({page})=>{
 await page.goto('/#/call');
 const root=page.locator('call-page');
 await expect(root.getByRole('heading',{name:'Call',exact:true})).toBeVisible();
 const badge=root.locator('.call-badge');
 await expect(badge).toHaveText('CONVERSAS PRIVADAS · 5 PESSOAS');
 expect(await badge.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
 await expect(badge).toHaveCSS('border-top-width','0px');
 for(const text of [
  'Um espaço direto para conversar, mostrar a tela e ficar junto.',
  'Fora da chamada, as prévias ficam apenas neste navegador.',
  'Sem cadastro. Compartilhe o convite para chamar seus amigos.'
 ])await expect(root).not.toContainText(text);
 await expect(root.locator('.call-card-symbol,.call-panel-label')).toHaveCount(0);
 await expect(root.getByRole('button',{name:'Criar uma sala',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(root.getByRole('button',{name:'Criar sala privada',exact:true})).toBeVisible();
 await expect(root.locator('.call-entry-hint')).toHaveCount(0);
 await root.getByRole('button',{name:'Usar convite',exact:true}).click();
 await expect(root.getByLabel('Link recebido',{exact:true})).toBeVisible();
 await expect(root.getByRole('button',{name:'Entrar por convite',exact:true})).toBeVisible();
 await expect(root.locator('.call-entry-hint')).toContainText('O anfitrião aprova');
});
for(const width of [1366,768,390,320])for(const theme of ['dark','light']){
 test('Call landing minimal '+width+' '+theme,async({page},info)=>{
  await page.setViewportSize({width,height:920});
  await page.goto('/#/call');
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  const root=page.locator('call-page'),cards=root.locator('.call-join-grid > section');
  await expect(root.getByRole('heading',{name:'Call',exact:true})).toBeVisible();
  await expect(root.locator('.call-badge')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toHaveCSS('background-image','none');
  await expect(cards.first().getByRole('heading',{name:'Sala Permanente'})).toBeVisible();
  await expect(cards.last().getByRole('heading',{name:'Chamada Privada'})).toBeVisible();
  if(width===1366&&theme==='dark'||width===390&&theme==='light')await page.screenshot({path:info.outputPath('call-'+width+'-'+theme+'.png'),fullPage:true,animations:'disabled'});
 });
}


test('Sala Permanente responde imediatamente sem consulta de saúde em série',async({page})=>{
 let lobbyRequests=0,healthRequests=0;
 const room='a'.repeat(32);
 await page.route('**/call/health',route=>{
  healthRequests++;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',mode:'single-process',media:false})});
 });
 await page.route('**/call/lobby',route=>{
  lobbyRequests++;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   type:'channel',room,name:'Canal de testes',online:2,requiresPassword:true
  })});
 });
 await page.goto('/#/call');
 const root=page.locator('call-page');
 await expect(root.getByRole('link',{name:'Entrar na sala'})).toBeVisible();
 await expect(root.locator('.call-lobby-status')).toContainText('Canal de testes');
 expect(lobbyRequests).toBe(1);
 expect(healthRequests).toBe(0);

 // Short internal navigation does not expose or store the room ID.
 await page.evaluate(()=>{location.hash='#/acoes'});
 await expect(root).toBeHidden();
 await page.evaluate(()=>{location.hash='#/call'});
 await expect(root.getByRole('link',{name:'Entrar na sala'})).toBeVisible();
 expect(lobbyRequests).toBe(1);
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain(room);
});

test('Sala Permanente retoma a consulta quando a resposta inicial falha',async({page})=>{
 let lobbyRequests=0,healthRequests=0;
 await page.route('**/call/health',route=>{
  healthRequests++;
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'ok',mode:'single-process',media:false})});
 });
 await page.route('**/call/lobby',route=>{
  lobbyRequests++;
  return route.fulfill({status:lobbyRequests===1?503:200,contentType:'application/json',body:
   lobbyRequests===1?'{}':JSON.stringify({type:'channel',room:null})
  });
 });
 await page.goto('/#/call');
 const root=page.locator('call-page');
 await expect.poll(()=>page.evaluate(()=>{
  const call=document.querySelector('call-page') as any;
  return !call.channelLoading&&call.lobby?.room===null;
 })).toBe(true);
 expect(lobbyRequests).toBe(2);
 expect(healthRequests).toBe(1);
 await expect(root).toContainText('Nenhuma sala permanente configurada.');
});
