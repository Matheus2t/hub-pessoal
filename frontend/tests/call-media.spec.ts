import {test,expect,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const origin=process.env.CALL_TEST_URL||'http://127.0.0.1:8001',key=process.env.CALL_TEST_ADMIN_KEY;
const tone=resolve('.vercel/call-stage4-tone.wav');
test.skip(!key,'Start the private single-process Call service and set CALL_TEST_ADMIN_KEY.');
test.setTimeout(120000);
test.use({launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',`--use-file-for-fake-audio-capture=${tone}`]}});
test.beforeAll(()=>{
 mkdirSync(resolve('.vercel'),{recursive:true});const rate=48000,samples=rate*2,data=Buffer.alloc(44+samples*2);
 data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);
 data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);
 data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(samples*2,40);
 for(let n=0;n<samples;n++)data.writeInt16LE(Math.round(4000*Math.sin(2*Math.PI*440*n/rate)),44+n*2);writeFileSync(tone,data);
});
async function tab(browser:Browser){
 const context=await browser.newContext({permissions:['microphone','camera','clipboard-read','clipboard-write'],ignoreHTTPSErrors:process.env.CALL_TEST_LOCAL_TLS==='1'}),page=await context.newPage();
 await page.addInitScript(()=>{
  const w=window as any,native=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);w.__captures=[];w.__screens=[];w.__cameraTimers=[];
  // Count message types only. Never retain credentials, SDP, candidates or frame payloads.
  const send=WebSocket.prototype.send;w.__signalWindow=[];w.__peakSignals=0;w.__signalTypes={};
  WebSocket.prototype.send=function(data){if(typeof data==='string'){const {type}=JSON.parse(data);
   if(!['create','join','resume'].includes(type)){const now=performance.now();w.__signalWindow=w.__signalWindow.filter((t:number)=>t>now-10000);w.__signalWindow.push(now);w.__peakSignals=Math.max(w.__peakSignals,w.__signalWindow.length);w.__signalTypes[type]=(w.__signalTypes[type]??0)+1}
  }return send.call(this,data)};
  navigator.mediaDevices.getUserMedia=async options=>{
   if(w.__denyCamera&&options?.video)throw new DOMException('Denied','NotAllowedError');
   let stream:MediaStream;
   if(options?.video){const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const draw=canvas.getContext('2d')!;let frame=0;
    const paint=()=>{draw.fillStyle='#ddd';draw.fillRect(0,0,640,360);draw.fillStyle='#333';draw.fillRect(60,(frame++*3)%240,240,120)};paint();w.__cameraTimers.push(setInterval(paint,60));stream=canvas.captureStream(20);
   }else stream=await native(options);w.__captures.push(stream);
   if(w.__delayCamera&&options?.video)return new Promise(resolve=>w.__resolveCamera=()=>resolve(stream));return stream;
  };
  navigator.mediaDevices.getDisplayMedia=()=>{
   if(w.__denyDisplay)return Promise.reject(new DOMException('Cancelled','NotAllowedError'));
   const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;const draw=canvas.getContext('2d')!;let frame=0;
   const paint=()=>{draw.fillStyle='#222';draw.fillRect(0,0,960,540);draw.fillStyle='#eee';draw.fillRect((frame++*7)%800,60,160,350);draw.font='48px sans-serif';draw.fillText(`2T TEST ${frame}`,40,500)};paint();
   const timer=setInterval(paint,70),stream=canvas.captureStream(15);
   let audio:AudioContext|undefined;
   if(!w.__noScreenAudio){audio=new AudioContext();const oscillator=audio.createOscillator(),destination=audio.createMediaStreamDestination();oscillator.frequency.value=660;oscillator.connect(destination);oscillator.start();void audio.resume();destination.stream.getAudioTracks().forEach(t=>stream.addTrack(t))}
   w.__screens.push({stream,audio,timer});w.__captures.push(stream);
   if(w.__delayDisplay)return new Promise(resolve=>w.__resolveDisplay=()=>resolve(stream));return Promise.resolve(stream);
  };
 });
 return {context,page};
}
async function owner(page:Page){
 await page.goto(`${origin}/#/call`);await page.getByLabel('Seu nome',{exact:true}).fill('Anfitrião');await page.getByText('Sou o proprietário',{exact:true}).click();
 await page.getByLabel('Credencial do proprietário',{exact:true}).fill(key!);await page.getByRole('button',{name:'Criar sala privada',exact:true}).click();
 await expect(page.locator('.call-connection')).toHaveText('Conectado');await page.getByRole('button',{name:'Copiar convite',exact:true}).click();return page.evaluate(()=>navigator.clipboard.readText());
}
async function guest(page:Page,host:Page,invite:string,name:string){
 await page.goto(invite);await page.getByLabel('Seu nome',{exact:true}).fill(name);await page.getByRole('button',{name:'Entrar por convite',exact:true}).click();
 await host.getByRole('button',{name:`Aceitar ${name}`,exact:true}).click();await expect(page.locator('.call-connection')).toHaveText('Conectado');
}
async function enter(page:Page){await page.getByRole('button',{name:'Entrar na chamada',exact:true}).click();await page.getByRole('button',{name:'Ativar microfone',exact:true}).click();await expect(page.getByRole('button',{name:'Desativar microfone',exact:true})).toBeVisible()}
async function id(page:Page){return page.evaluate(()=>(document.querySelector('call-page') as any).call.session.participant as string)}
async function evidence(page:Page,from:string,role:string){
 return page.evaluate(async({from,role})=>{
  const peer=(document.querySelector('call-page') as any).voice.peers.get(from);if(!peer?.transceivers[role])return {packets:0,energy:0,frames:0,playing:false};
  const report=await peer.transceivers[role].receiver.getStats();let packets=0,energy=0,frames=0;
  report.forEach((s:any)=>{if(s.type==='inbound-rtp'){packets+=s.packetsReceived??0;energy+=s.totalAudioEnergy??0;frames+=s.framesDecoded??0}});
  const element=peer.elements[role];return {packets,energy,frames,width:element.videoWidth,height:element.videoHeight,playing:!!element.srcObject&&!element.paused&&element.currentTime>0&&(element.tagName!=='VIDEO'||element.videoWidth>0),muted:element.muted};
 },{from,role});
}
async function media(page:Page,from:string,role:string){
 if(await page.getByRole('button',{name:'Liberar áudio',exact:true}).isVisible())await page.getByRole('button',{name:'Liberar áudio',exact:true}).click();
 await expect.poll(async()=>{const s=await evidence(page,from,role);return s.packets>0&&s.playing&&(role==='microphone'||role==='screenAudio'?s.energy>0:s.frames>0)?'playing':JSON.stringify({role,...s})},{timeout:20000}).toBe('playing');
}
async function closedSources(page:Page){await expect.poll(()=>page.evaluate(()=>(window as any).__captures.every((s:MediaStream)=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true)}
async function connected(page:Page,count:number){await expect.poll(()=>page.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].filter((p:any)=>p.pc.connectionState==='connected').length),{timeout:20000}).toBe(count)}
async function finish(pages:Page[],contexts:BrowserContext[]){
 for(const page of pages)if(!page.isClosed())await page.evaluate(()=>{for(const s of(window as any).__screens??[]){clearInterval(s.timer);void s.audio?.close()}for(const timer of(window as any).__cameraTimers??[])clearInterval(timer)}).catch(()=>{});
 await Promise.all(contexts.map(c=>c.close()));
}

test('screen, independent audio and camera reach five real peers including late arrivals',async({browser},info)=>{
 const pages:Page[]=[],contexts:BrowserContext[]=[],errors:string[]=[];
 const add=async()=>{const t=await tab(browser);pages.push(t.page);contexts.push(t.context);t.page.on('pageerror',e=>errors.push(e.message));return t.page};
 try{
  const host=await add(),invite=await owner(host);await enter(host);const hostId=await id(host),second=await add();await guest(second,host,invite,'Pessoa 1');await enter(second);await media(second,hostId,'microphone');
  await host.getByRole('button',{name:'Compartilhar tela',exact:true}).click();await host.getByRole('button',{name:'Ativar câmera',exact:true}).click();
  for(const role of['screenVideo','screenAudio','camera','microphone'])await media(second,hostId,role);
  expect((await evidence(second,hostId,'screenVideo')).width).toBe(960);expect((await evidence(second,hostId,'camera')).width).toBe(640);
  expect(await host.evaluate(()=>{const page=(document.querySelector('call-page') as any);return [...page.voice.peers.values()].every((p:any)=>
   p.transceivers.microphone.sender.track===page.microphone.getAudioTracks()[0]&&p.transceivers.screenAudio.sender.track===page.capture.screen.getAudioTracks()[0]&&p.transceivers.screenVideo.sender.track===page.capture.screen.getVideoTracks()[0]&&p.transceivers.camera.sender.track===page.capture.camera.getVideoTracks()[0])})).toBe(true);
  expect(await host.locator('video[aria-label="Prévia da câmera"]').evaluate((v:HTMLVideoElement)=>v.muted)).toBe(true);
  const result=[];
  for(let n=2;n<=4;n++){const p=await add();await guest(p,host,invite,`Pessoa ${n}`);await enter(p);
   for(const role of['screenVideo','screenAudio','camera','microphone'])await media(p,hostId,role);
   for(const current of pages)await connected(current,n);
   result.push({participants:n+1,receiver:await evidence(p,hostId,'screenVideo'),audio:await evidence(p,hostId,'screenAudio'),camera:await evidence(p,hostId,'camera')});
  }
  for(const page of pages)await page.evaluate(()=>{const mesh=(document.querySelector('call-page') as any).voice;(window as any).__stable=[...mesh.peers.values()].map((p:any)=>({pc:p.pc,mids:p.pc.getTransceivers().map((t:RTCRtpTransceiver)=>t.mid)}))});
  const before=await evidence(second,hostId,'screenAudio');await host.getByRole('button',{name:'Desativar microfone',exact:true}).click();
  await expect.poll(async()=> (await evidence(second,hostId,'screenAudio')).energy).toBeGreaterThan(before.energy);
  expect(await host.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].every((p:any)=>p.transceivers.microphone.sender.track===null&&p.transceivers.screenAudio.sender.track!==null))).toBe(true);
  await host.getByRole('button',{name:'Ativar microfone',exact:true}).click();await media(second,hostId,'microphone');
  // Each receiver has a decoded frame and an advancing remote video, not just a DOM placeholder.
  for(const p of pages.slice(1))for(const role of['screenVideo','screenAudio','camera'])await media(p,hostId,role);
  for(const width of[1366,768,390,320])for(const theme of['dark','light'])await test.step(`layout ${width}px ${theme}`,async()=>{
   await host.setViewportSize({width,height:950});await host.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   await host.evaluate(()=>window.scrollTo(0,0));
   await host.evaluate(async()=>Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().endTime!==Infinity).map(a=>a.finished.catch(()=>{}))));
   expect(await host.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   expect(await host.locator('.call-preview').evaluate(e=>e.getBoundingClientRect().right<=e.parentElement!.getBoundingClientRect().right)).toBe(true);
   if(width<=768)expect(await host.locator('.call-people').evaluate(e=>e.getBoundingClientRect().top>=document.querySelector('.call-stage')!.getBoundingClientRect().bottom)).toBe(true);
   await expect(host.getByRole('button',{name:'Desativar câmera',exact:true})).toBeVisible();await host.screenshot({path:info.outputPath(`media-${width}-${theme}.png`),fullPage:true,animations:'disabled',timeout:10000});
  },{timeout:15000});
  const extra=await add();await extra.goto(invite);await extra.getByLabel('Seu nome',{exact:true}).fill('Sexto');await extra.getByRole('button',{name:'Entrar por convite',exact:true}).click();await expect(extra.getByRole('alert')).toContainText('cinco vagas');
  const framesBeforePressure=(await evidence(second,hostId,'screenVideo')).frames;
  // Inject encoder pressure into real stats to exercise adaptation without saturating the host CPU.
  await host.evaluate(async()=>{const mesh=(document.querySelector('call-page') as any).voice;
   for(const peer of mesh.peers.values()){peer.originalStats=peer.pc.getStats.bind(peer.pc);peer.pc.getStats=async()=>{const original=await peer.originalStats(),report=new Map();original.forEach((s:any,id:string)=>report.set(id,{...s,...(s.type==='outbound-rtp'&&s.kind==='video'?{qualityLimitationReason:(window as any).__pressure?'cpu':'none'}:{})}));return report}}
   (window as any).__pressure=true;await mesh.measure();
  });
  await expect.poll(()=>host.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].map((p:any)=>({limited:p.limited,fps:p.transceivers.screenVideo.sender.getParameters().encodings[0].maxFramerate})))).toEqual(Array.from({length:4},()=>({limited:true,fps:15})));
  await media(second,hostId,'screenVideo');
  await expect.poll(async()=>(await evidence(second,hostId,'screenVideo')).frames).toBeGreaterThan(framesBeforePressure);
  const reducedFrames=(await evidence(second,hostId,'screenVideo')).frames;
  await host.evaluate(async()=>{(window as any).__pressure=false;const mesh=(document.querySelector('call-page') as any).voice;for(let n=0;n<3;n++)await mesh.measure()});
  await expect.poll(()=>host.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].every((p:any)=>!p.limited&&p.transceivers.screenVideo.sender.getParameters().encodings[0].maxFramerate===30))).toBe(true);
  await expect.poll(async()=>(await evidence(second,hostId,'screenVideo')).frames).toBeGreaterThan(reducedFrames);
  await host.evaluate(()=>{for(const peer of(document.querySelector('call-page') as any).voice.peers.values()){peer.pc.getStats=peer.originalStats;delete peer.originalStats}});
  await host.getByRole('button',{name:'Desativar câmera',exact:true}).click();
  for(const p of pages.slice(1,5))await expect.poll(()=>p.evaluate(from=>{const mesh=(document.querySelector('call-page') as any).voice;return mesh.peers.get(from).elements.camera.srcObject===null},hostId)).toBe(true);
  await host.getByRole('button',{name:'Ativar câmera',exact:true}).click();await media(second,hostId,'camera');
  // Native browser stop is represented by the track's native ended event.
  await host.evaluate(()=>{const video=(document.querySelector('call-page') as any).capture.screen.getVideoTracks()[0];video.stop();video.dispatchEvent(new Event('ended'))});
  await expect(host.getByRole('button',{name:'Compartilhar tela',exact:true})).toBeVisible();
  for(const p of pages.slice(1,5))await expect(p.locator('.call-caption')).toHaveText('Nenhuma tela compartilhada');
  await media(second,hostId,'camera');await media(second,hostId,'microphone');
  for(const p of pages.slice(0,5))expect(await p.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].every((p:any)=>(window as any).__stable.some((old:any)=>old.pc===p.pc&&JSON.stringify(old.mids)===JSON.stringify(p.pc.getTransceivers().map((t:RTCRtpTransceiver)=>t.mid)))))).toBe(true);
  await host.evaluate(async()=>{const mesh=(document.querySelector('call-page') as any).voice;await mesh.measure();(window as any).__metrics=mesh.diagnostics()});
  const signaling=await Promise.all(pages.slice(0,5).map(p=>p.evaluate(()=>({peakMessagesPer10s:(window as any).__peakSignals,types:(window as any).__signalTypes}))));
  writeFileSync(info.outputPath('five-peer-media.json'),JSON.stringify({receivers:result,signaling,diagnostics:await host.evaluate(()=>(window as any).__metrics)},null,2));
  await host.getByRole('button',{name:'Encerrar sala',exact:true}).click();for(const p of pages.slice(0,5))await closedSources(p);
  expect(errors).toEqual([]);
 }catch(error){
  writeFileSync(info.outputPath('media-failure.json'),JSON.stringify(await Promise.all(pages.map(p=>p.evaluate(()=>{const page=(document.querySelector('call-page') as any);return {error:page.capture.error,voice:page.voice.error,roomError:page.call.error,signals:(window as any).__signalTypes,peakSignals:(window as any).__peakSignals,screen:page.call.screen,capture:!!page.capture.screen,transmitting:page.capture.transmitting,
   peers:[...page.voice.peers.values()].map((p:any)=>({phase:p.phase,failure:p.failure,state:p.pc.connectionState,roles:p.remoteRoles,senders:Object.entries(p.transceivers).map(([role,t]:[string,any])=>({role,mid:t.mid,track:t.sender.track?.kind,state:t.sender.track?.readyState,direction:t.currentDirection})),elements:Object.entries(p.elements).map(([role,e]:[string,any])=>({role,stream:!!e.srcObject,paused:e.paused,width:e.videoWidth,time:e.currentTime,attached:e.isConnected}))}))}}))),null,2));throw error;
 }finally{await finish(pages,contexts)}
});

test('simultaneous screen requests, silent screen, ended audio and disconnect release',async({browser})=>{
 const a=await tab(browser),b=await tab(browser),pages=[a.page,b.page];
 try{
  const invite=await owner(a.page);await guest(b.page,a.page,invite,'Convidado');await enter(a.page);await enter(b.page);await connected(a.page,1);
  for(const page of pages)await page.evaluate(()=>{(window as any).__delayDisplay=true});
  // Invoke both handlers before either claim can update the other's UI.
  await Promise.all(pages.map(p=>p.evaluate(()=>(document.querySelector('call-page') as any).capture.toggleScreen())));
  await expect.poll(async()=> (await Promise.all(pages.map(p=>p.evaluate(()=>(document.querySelector('call-page') as any).capture.error)))).filter(Boolean).length).toBe(1);
  for(const p of pages)await p.evaluate(()=>(window as any).__resolveDisplay());
  const winner=await a.page.evaluate(()=>(document.querySelector('call-page') as any).capture.error)?b.page:a.page,loser=winner===a.page?b.page:a.page;
  const winnerId=await id(winner);await media(loser,winnerId,'screenVideo');await media(loser,winnerId,'screenAudio');
  await expect.poll(()=>loser.evaluate(()=>(window as any).__screens[0].stream.getTracks().every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
  await expect(loser.getByRole('button',{name:'Compartilhar tela',exact:true})).toBeDisabled();
  await winner.evaluate(()=>{const t=(document.querySelector('call-page') as any).capture.screen.getAudioTracks()[0];t.stop();t.dispatchEvent(new Event('ended'))});
  await expect(loser.locator('.call-caption')).toContainText('sem áudio compartilhado');await media(loser,winnerId,'screenVideo');await media(loser,winnerId,'microphone');
  await winner.getByRole('button',{name:'Parar compartilhamento',exact:true}).click();
  await winner.evaluate(()=>{(window as any).__delayDisplay=false;(window as any).__noScreenAudio=true});
  await winner.getByRole('button',{name:'Compartilhar tela',exact:true}).click();await media(loser,winnerId,'screenVideo');
  await expect(loser.locator('.call-caption')).toContainText('sem áudio compartilhado');
  await winner.getByRole('button',{name:'Ativar câmera',exact:true}).click();await media(loser,winnerId,'camera');
  await winner.evaluate(()=>(document.querySelector('call-page') as any).call.socket.close());
  await expect(loser.locator('.call-caption')).toHaveText('Nenhuma tela compartilhada');
  await expect(winner.locator('.call-connection')).toHaveText('Conectado');
  await expect(winner.getByRole('button',{name:'Ativar câmera',exact:true})).toBeVisible();
  expect(await winner.evaluate(()=>(window as any).__screens.every((s:any)=>s.stream.getTracks().every((t:MediaStreamTrack)=>t.readyState==='ended')))).toBe(true);
  await media(loser,winnerId,'microphone');
  await b.page.evaluate(()=>{(window as any).__delayDisplay=false;(window as any).__noScreenAudio=false});
  await b.page.getByRole('button',{name:'Compartilhar tela',exact:true}).click();await b.page.getByRole('button',{name:'Ativar câmera',exact:true}).click();
  await media(a.page,await id(b.page),'screenVideo');await media(a.page,await id(b.page),'camera');
  await b.page.evaluate(()=>{(window as any).__oldCall=document.querySelector('call-page');location.hash='#/'});await closedSources(b.page);
  expect(await b.page.evaluate(()=>(window as any).__oldCall.voice.peers.size)).toBe(0);
  await expect(a.page.locator('.call-caption')).toHaveText('Nenhuma tela compartilhada');
  await a.page.getByRole('button',{name:'Encerrar sala',exact:true}).click();await closedSources(a.page);
 }finally{await finish(pages,[a.context,b.context])}
});

test('permission refusal, cancelled and late captures, local preview and route cleanup',async({browser})=>{
 const a=await tab(browser),b=await tab(browser),pages=[a.page,b.page];
 try{
  await a.page.goto(`${origin}/#/call`);await a.page.getByRole('button',{name:'Compartilhar tela',exact:true}).click();
  await expect(a.page.locator('.call-caption')).toContainText('Prévia local');
  expect(await a.page.evaluate(()=>(document.querySelector('call-page') as any).voice.peers.size)).toBe(0);
  await a.page.getByRole('button',{name:'Parar compartilhamento',exact:true}).click();await closedSources(a.page);
  const invite=await owner(a.page);await guest(b.page,a.page,invite,'Convidado');await enter(a.page);await enter(b.page);await media(b.page,await id(a.page),'microphone');
  await a.page.evaluate(()=>{(window as any).__denyDisplay=true;(window as any).__denyCamera=true});
  await a.page.getByRole('button',{name:'Compartilhar tela',exact:true}).click();await expect(a.page.getByRole('alert')).toContainText('cancelado');
  await a.page.getByRole('button',{name:'Ativar câmera',exact:true}).click();await expect(a.page.getByRole('alert')).toContainText('Permita');
  await a.page.evaluate(()=>{(window as any).__denyDisplay=false;(window as any).__denyCamera=false;(window as any).__delayDisplay=true;(window as any).__delayCamera=true});
  await a.page.getByRole('button',{name:'Compartilhar tela',exact:true}).click();await a.page.getByRole('button',{name:'Cancelar seleção de tela',exact:true}).click();
  await a.page.evaluate(()=>(window as any).__resolveDisplay());await expect.poll(()=>a.page.evaluate(()=>(window as any).__screens.at(-1).stream.getTracks().every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
  await a.page.getByRole('button',{name:'Ativar câmera',exact:true}).click();await expect.poll(()=>a.page.evaluate(()=>typeof(window as any).__resolveCamera)).toBe('function');
  await a.page.getByRole('button',{name:'Compartilhar tela',exact:true}).click();
  await a.page.evaluate(()=>{(window as any).__oldCall=document.querySelector('call-page');location.hash='#/'});
  await a.page.evaluate(()=>{(window as any).__resolveCamera();(window as any).__resolveDisplay()});await closedSources(a.page);
  expect(await a.page.evaluate(()=>(window as any).__oldCall.voice.peers.size)).toBe(0);
  await expect(b.page.locator('.call-connection')).toHaveText('Conexão encerrada');await closedSources(b.page);
 }finally{await finish(pages,[a.context,b.context])}
});
