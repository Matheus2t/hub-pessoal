import {test,expect,type Page} from '@playwright/test';

// Run against the single-process service documented in docs/2t-call-stage-2.md.
// No media mocking for presence: every tab opens a real native WebSocket.
const origin=process.env.CALL_TEST_URL||'http://127.0.0.1:8001';
const key=process.env.CALL_TEST_ADMIN_KEY;
test.skip(!key,'Start the Call test service and set CALL_TEST_ADMIN_KEY.');
const localTLS=process.env.CALL_TEST_LOCAL_TLS==='1'; // Self-signed loopback fixture only.
test.use({permissions:['clipboard-read','clipboard-write'],ignoreHTTPSErrors:localTLS});

async function open(page:Page){await page.goto(`${origin}/#/call`);await expect(page.getByRole('heading',{name:'2T Call',exact:true})).toBeVisible()}
async function create(page:Page){
 await open(page);await page.getByLabel('Seu nome',{exact:true}).fill('Anfitrião');
 await page.getByRole('button',{name:'Criar sala privada',exact:true}).click();
 await expect(page.locator('.call-connection')).toHaveText('Conectado');
 await page.getByRole('button',{name:'Copiar convite',exact:true}).click();
 return page.evaluate(()=>navigator.clipboard.readText());
}
async function join(page:Page,invite:string,name:string){
 await page.goto(invite);await page.getByLabel('Seu nome',{exact:true}).fill(name);
 await page.getByRole('button',{name:'Entrar por convite',exact:true}).click();
}
test('five real tabs, admission, sixth rejection, reconnect, leave and host close',async({browser})=>{
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],ignoreHTTPSErrors:localTLS});
 const owner=await context.newPage();const errors:string[]=[];
 context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
 owner.on('pageerror',e=>errors.push(e.message));
 try{
  const invite=await create(owner);expect(invite).toMatch(/#\/call\/[a-f0-9]{32}\?invite=[\w-]{43}$/);
  const guests:Page[]=[];
  for(let n=1;n<=4;n++){
   const page=await context.newPage();await join(page,invite,`Convidado ${n}`);
   await expect(page.locator('.call-connection')).toHaveText('Aguardando aprovação do anfitrião');
   await owner.getByRole('button',{name:`Aceitar Convidado ${n}`,exact:true}).click();
   await expect(page.locator('.call-connection')).toHaveText('Conectado');guests.push(page);
  }
  for(const page of[owner,...guests]){
   await expect(page.locator('.call-people h2')).toHaveText('Participantes · 5/5');
   await expect(page.locator('.call-people li')).toHaveCount(5);
   await expect(page.locator('.call-people')).toContainText('Anfitrião · Conectado');
  }
  const sixth=await context.newPage();await join(sixth,invite,'Sexto');
  await expect(sixth.getByRole('alert')).toContainText('cinco vagas');
  // Drop one actual socket while retaining the tab's in-memory resume credential.
  await guests[0].evaluate(()=>{const page=document.querySelector('call-page') as any;page.call.socket.close()});
  await expect(guests[0].locator('.call-connection')).toHaveText('Reconectando…');
  await expect(guests[0].locator('.call-connection')).toHaveText('Conectado');
  await expect(owner.locator('.call-people h2')).toHaveText('Participantes · 5/5');
  await expect(owner.locator('.call-people li')).toHaveCount(5);
  await guests[1].getByRole('button',{name:'Sair da sala',exact:true}).click();
  await expect(owner.locator('.call-people h2')).toHaveText('Participantes · 4/5');
  await owner.getByRole('button',{name:'Encerrar sala',exact:true}).click();
  await expect(guests[0].getByRole('alert')).toContainText('encerrou a sala');
  await expect(guests[0].locator('.call-connection')).toHaveText('Conexão encerrada');
  expect(errors).toEqual([]);
 }finally{await context.close()}
});

test('simultaneous requests reserve only four guest slots',async({browser})=>{
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],ignoreHTTPSErrors:localTLS});
 try{
  const owner=await context.newPage(),invite=await create(owner);
  const guests=await Promise.all(Array.from({length:5},()=>context.newPage()));
  await Promise.all(guests.map((page,n)=>join(page,invite,`Entrada ${n}`)));
  await expect(owner.locator('.call-requests>div')).toHaveCount(4);
  await expect.poll(async()=>{
   const alerts=await Promise.all(guests.map(p=>p.locator('.call-error').allTextContents()));
   return alerts.flat().filter(text=>text.includes('cinco vagas')).length;
  }).toBe(1);
  await owner.getByRole('button',{name:'Encerrar sala',exact:true}).click();
 }finally{await context.close()}
});

test('owner credential, malformed invite, route exit and responsive themes',async({page},testInfo)=>{
 await open(page);await page.getByLabel('Seu nome',{exact:true}).fill('Teste');
 await page.getByRole('button',{name:'Usar convite',exact:true}).click();
 await page.getByLabel('Link recebido',{exact:true}).fill('invalid');
 await page.getByRole('button',{name:'Entrar por convite',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('convite válido');
 for(const width of[1366,768,390,320])for(const theme of['light','dark']){
  await page.setViewportSize({width,height:950});
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  await page.evaluate(async()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.call-layout')).toBeHidden();
  await expect(page.locator('.call-controls')).toBeHidden();
 }
 await page.setViewportSize({width:1366,height:950});
 const invite=await create(page);
 expect(invite).toContain('#/call/');
 for(const width of[1366,390,320])for(const theme of['light','dark']){
  await page.setViewportSize({width,height:950});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  await page.evaluate(async()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`call-${width}-${theme}.png`),fullPage:true});
 }
 await page.evaluate(()=>location.hash='#/');
 await expect(page.locator('call-page')).toHaveCount(1);
 await expect(page.locator('call-page')).toBeHidden();
 await expect(page.getByRole('link',{name:'Voltar à chamada'})).toBeVisible();
 await expect(page.locator('.call-dock')).toContainText('1/5 na sala');
 await page.getByRole('link',{name:'Voltar à chamada'}).click();
 await expect(page.locator('.call-connection')).toHaveText('Conectado');
 await page.getByRole('button',{name:'Sair da sala',exact:true}).click();
 await expect(page.locator('.call-layout')).toBeHidden();
});
