import {test,expect,type Browser,type Page} from '@playwright/test';
import {spawn,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {get} from 'node:https';
import {createServer} from 'node:net';
import {resolve} from 'node:path';

const python=process.env.CALL_CHANNEL_TEST_PYTHON;
const tls=process.env.CALL_CHANNEL_TEST_TLS;
const key='test-only-owner-credential-not-for-production';
test.skip(!python||!tls,'Provide local Python and a loopback-only TLS test certificate.');
test.setTimeout(120000);

async function server(db:string){
 const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');
 const port=(socket.address() as {port:number}).port;await new Promise<void>(done=>socket.close(()=>done()));
 const origin=`https://127.0.0.1:${port}`;
 let child:ChildProcess|undefined;
 let logs='';
 function health(){
  return new Promise<string>(done=>{
   const request=get(`${origin}/call/health`,{rejectUnauthorized:false,timeout:1200},response=>{
    let data='';response.on('data',part=>data+=part);response.on('end',()=>{
     try{done(response.statusCode===200?JSON.parse(data).boot:'')}catch{done('')}
    });
   });
   request.on('error',()=>done(''));request.on('timeout',()=>request.destroy());
  });
 }
 return {origin,async start(){
  child=spawn(python!,['-m','backend.tests.call_tls_harness','--serve',String(port),resolve(tls!)],
   {windowsHide:true,stdio:['pipe','ignore','pipe'],env:{...process.env,VERCEL:'',CALL_ADMIN_KEY:key,
    CALL_TEST_CHANNEL_SQLITE:db,CALL_PUBLIC_ORIGIN:origin,CALL_ALLOWED_ORIGINS:origin,CALL_SERVE_FRONTEND:'true',CALL_PROXY_MODE:'cloudflare',
    CALL_STUN_URLS:'',CALL_TURN_PROVIDER:'none',CALL_TURN_URLS:'',CALL_TURN_SHARED_SECRET:'',CALL_D1_ACCOUNT_ID:'',CALL_D1_DATABASE_ID:'',CALL_D1_API_TOKEN:''}});
  child.on('error',e=>{logs=e.message});
  child.stderr?.on('data',part=>logs=(logs+part.toString()).slice(-1600));
  await expect.poll(health,{message:`Start isolated signaling on port ${port}`,timeout:12000}).not.toBe('');
  return health();
 },async stop(){
  if(child?.pid&&child.exitCode===null&&child.signalCode===null){
   const exited=once(child,'exit');child.stdin?.end();await exited;
  }
  if(child?.exitCode&&child.exitCode!==0)test.info().annotations.push({type:'local-signaler',description:logs});
 }};
}

async function visitor(browser:Browser,mobile=false){
 const context=await browser.newContext({ignoreHTTPSErrors:true,permissions:['clipboard-read','clipboard-write'],
  ...(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1366,height:900}})});
 const page=await context.newPage();
 await page.addInitScript(()=>{
  const w=window as any;w.__tracks=[];w.__requests=0;
  const devices=navigator.mediaDevices;
  const tone=(frequency:number)=>{
   const audio=new AudioContext(),source=audio.createOscillator(),destination=audio.createMediaStreamDestination();
   source.frequency.value=frequency;source.connect(destination);source.start();void audio.resume();return destination.stream.getAudioTracks()[0];
  };
  const video=()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
   const draw=canvas.getContext('2d')!;let frame=0;
   const paint=()=>{draw.fillStyle='#333';draw.fillRect(0,0,640,360);draw.fillStyle='#eee';draw.fillRect((frame++*7)%480,40,160,280)};
   paint();const timer=setInterval(paint,60),track=canvas.captureStream(20).getVideoTracks()[0];
   setTimeout(()=>clearInterval(timer),115000);return track;
  };
  devices.getUserMedia=async request=>{
   w.__requests++;const track=request?.video?video():tone(440);w.__tracks.push(track);return new MediaStream([track]);
  };
  devices.getDisplayMedia=async()=>{w.__requests++;const tracks=[video(),tone(660)];w.__tracks.push(...tracks);return new MediaStream(tracks)};
 });
 return page;
}

async function admin(page:Page,name:string){
 await page.getByLabel('Credencial do proprietário',{exact:true}).fill(key);
 await page.getByRole('button',{name,exact:true}).click();
 await expect(page.getByLabel('Credencial do proprietário',{exact:true})).toHaveValue('');
}
async function makeRoom(page:Page,origin:string){
 await page.goto(origin+'/#/call');
 await expect(page.getByRole('heading',{name:'Sala Permanente',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Chamada Privada',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Gerenciar sala permanente'}).click();
 await admin(page,'Consultar sala');await page.getByLabel('Nome da sala',{exact:true}).fill('Sala dos Amigos');
 await admin(page,'Criar sala permanente');
 const link=page.getByRole('link',{name:'Abrir sala',exact:true});await expect(link).toBeVisible();
 return (await link.getAttribute('href'))!;
}
async function open(page:Page,link:string){
 await page.goto(link);await expect(page.getByRole('heading',{name:'Sala dos Amigos',exact:true})).toBeVisible();
 await expect(page.locator('call-page input[type="password"]')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Ativar microfone',exact:true})).toBeHidden();
}
async function join(page:Page,name:string){
 await page.getByLabel('Seu nome ou apelido',{exact:true}).fill(name);
 await page.getByRole('button',{name:'Entrar no canal',exact:true}).click();
}
async function ready(page:Page){
 await expect(page.locator('.call-connection')).toHaveText('Conectado');
 await expect(page.getByRole('button',{name:'Ativar câmera',exact:true})).toBeEnabled();
}
async function session(page:Page){return page.evaluate(()=>(document.querySelector('call-page') as any).call.session.participant as string)}
async function media(page:Page,from:string,role:string){
 const unlock=page.getByRole('button',{name:'Liberar áudio',exact:true});
 if(await unlock.isVisible())await unlock.click();
 await expect.poll(()=>page.evaluate(async({from,role})=>{
  const peer=(document.querySelector('call-page') as any).voice.peers.get(from);
  const report=await peer?.transceivers[role]?.receiver.getStats();
  const track=peer?.elements[role] as HTMLMediaElement|undefined;
  return !!track?.srcObject&&!track.paused&&track.currentTime>0&&[...(report?.values()??[])].some((row:any)=>row.type==='inbound-rtp'&&row.packetsReceived>0&&(row.framesDecoded>0||row.totalAudioEnergy>0));
 },{from,role}),{message:`Receive playing ${role}`,timeout:17000}).toBe(true);
}

test('permanent channel receives real media, preserves peers on leave and restores the same link after process restart',async({browser},info)=>{
 const fixture=await server(info.outputPath('channel.sqlite3'));
 const pages:Page[]=[];
 const tab=async(mobile=false)=>{const page=await visitor(browser,mobile);pages.push(page);return page};
 try{
  const boot=await fixture.start();
  const owner=await tab(),link=await makeRoom(owner,fixture.origin);
  await owner.context().close();
  const a=await tab(),b=await tab(true);
  await open(a,link);await expect(a.getByText('Ninguém conectado. Entre quando quiser.')).toBeVisible();
  await join(a,'Alice');await ready(a);
  await open(b,link);await expect(b.getByRole('heading',{name:'1/5 participantes'})).toBeVisible();
  await join(b,'Bia');await ready(b);
  for(const page of[a,b])expect(await page.evaluate(()=>(window as any).__requests)).toBe(0);
  const first=await session(a);
  await a.getByRole('button',{name:'Ativar microfone',exact:true}).click();
  await a.getByRole('button',{name:'Ativar câmera',exact:true}).click();
  await a.getByRole('button',{name:'Compartilhar tela',exact:true}).click();
  for(const role of['microphone','camera','screenVideo','screenAudio'])await media(b,first,role);
  await expect(b.locator(`[data-participant="${first}"] .call-speaking`)).toHaveText('Falando');
  await b.evaluate(id=>{
   const w=window as any,call=document.querySelector('call-page') as any;
   w.__peer=call.voice.peers.get(id).pc;w.__video=document.querySelector('.call-remote-screen video');w.__stream=w.__video.srcObject;
   Object.defineProperty(HTMLElement.prototype,'requestFullscreen',{value:undefined,configurable:true});call.requestUpdate();
  },first);
  await b.getByRole('button',{name:'Ampliar tela',exact:true}).tap();
  await expect(b.getByRole('button',{name:'Sair do modo expandido',exact:true})).toBeInViewport();
  await b.screenshot({path:info.outputPath('channel-mobile-expanded.png')});
  await b.getByRole('button',{name:'Sair do modo expandido',exact:true}).tap();
  const late=await tab();await open(late,link);await join(late,'Tarde');await ready(late);await media(late,first,'screenVideo');
  await late.getByRole('button',{name:'Tela cheia',exact:true}).click();
  await expect.poll(()=>late.evaluate(()=>document.fullscreenElement?.classList.contains('call-preview'))).toBe(true);
  await late.getByRole('button',{name:'Sair da tela cheia',exact:true}).click();
  await late.getByRole('button',{name:'Sair do canal',exact:true}).click();
  await expect(b.locator('.call-people h2')).toHaveText('Participantes · 2/5');
  expect(await b.evaluate(id=>{
   const w=window as any,call=document.querySelector('call-page') as any;
   return w.__peer===call.voice.peers.get(id).pc&&w.__video===document.querySelector('.call-remote-screen video')&&w.__video.srcObject===w.__stream;
  },first)).toBe(true);
  await media(b,first,'screenVideo');
  await fixture.stop();
  expect(await fixture.start()).not.toBe(boot);
  await expect.poll(()=>session(a).catch(()=>first),{timeout:25000}).not.toBe(first);
  await expect(a.locator('.call-people h2')).toHaveText('Participantes · 2/5',{timeout:25000});
  const current=await session(a);
  await media(b,current,'microphone');
  for(const page of[a,b]){
   expect(page.url()).toBe(link);
   await page.getByRole('button',{name:'Sair do canal',exact:true}).click();
   await expect.poll(()=>page.evaluate(()=>(window as any).__tracks.every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
  }
  const returning=await tab();await open(returning,link);await expect(returning.getByRole('heading',{name:'0/5 participantes'})).toBeVisible();
  await join(returning,'Voltando');await ready(returning);
  for(const width of[1366,768,390,320])for(const theme of['light','dark']){
   await returning.setViewportSize({width,height:844});await returning.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
   expect(await returning.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(width===320||width===1366)await returning.screenshot({path:info.outputPath(`channel-${width}-${theme}.png`),fullPage:true});
  }
 }finally{await Promise.all(pages.map(page=>page.context().close()));await fixture.stop()}
});

test('owner can moderate and rotate without joining; guests can enter without authentication',async({browser},info)=>{
 const fixture=await server(info.outputPath('channel.sqlite3'));
 const owner=await visitor(browser),guest=await visitor(browser);
 try{
  await fixture.start();const link=await makeRoom(owner,fixture.origin);
  await open(guest,link);await join(guest,'Visitante');await ready(guest);
  await admin(owner,'Consultar sala');await expect(owner.getByRole('button',{name:'Bloquear Visitante',exact:true})).toBeVisible();
  await admin(owner,'Bloquear Visitante');await expect(guest.getByRole('alert')).toContainText('bloqueou este navegador');
  await join(guest,'Novo apelido');await expect(guest.getByRole('alert')).toContainText('bloqueou este navegador');
  await admin(owner,'Desbloquear Visitante');await expect(owner.getByRole('button',{name:'Desbloquear Visitante',exact:true})).toHaveCount(0);
  await join(guest,'Visitante');await ready(guest);
  await admin(owner,'Consultar sala');await admin(owner,'Expulsar Visitante');await expect(guest.getByRole('alert')).toContainText('removeu você');
  await join(guest,'Visitante');await ready(guest);
  await owner.getByLabel('Nome da sala',{exact:true}).fill('Canal dos Amigos');
  await admin(owner,'Renomear sala');await expect(guest.getByRole('heading',{name:'Canal dos Amigos',exact:true})).toBeVisible();
  owner.once('dialog',dialog=>dialog.accept());
  await admin(owner,'Revogar link');await expect(guest.getByRole('alert')).toContainText('revogou este link');
  const newLink=owner.getByRole('link',{name:'Abrir sala',exact:true});await expect(newLink).not.toHaveAttribute('href',link);
  await guest.reload();await expect(guest.getByRole('alert')).toContainText('link da sala não está mais disponível');
  await guest.goto((await newLink.getAttribute('href'))!);
  await expect(guest.getByRole('heading',{name:'Canal dos Amigos',exact:true})).toBeVisible();
 }finally{await Promise.all([owner.context().close(),guest.context().close()]);await fixture.stop()}
});
