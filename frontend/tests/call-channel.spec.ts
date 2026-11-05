import {test,expect,type Browser,type Page} from '@playwright/test';
import {spawn,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {get} from 'node:https';
import {createServer} from 'node:net';
import {resolve} from 'node:path';

const python=process.env.CALL_CHANNEL_TEST_PYTHON;
const tls=process.env.CALL_CHANNEL_TEST_TLS;
const previewAssets=process.env.CALL_CHANNEL_TEST_ASSETS;
const key='test-only-owner-credential-not-for-production';
const password='test-only-channel-passphrase';
test.skip(!python||!tls,'Provide local Python and a loopback-only TLS test certificate.');
test.setTimeout(120000);
test.use({actionTimeout:9000,navigationTimeout:20000});

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
 const context=await browser.newContext({ignoreHTTPSErrors:true,
  ...(mobile?{viewport:{width:390,height:844},isMobile:browser.browserType().name()!=='firefox',hasTouch:true}:{viewport:{width:1366,height:900}})});
 const page=await context.newPage();
 // Exercise the exact deployed assets with an isolated signaler and synthetic credentials.
 if(previewAssets)await page.route(url=>url.hostname==='127.0.0.1'&&['/bundle.js','/styles.css'].includes(url.pathname),route=>
  route.fulfill({path:resolve(previewAssets,new URL(route.request().url()).pathname.slice(1))}));
 await page.addInitScript(()=>{
  const w=window as any;w.__tracks=[];w.__requests=0;w.__cameraChoices=[];
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
   w.__requests++;const track=request?.video?video():tone(440);
   if(typeof request?.video==='object'){
    const choice=request.video,setting=(value:any)=>typeof value==='string'?value:value?.exact??value?.ideal;
    const facing=setting(choice.facingMode),id=setting(choice.deviceId)??(facing==='environment'?'rear':'front');
    const original=track.getSettings.bind(track);
    track.getSettings=()=>({...original(),deviceId:id,facingMode:id==='rear'?'environment':'user'});
    w.__cameraChoices.push({id,facing,frontReleased:w.__cameraTrack?.readyState==='ended'});w.__cameraTrack=track;
   }
   w.__tracks.push(track);return new MediaStream([track]);
  };
  devices.enumerateDevices=async()=>['front','rear'].map(id=>({deviceId:id,kind:'videoinput',groupId:'test',label:id==='front'?'Câmera frontal':'Câmera traseira',toJSON(){return {}}}));
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
 await page.getByLabel('Senha da sala',{exact:true}).fill(password);
 await admin(page,'Criar sala permanente');
 const link=page.getByRole('link',{name:'Abrir sala',exact:true});await expect(link).toBeVisible();
 return (await link.getAttribute('href'))!;
}
async function open(page:Page,link:string){
 await page.goto(link);await expect(page.getByRole('heading',{name:'Sala dos Amigos',exact:true})).toBeVisible();
 await expect(page.getByLabel('Senha da sala',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Credencial do proprietário',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Ativar microfone',exact:true})).toBeHidden();
}
async function join(page:Page,name:string,secret=password){
 await page.getByLabel('Seu nome ou apelido',{exact:true}).fill(name);
 await page.getByLabel('Senha da sala',{exact:true}).fill(secret);
 await page.getByRole('button',{name:'Entrar no canal',exact:true}).click();
 expect(await page.evaluate(()=>(document.querySelector('call-page input[name="password"]') as HTMLInputElement|null)?.value??'')).toBe('');
}
async function ready(page:Page,requireMedia=true){
 await expect(page.locator('.call-connection')).toHaveText('Conectado');
 if(requireMedia)await expect(page.getByRole('button',{name:'Ativar câmera',exact:true})).toBeEnabled();
}
async function requireWebRTC(page:Page,origin:string){
 await page.goto(origin+'/#/call');
 const missing=await page.evaluate(()=>[
  typeof RTCPeerConnection==='undefined'?'RTCPeerConnection':'',
  typeof HTMLCanvasElement.prototype.captureStream!=='function'?'canvas.captureStream':'',
 ].filter(Boolean).join(', '));
 test.skip(!!missing,`Media fixture unavailable in this browser build: ${missing}`);
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
  const owner=await tab();await requireWebRTC(owner,fixture.origin);
  const link=await makeRoom(owner,fixture.origin);
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

test('owner can moderate and rotate without joining; guests use the room password',async({browser},info)=>{
 const fixture=await server(info.outputPath('channel.sqlite3'));
 const owner=await visitor(browser),guest=await visitor(browser);
 try{
  await fixture.start();const link=await makeRoom(owner,fixture.origin);
  await guest.goto(fixture.origin+'/#/call');
  const panel=guest.getByRole('region',{name:'Sala Permanente'});
  await expect(panel).toContainText('Sala dos Amigos');await expect(panel).toContainText('0/5 participantes');
  await panel.getByRole('link',{name:'Entrar na sala',exact:true}).click();
  expect(guest.url()).toBe(link);
  await join(guest,'Visitante','wrong-password');await expect(guest.getByRole('alert')).toContainText('Senha da sala incorreta');
  await join(guest,'Visitante');await ready(guest,false);
  await admin(owner,'Consultar sala');await expect(owner.getByRole('button',{name:'Bloquear Visitante',exact:true})).toBeVisible();
  await admin(owner,'Bloquear Visitante');await expect(guest.getByRole('alert')).toContainText('bloqueou este navegador');
  await join(guest,'Novo apelido');await expect(guest.getByRole('alert')).toContainText('bloqueou este navegador');
  await admin(owner,'Desbloquear Visitante');await expect(owner.getByRole('button',{name:'Desbloquear Visitante',exact:true})).toHaveCount(0);
  await join(guest,'Visitante');await ready(guest,false);
  await admin(owner,'Consultar sala');await admin(owner,'Expulsar Visitante');await expect(guest.getByRole('alert')).toContainText('removeu você');
  await join(guest,'Visitante');await ready(guest,false);
  await owner.getByLabel('Nome da sala',{exact:true}).fill('Canal dos Amigos');
  await admin(owner,'Renomear sala');await expect(guest.getByRole('heading',{name:'Canal dos Amigos',exact:true})).toBeVisible();
  owner.once('dialog',dialog=>dialog.accept());
  await admin(owner,'Revogar link');await expect(guest.getByRole('alert')).toContainText('revogou este link');
  const newLink=owner.getByRole('link',{name:'Abrir sala',exact:true});await expect(newLink).not.toHaveAttribute('href',link);
  await guest.reload();await expect(guest.getByRole('alert')).toContainText('link da sala não está mais disponível');
  await guest.goto((await newLink.getAttribute('href'))!);
  await expect(guest.getByRole('heading',{name:'Canal dos Amigos',exact:true})).toBeVisible();
  await join(guest,'Visitante');await ready(guest,false);
  await owner.getByLabel('Nova senha da sala',{exact:true}).fill(password+'-updated');
  await admin(owner,'Alterar senha');await expect(guest.getByRole('alert')).toContainText('O proprietário alterou a senha');
  await expect(newLink).toHaveAttribute('href',guest.url());
  await join(guest,'Visitante');await expect(guest.getByRole('alert')).toContainText('Senha da sala incorreta');
  await join(guest,'Visitante',password+'-updated');await ready(guest,false);
 }finally{await Promise.all([owner.context().close(),guest.context().close()]);await fixture.stop()}
});

test('front, rear and desktop cameras keep WebRTC and fullscreen media controls inside the viewer',async({browser},info)=>{
 const fixture=await server(info.outputPath('channel.sqlite3'));
 const owner=await visitor(browser),desktop=await visitor(browser),mobile=await visitor(browser,true);
 try{
  await fixture.start();await requireWebRTC(owner,fixture.origin);const link=await makeRoom(owner,fixture.origin);
  await open(desktop,link);await join(desktop,'Alice');await ready(desktop);
  await open(mobile,link);await join(mobile,'Bia');await ready(mobile);
  const a=await session(desktop),b=await session(mobile);
  await desktop.getByRole('button',{name:'Ativar câmera',exact:true}).click();
  await mobile.getByRole('button',{name:'Ativar câmera',exact:true}).click();
  await media(mobile,a,'camera');await media(desktop,b,'camera');
  for(const page of[desktop,mobile])expect(await page.evaluate(()=>(window as any).__cameraChoices[0])).toMatchObject({id:'front',facing:'user'});
  await mobile.getByRole('button',{name:'Alternar câmera',exact:true}).tap();
  await expect.poll(()=>mobile.evaluate(()=>(window as any).__cameraChoices.at(-1))).toMatchObject({id:'rear',facing:'environment',frontReleased:true});
  await media(desktop,b,'camera');
  const local=desktop.locator(`[data-camera="${a}"]`);
  const remote=mobile.locator(`[data-camera="${a}"]`);
  await desktop.getByLabel('Câmera ativa',{exact:true}).selectOption('rear');
  await expect.poll(()=>desktop.evaluate(()=>(window as any).__cameraChoices.at(-1).id)).toBe('rear');
  await desktop.getByRole('button',{name:'Compartilhar tela',exact:true}).click();
  await media(mobile,a,'screenVideo');
  await mobile.evaluate(id=>{
   const w=window as any,call=document.querySelector('call-page') as any;
   w.__peer=call.voice.peers.get(id).pc;w.__cameraVideo=document.querySelector(`[data-camera="${id}"] video`);w.__cameraStream=w.__cameraVideo.srcObject;
   Object.defineProperty(HTMLElement.prototype,'requestFullscreen',{value:undefined,configurable:true});call.requestUpdate();
  },a);
  await remote.getByRole('button',{name:'Ampliar câmera de Alice'}).tap();
  await expect(remote).toHaveClass(/is-expanded/);
  await expect(remote.locator('video')).toHaveCSS('object-fit','contain');
  await remote.getByRole('button',{name:'Desmutar microfone'}).tap();await media(desktop,b,'microphone');
  await remote.getByRole('button',{name:'Mutar microfone'}).tap();
  await expect(remote.getByRole('button',{name:'Desmutar microfone'})).toBeVisible();
  await remote.getByRole('button',{name:'Desativar câmera'}).tap();await expect(remote).toHaveClass(/is-expanded/);
  await remote.getByRole('button',{name:'Ativar câmera'}).tap();await media(desktop,b,'camera');
  await mobile.screenshot({path:info.outputPath('remote-camera-mobile.png')});
  await remote.getByRole('button',{name:'Sair do modo expandido'}).tap();
  expect(await mobile.evaluate(id=>{
   const w=window as any,call=document.querySelector('call-page') as any;
   return call.voice.peers.get(id).pc===w.__peer&&w.__cameraVideo===document.querySelector(`[data-camera="${id}"] video`)&&w.__cameraVideo.srcObject===w.__cameraStream;
  },a)).toBe(true);

  await local.getByRole('button',{name:'Tela cheia da câmera de Alice'}).click();
  await expect.poll(()=>desktop.evaluate(()=>document.fullscreenElement?.classList.contains('call-camera-frame'))).toBe(true);
  await local.getByRole('button',{name:'Desmutar microfone'}).click();await media(mobile,a,'microphone');
  await local.getByRole('button',{name:'Mutar microfone'}).click();await media(mobile,a,'screenVideo');
  await desktop.keyboard.press('Escape');await expect.poll(()=>desktop.evaluate(()=>document.fullscreenElement)).toBe(null);
  const screen=desktop.locator('.call-preview');await screen.getByRole('button',{name:'Tela cheia',exact:true}).click();
  await expect.poll(()=>desktop.evaluate(()=>document.fullscreenElement?.classList.contains('call-preview'))).toBe(true);
  await screen.getByRole('button',{name:'Desmutar microfone'}).click();await media(mobile,a,'microphone');
  await screen.getByRole('button',{name:'Mutar microfone'}).click();
  await media(mobile,a,'screenVideo');await media(mobile,a,'screenAudio');await media(mobile,a,'camera');
  await desktop.screenshot({path:info.outputPath('screen-desktop-controls.png')});
  await screen.getByRole('button',{name:'Sair da tela cheia'}).click();
 }finally{await Promise.all([owner,desktop,mobile].map(page=>page.context().close()));await fixture.stop()}
});

test('individual listening levels isolate voice and screen audio and survive a reconnect',async({browser},info)=>{
 const fixture=await server(info.outputPath('channel.sqlite3'));
 const pages:Page[]=[];
 const tab=async(mobile=false)=>{const page=await visitor(browser,mobile);pages.push(page);return page};
 try{
  await fixture.start();const owner=await tab();await requireWebRTC(owner,fixture.origin);
  const link=await makeRoom(owner,fixture.origin);await owner.context().close();
  const listener=await tab(true),sender=await tab(),observer=await tab();
  for(const [page,name] of [[listener,'Alice'],[sender,'Bia'],[observer,'Caio']] as const){
   await open(page,link);await join(page,name);await ready(page);
  }
  const bia=await session(sender),caio=await session(observer);
  await sender.getByRole('button',{name:'Ativar microfone',exact:true}).click();
  await sender.getByRole('button',{name:'Ativar câmera',exact:true}).click();
  await sender.getByRole('button',{name:'Compartilhar tela',exact:true}).click();
  await observer.getByRole('button',{name:'Ativar microfone',exact:true}).click();
  for(const role of ['microphone','screenAudio','screenVideo','camera'])await media(listener,bia,role);
  await media(listener,caio,'microphone');await media(observer,bia,'microphone');
  const group=listener.getByRole('group',{name:'Áudio recebido de Bia'}),slider=group.getByRole('slider');
  await expect(slider).toHaveValue('100');
  await expect(listener.getByRole('group',{name:'Áudio recebido de Alice'})).toHaveCount(0);
  expect(await listener.evaluate(()=>!!(document.querySelector('call-page') as any).voice.audioMix.context)).toBe(false);

  const evidence=()=>listener.evaluate(({bia,caio})=>{
   const voice=(document.querySelector('call-page') as any).voice,mix=voice.audioMix;
   const peer=voice.peers.get(bia),other=voice.peers.get(caio),bus=mix.buses.get(bia);
   const inputs=[...mix.inputs.get(bia).values()] as {source?:AudioNode}[];
   return {gain:bus?Math.round(bus.gain.gain.value*100)/100:null,voiceMuted:peer.audio.muted,screenMuted:peer.elements.screenAudio.muted,
    routed:inputs.filter(input=>!!input.source).length,otherMuted:other.audio.muted,otherVolume:other.audio.volume,
    otherRouted:mix.buses.has(caio)};
  },{bia,caio});
  await slider.press('Home');await expect(slider).toHaveValue('0');
  await expect.poll(evidence).toMatchObject({gain:null,voiceMuted:true,screenMuted:true,routed:0,otherMuted:false,otherVolume:1,otherRouted:false});
  await slider.press('End');
  await expect.poll(evidence).toMatchObject({gain:2,voiceMuted:true,screenMuted:true,routed:2,otherMuted:false,otherVolume:1,otherRouted:false});
  await listener.evaluate(id=>{
   const w=window as any,voice=(document.querySelector('call-page') as any).voice,mix=voice.audioMix;
   const bus=mix.buses.get(id);
   w.__listeningContext=mix.context;w.__listeningPeer=voice.peers.get(id).pc;
   w.__listeningAnalyser=mix.context.createAnalyser();bus.ceiling.connect(w.__listeningAnalyser);
  },bia);
  const peak=()=>listener.evaluate(()=>{
   const analyser=(window as any).__listeningAnalyser as AnalyserNode,data=new Float32Array(analyser.fftSize);
   analyser.getFloatTimeDomainData(data);return data.reduce((peak,sample)=>Math.max(peak,Math.abs(sample)),0);
  });
  await expect.poll(peak).toBeGreaterThan(.03);expect(await peak()).toBeLessThan(.96);
  const setLevel=(volume:number)=>slider.evaluate((element:HTMLInputElement,volume)=>{element.value=String(volume);element.dispatchEvent(new Event('input',{bubbles:true}))},volume);
  await setLevel(50);await expect(group.locator('output')).toHaveText('50%');await expect.poll(evidence).toMatchObject({gain:.5});
  await group.getByRole('button',{name:'Restaurar volume de Bia a 100%'}).tap();
  await expect(group.locator('output')).toHaveText('100%');
  await expect.poll(evidence).toMatchObject({gain:null,routed:0,voiceMuted:false,screenMuted:false});
  await setLevel(150);await expect(group.locator('output')).toHaveText('150%');await expect.poll(evidence).toMatchObject({gain:1.5});
  await listener.evaluate(id=>{
   const w=window as any,mix=(document.querySelector('call-page') as any).voice.audioMix;
   mix.buses.get(id).ceiling.connect(w.__listeningAnalyser);
  },bia);
  await expect.poll(peak).toBeGreaterThan(.03);
  const observerEnergy=()=>observer.evaluate(async id=>{
   const peer=(document.querySelector('call-page') as any).voice.peers.get(id);
   const report=await peer.transceivers.microphone.receiver.getStats() as RTCStatsReport;
   return [...report.values()].find(row=>row.type==='inbound-rtp')?.totalAudioEnergy??0;
  },bia);
  const energyBeforeMute=await observerEnergy();
  await group.getByRole('button',{name:'Silenciar',exact:true}).tap();
  await expect(group).toContainText('Silenciado para você');await expect(slider).toHaveValue('150');
  await expect.poll(evidence).toMatchObject({gain:0,voiceMuted:true,screenMuted:true,routed:2,otherMuted:false,otherRouted:false});
  await expect.poll(peak).toBeLessThan(.001);
  await expect.poll(observerEnergy).toBeGreaterThan(energyBeforeMute);
  await media(observer,bia,'microphone');await media(observer,bia,'screenAudio');
  await expect(sender.getByRole('button',{name:'Desativar microfone',exact:true})).toBeVisible();

  await listener.evaluate(()=>{(document.querySelector('call-page') as any).call.socket.close()});
  await expect(listener.locator('.call-connection')).toHaveText('Reconectando…');await ready(listener);
  await expect(group.getByRole('button',{name:'Ouvir novamente'})).toBeVisible();await expect(slider).toHaveValue('150');
  await group.getByRole('button',{name:'Ouvir novamente'}).tap();await expect.poll(evidence).toMatchObject({gain:1.5,routed:2,otherMuted:false});
  expect(await listener.evaluate(id=>{
   const w=window as any,voice=(document.querySelector('call-page') as any).voice;
   return voice.peers.get(id).pc===w.__listeningPeer&&voice.audioMix.context===w.__listeningContext;
  },bia)).toBe(true);
  await sender.getByRole('button',{name:'Desativar microfone',exact:true}).click();
  await sender.getByRole('button',{name:'Ativar microfone',exact:true}).click();
  await media(observer,bia,'microphone');await media(listener,bia,'camera');await media(listener,bia,'screenVideo');
  await expect.poll(evidence).toMatchObject({gain:1.5,routed:2});
  await listener.setViewportSize({width:320,height:844});
  expect(await listener.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await group.screenshot({path:info.outputPath('individual-volume-mobile.png')});

  // Without Web Audio, the native route stays single and the UI reports the gain limit.
  await observer.evaluate(()=>{
   for(const name of ['AudioContext','webkitAudioContext'])Object.defineProperty(window,name,{configurable:true,value:undefined});
  });
  const fallback=observer.getByRole('group',{name:'Áudio recebido de Bia'});
  await fallback.getByRole('slider').press('End');await expect(fallback).toContainText('Ganho acima de 100% indisponível.');
  expect(await observer.evaluate(id=>{
   const voice=(document.querySelector('call-page') as any).voice;
   return voice.peers.get(id).audio.volume===1&&!voice.peers.get(id).audio.muted&&!voice.audioMix.context;
  },bia)).toBe(true);

  await sender.getByRole('button',{name:'Sair do canal',exact:true}).click();
  await expect(group).toHaveCount(0);
  expect(await listener.evaluate(id=>{
   const mix=(document.querySelector('call-page') as any).voice.audioMix;
   return !mix.inputs.has(id)&&!mix.buses.has(id)&&!mix.levels.has(id);
  },bia)).toBe(true);
  const late=await tab();await open(late,link);await join(late,'Dani');await ready(late);
  await expect(listener.getByRole('group',{name:'Áudio recebido de Dani'}).getByRole('slider')).toHaveValue('100');
  await listener.getByRole('button',{name:'Sair do canal',exact:true}).click();
  await expect.poll(()=>listener.evaluate(()=>(window as any).__listeningContext.state)).toBe('closed');
 }finally{await Promise.all(pages.map(page=>page.context().close()));await fixture.stop()}
});


test('V4 lobby hides inactive meeting controls and keeps a private call alive across site routes',async({browser},info)=>{
 const fixture=await server(info.outputPath('v4.sqlite3'));
 const page=await visitor(browser);
 try{
  await fixture.start();
  await page.goto(fixture.origin+'/#/call');
  await expect(page.getByRole('heading',{name:'Sala Permanente',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Criar sala privada',exact:true})).toBeVisible();
  await expect(page.locator('.call-layout')).toBeHidden();
  await expect(page.locator('.call-controls')).toBeHidden();
  await expect(page.locator('input[name="admin"]')).toHaveCount(0);
  await page.getByLabel('Seu nome',{exact:true}).fill('Teste V4');
  await page.getByRole('button',{name:'Criar sala privada',exact:true}).click();
  await expect(page.locator('.call-connection')).toHaveText('Conectado');
  await page.evaluate(()=>{location.hash='#/acoes'});
  await expect(page.locator('call-page')).toBeHidden();
  await expect(page.getByRole('link',{name:'Voltar à chamada'})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(document.querySelector('call-page') as any).call.state)).toBe('connected');
  await page.getByRole('button',{name:'Ativar microfone',exact:true}).last().click().catch(()=>{});
  await page.getByRole('link',{name:'Voltar à chamada'}).click();
  await expect(page.locator('.call-connection')).toHaveText('Conectado');
  await expect(page.locator('.call-layout')).toBeVisible();
  await page.getByRole('button',{name:'Sair da sala',exact:true}).click();
  await expect(page.locator('.call-layout')).toBeHidden();
 }finally{await page.context().close();await fixture.stop()}
});

test('V4 channel accepts an administrator-defined five-character password',async({browser},info)=>{
 const fixture=await server(info.outputPath('short-password.sqlite3'));
 const page=await visitor(browser);
 try{
  await fixture.start();
  await page.goto(fixture.origin+'/#/call/gerenciar');
  await admin(page,'Consultar sala');
  await page.getByLabel('Nome da sala',{exact:true}).fill('Sala Curta');
  await page.getByLabel('Senha da sala',{exact:true}).fill('abcde');
  await admin(page,'Criar sala permanente');
  const link=(await page.getByRole('link',{name:'Abrir sala',exact:true}).getAttribute('href'))!;
  await page.goto(link);
  await expect(page.getByLabel('Senha da sala',{exact:true})).toBeVisible();
  await join(page,'Visitante V4','abcde');
  await expect(page.locator('.call-connection')).toHaveText('Conectado');
 }finally{await page.context().close();await fixture.stop()}
});
