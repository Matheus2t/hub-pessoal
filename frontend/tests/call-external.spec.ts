import {test,expect,type Page,type Browser,type BrowserContext} from '@playwright/test';
import {spawn,type ChildProcess} from 'node:child_process';
import {existsSync,openSync,closeSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const origin=process.env.CALL_TEST_URL||'https://127.0.0.1:8444',key=process.env.CALL_TEST_ADMIN_KEY;
const signal=process.env.CALL_TEST_SIGNAL_URL||'wss://127.0.0.1:8443/call/ws';
const engine=process.env.CALL_TEST_BROWSER==='firefox'?'firefox':process.env.CALL_TEST_BROWSER==='webkit'?'webkit':'chromium';
test.use({browserName:engine,channel:engine==='chromium'?process.env.PW_CHANNEL||'chrome':'',ignoreHTTPSErrors:true});
test.skip(!key,'Use the loopback fixtures documented for stage 5.');test.setTimeout(60000);

async function form(page:Page,url=origin){
 await page.goto(url+'/#/call');await page.getByLabel('Seu nome',{exact:true}).fill('Owner');
}
async function create(page:Page,url=origin){await form(page,url);await page.getByRole('button',{name:'Criar sala privada',exact:true}).click();await expect(page.locator('.call-connection')).toHaveText('Conectado');return page.evaluate(()=>{const session=(document.querySelector('call-page') as any).call.session;return `${location.origin}/#/call/${session.room}?invite=${session.invite}`})}
async function join(page:Page,owner:Page,invite:string){await page.goto(invite);await page.getByLabel('Seu nome',{exact:true}).fill('Guest');await page.getByRole('button',{name:'Entrar por convite',exact:true}).click();await owner.getByRole('button',{name:'Aceitar Guest',exact:true}).click();await expect(page.locator('.call-connection')).toHaveText('Conectado')}
async function audio(page:Page){
 await page.addInitScript(()=>{if(!navigator.mediaDevices?.getUserMedia)return;
  (window as any).__testContexts=[];
  navigator.mediaDevices.getUserMedia=async()=>{const ctx=new AudioContext(),osc=ctx.createOscillator(),out=ctx.createMediaStreamDestination();osc.frequency.value=440;osc.connect(out);osc.start();await ctx.resume();(window as any).__testContexts.push(ctx);return out.stream};
 });
}
async function media(page:Page){
 await expect.poll(async()=>{
  if(await page.getByRole('button',{name:'Liberar áudio',exact:true}).isVisible())await page.getByRole('button',{name:'Liberar áudio',exact:true}).click();
  return page.evaluate(async()=>{
   const peer=[...(document.querySelector('call-page') as any).voice.peers.values()][0] as any;if(!peer)return 'no-peer';
   // State/counters only: diagnostics never retain SDP, ICE addresses or session IDs.
   let packets=0;const received:any[]=[];(await peer.pc.getStats()).forEach((s:any)=>{if(s.type==='inbound-rtp'){
    received.push({kind:s.kind,mediaType:s.mediaType,packets:s.packetsReceived});if(s.kind==='audio')packets+=s.packetsReceived??0;
   }});
   const ctx=(window as any).__testContexts?.[0];let peak=0;
   if(ctx&&peer.streams.microphone){
    if(!peer.testAnalyser){peer.testAnalyser=ctx.createAnalyser();peer.testSource=ctx.createMediaStreamSource(peer.streams.microphone);peer.testSource.connect(peer.testAnalyser)}
    const samples=new Float32Array(peer.testAnalyser.fftSize);peer.testAnalyser.getFloatTimeDomainData(samples);peak=Math.max(...samples.map(Math.abs));
   }
   if(peer.pc.connectionState==='connected'&&peer.audio.srcObject&&!peer.audio.paused&&packets>0&&peer.audio.currentTime>0&&peak>.001)return 'playing';
   return JSON.stringify({connection:peer.pc.connectionState,ice:peer.pc.iceConnectionState,signaling:peer.pc.signalingState,received,
    context:ctx?.state,peak,paused:peer.audio.paused,time:peer.audio.currentTime,tracks:peer.streams.microphone?.getTracks().map((t:MediaStreamTrack)=>({state:t.readyState,muted:t.muted}))});
  });
 },{timeout:15000}).toBe('playing');
}

async function capabilities(page:Page){return page.evaluate(()=>({audio:!!navigator.mediaDevices?.getUserMedia,display:!!navigator.mediaDevices?.getDisplayMedia,rtc:!!window.RTCPeerConnection,canvas:!!HTMLCanvasElement.prototype.captureStream}))}

test('external WSS and decoded bidirectional audio',async({browser},info)=>{
 const a=await browser.newContext({ignoreHTTPSErrors:true}),b=await browser.newContext({ignoreHTTPSErrors:true}),owner=await a.newPage(),guest=await b.newPage();
 const sockets:string[]=[],errors:string[]=[];owner.on('websocket',s=>sockets.push(s.url()));owner.on('pageerror',e=>errors.push(e.message));guest.on('pageerror',e=>errors.push(e.message));
 try{
  await audio(owner);await audio(guest);
  await owner.goto(origin+'/#/call');const supported=await capabilities(owner);
  writeFileSync(info.outputPath('capabilities.json'),JSON.stringify({engine,...supported}));
  test.skip(!supported.rtc||!supported.audio,'This installed browser has no native WebRTC/getUserMedia; media remains unvalidated.');
  const invite=await create(owner);await join(guest,owner,invite);
  for(const p of[owner,guest]){await p.getByRole('button',{name:'Entrar na chamada',exact:true}).click();await p.getByRole('button',{name:'Ativar microfone',exact:true}).click()}
  await media(owner);await media(guest);expect(sockets).toEqual([signal]);
  expect(new URL(signal).host).not.toBe(new URL(origin).host);
  await owner.getByRole('button',{name:'Desativar microfone',exact:true}).click();await expect(guest.locator('.call-people')).toContainText('microfone desligado');
  await owner.getByRole('button',{name:'Ativar microfone',exact:true}).click();await media(guest);
  await owner.getByRole('button',{name:'Encerrar sala',exact:true}).click();await expect(guest.locator('.call-connection')).toHaveText('Conexão encerrada');expect(errors).toEqual([]);
 }finally{await a.close();await b.close()}
});

test('navigation, responsive themes and explicit unsupported-browser feedback',async({page},info)=>{
 await create(page);const supported=await capabilities(page);
 writeFileSync(info.outputPath('capabilities.json'),JSON.stringify({engine,...supported}));
 try{
  for(const width of[1366,768,390,320])for(const theme of['dark','light']){
   await page.setViewportSize({width,height:950});await page.evaluate(t=>{document.documentElement.dataset.theme=t;scrollTo(0,0)},theme);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await expect(page.getByRole('navigation',{name:'Navegação principal'}).getByRole('link',{name:'2T Call',exact:true})).toHaveAttribute('aria-current','page');
   await page.screenshot({path:info.outputPath(`external-${width}-${theme}.png`),fullPage:true,animations:'disabled',timeout:10000});
  }
  if(!supported.rtc){await page.getByRole('button',{name:'Entrar na chamada',exact:true}).click();await expect(page.getByRole('alert')).toContainText('WebRTC indisponível')}
 }finally{await page.getByRole('button',{name:'Encerrar sala',exact:true}).click()}
});

test('cold-start wait is user initiated, cancellable and rejects unsafe endpoint configuration',async({page})=>{
 let release=()=>{};const blocked=new Promise<void>(r=>release=r),sockets:string[]=[];
 page.on('websocket',s=>sockets.push(s.url()));
 await page.route(signal.replace('wss:','https:').replace('/call/ws','/call/health'),async route=>{await blocked;await route.fulfill({json:{status:'ok',mode:'single-process',media:false},headers:{'access-control-allow-origin':origin}}).catch(()=>{})});
 await form(page);await page.getByRole('button',{name:'Criar sala privada',exact:true}).click();await expect(page.locator('.call-connection')).toContainText('Preparando');
 await page.evaluate(()=>location.hash='#/');release();await expect(page.locator('call-page')).toHaveCount(0);expect(sockets).toEqual([]);
 await page.unrouteAll({behavior:'wait'});await form(page);await page.evaluate(()=>(globalThis as any).__2T_CALL_SIGNAL_URL__='wss://user:secret@signal.invalid/call/ws');
 await page.getByRole('button',{name:'Criar sala privada',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Configuração segura');expect(sockets).toEqual([]);
});

test('actual server restart loses RAM rooms and closes old peers without reviving the session',async({browser,request},info)=>{
 test.skip(engine!=='chromium','Process restart is covered once; browser-specific media is covered above.');
 const python=process.env.CALL_TEST_PYTHON,tls=resolve('.vercel/call-stage5/tls'),url='https://127.0.0.1:8445';
 test.skip(!python||!existsSync(tls+'/key.pem'),'Provide CALL_TEST_PYTHON and generate the local TLS fixture.');
 const logs=[openSync(info.outputPath('restart.out.log'),'a'),openSync(info.outputPath('restart.err.log'),'a')];let child:ChildProcess|undefined;
 const start=()=>child=spawn(python!,['-m','uvicorn','backend.tests.call_tls_harness:app','--host','127.0.0.1','--port','8445','--workers','1','--no-proxy-headers','--ssl-keyfile',tls+'/key.pem','--ssl-certfile',tls+'/cert.pem','--ws-max-size','32768','--no-access-log','--log-level','warning'],{windowsHide:true,stdio:['ignore',...logs],env:{...process.env,CALL_ADMIN_KEY:key!,CALL_PUBLIC_ORIGIN:url,CALL_ALLOWED_ORIGINS:url,CALL_PROXY_MODE:'cloudflare',CALL_SERVE_FRONTEND:'true',CALL_STUN_URLS:'',CALL_TURN_PROVIDER:'none'}});
 const stop=async()=>{if(child&&child.exitCode===null){const ending=new Promise<void>(r=>child!.once('exit',()=>r()));child.kill();await ending}};
 const health=async()=>{try{const response=await request.get(url+'/call/health',{ignoreHTTPSErrors:true,timeout:1500});return response.ok()?await response.json():null}catch{return null}};
 const context=await browser.newContext({ignoreHTTPSErrors:true}),owner=await context.newPage(),guest=await context.newPage();
 try{
  start();await expect.poll(health,{timeout:10000}).toBeTruthy();const before=await health(),invite=await create(owner,url);await join(guest,owner,invite);
  for(const p of[owner,guest])await p.getByRole('button',{name:'Entrar na chamada',exact:true}).click();
  await expect.poll(()=>owner.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].filter((p:any)=>p.pc.connectionState==='connected').length)).toBe(1);
  await stop();start();await expect.poll(health,{timeout:10000}).toBeTruthy();expect((await health()).boot).not.toBe(before.boot);
  for(const p of[owner,guest]){await expect(p.locator('.call-connection')).toHaveText('Conexão encerrada');expect(await p.evaluate(()=>(document.querySelector('call-page') as any).voice.peers.size)).toBe(0)}
  await expect(owner.getByRole('alert')).toContainText('sala não está mais disponível');
  const fresh=await create(owner,url);expect(fresh).not.toBe(invite);
  await owner.getByRole('button',{name:'Encerrar sala',exact:true}).click();
 }finally{await context.close();await stop();logs.forEach(closeSync)}
});

test('unavailable health times out without sending owner secrets or opening a socket',async({page})=>{
 await page.clock.install();let attempts=0;const sockets:string[]=[];page.on('websocket',s=>sockets.push(s.url()));
 await page.route(signal.replace('wss:','https:').replace('/call/ws','/call/health'),async route=>{
  attempts++;expect(route.request().method()).toBe('GET');expect(route.request().postData()).toBeNull();expect(route.request().headers().authorization).toBeUndefined();
  await route.fulfill({status:503,body:'Unavailable',headers:{'access-control-allow-origin':origin}});
 });
 await form(page);await page.getByRole('button',{name:'Criar sala privada',exact:true}).click();await expect.poll(()=>attempts).toBeGreaterThan(0);
 await page.clock.runFor(90001);await expect(page.locator('.call-connection')).toHaveText('Conexão encerrada');await expect(page.getByRole('alert')).toContainText('indisponível');expect(sockets).toEqual([]);
 await expect(page.locator('input[name=admin]')).toHaveCount(0);
});
