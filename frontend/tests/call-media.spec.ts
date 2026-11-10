import {test,expect,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const origin=process.env.CALL_TEST_URL||'http://127.0.0.1:8001',key=process.env.CALL_TEST_ADMIN_KEY;
const previewAssets=process.env.CALL_MEDIA_TEST_ASSETS;
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
async function tab(browser:Browser,mobile=false){
 const context=await browser.newContext({permissions:['microphone','camera','clipboard-read','clipboard-write'],ignoreHTTPSErrors:process.env.CALL_TEST_LOCAL_TLS==='1',...(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{})}),page=await context.newPage();
 if(previewAssets)await page.route(url=>url.origin===new URL(origin).origin&&['/bundle.js','/styles.css'].includes(url.pathname),route=>
  route.fulfill({path:resolve(previewAssets,new URL(route.request().url()).pathname.slice(1))}));
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
  navigator.mediaDevices.getDisplayMedia=(options?:DisplayMediaStreamOptions)=>{
   w.__displayRequest=options;
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
 await page.goto(`${origin}/#/call`);await page.getByLabel('Seu nome',{exact:true}).fill('Anfitrião');
 await page.getByRole('button',{name:'Criar sala privada',exact:true}).click();
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
 if(role==='screenVideo'||role==='screenAudio'){
  const button=page.getByRole('button',{name:'Assistir',exact:true});
  const watching=page.getByRole('button',{name:'Parar de assistir',exact:true});
  await expect.poll(async()=>await button.isVisible()||await watching.isVisible(),{timeout:15000}).toBe(true);
  if(await button.isVisible()){
   const selected=await page.evaluate(()=>(document.querySelector('call-page') as any).viewedScreen?.owner);
   if(selected===from)await button.click();
  }
 }
 if(await page.getByRole('button',{name:'Liberar áudio',exact:true}).isVisible())await page.getByRole('button',{name:'Liberar áudio',exact:true}).click();
 await expect.poll(async()=>{const s=await evidence(page,from,role);return s.packets>0&&s.playing&&(role==='microphone'||role==='screenAudio'?s.energy>0:s.frames>0)?'playing':JSON.stringify({role,...s})},{timeout:20000}).toBe('playing');
}
async function closedSources(page:Page){await expect.poll(()=>page.evaluate(()=>(window as any).__captures.every((s:MediaStream)=>s.getTracks().every(t=>t.readyState==='ended')))).toBe(true)}
async function connected(page:Page,count:number){await expect.poll(()=>page.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].filter((p:any)=>p.pc.connectionState==='connected').length),{timeout:20000}).toBe(count)}
async function finish(pages:Page[],contexts:BrowserContext[]){
 for(const page of pages)if(!page.isClosed())await page.evaluate(()=>{for(const s of(window as any).__screens??[]){clearInterval(s.timer);void s.audio?.close()}for(const timer of(window as any).__cameraTimers??[])clearInterval(timer)}).catch(()=>{});
 await Promise.all(contexts.map(c=>c.close()));
}

test('native Picture-in-Picture follows the remote share across tabs and releases it on exit',async({browser})=>{
 const host=await tab(browser),receiver=await tab(browser),unsupported=await tab(browser,true);
 const page=receiver.page;
 const button=page.getByRole('button',{name:'Janela flutuante',exact:true});
 const share=host.page.getByRole('button',{name:'Compartilhar tela',exact:true});
 const stop=host.page.getByRole('button',{name:'Parar compartilhamento',exact:true});
 const pip=()=>page.evaluate(()=>document.pictureInPictureElement?.getAttribute('data-role')??null);
 await unsupported.page.addInitScript(()=>Object.defineProperty(document,'pictureInPictureEnabled',{value:false}));
 try{
  const invite=await owner(host.page);await enter(host.page);
  for(const [viewer,name] of [[page,'Desktop'],[unsupported.page,'Celular']] as const){
   await guest(viewer,host.page,invite,name);await enter(viewer);
  }
  await expect(button).toHaveCount(0);
  await share.click();
  const hostId=await id(host.page);
  await expect(page.getByRole('button',{name:'Assistir',exact:true})).toBeVisible();
  await expect(page.locator('.call-remote-screen video')).toHaveCount(0);
  await media(page,hostId,'screenVideo');await media(page,hostId,'screenAudio');await media(page,hostId,'microphone');
  await media(unsupported.page,hostId,'screenVideo');
  await expect(unsupported.page.getByRole('button',{name:'Janela flutuante',exact:true})).toHaveCount(0);
  await expect(host.page.getByRole('button',{name:'Janela flutuante',exact:true})).toHaveCount(0);

  const sameMedia=await page.evaluateHandle(hostId=>{
   const peer=(document.querySelector('call-page') as any).voice.peers.get(hostId);
   const {screenVideo:video,screenAudio:audio,microphone}=peer.elements;
   return {peer,video,stream:video.srcObject,audio,microphone};
  },hostId);
  await button.click();await expect.poll(pip).toBe('screenVideo');
  await expect(button).toHaveAttribute('aria-pressed','true');
  const before=await evidence(page,hostId,'screenVideo'),audioBefore=await evidence(page,hostId,'screenAudio');
  const otherTab=await receiver.context.newPage();
  await otherTab.bringToFront();
  await expect.poll(pip).toBe('screenVideo');
  await expect.poll(async()=>(await evidence(page,hostId,'screenVideo')).frames).toBeGreaterThan(before.frames);
  await expect.poll(async()=>(await evidence(page,hostId,'screenAudio')).energy).toBeGreaterThan(audioBefore.energy);
  await page.bringToFront();await otherTab.close();
  await page.evaluate(()=>document.exitPictureInPicture());
  await expect(button).toHaveAttribute('aria-pressed','false');
  expect(await sameMedia.evaluate(({peer,video,stream,audio,microphone})=>{
   const root=document.querySelector('.call-remote-screen');
   const outputs=[...document.querySelectorAll<HTMLAudioElement>('.call-remote-audio [data-role="screenAudio"]')].filter(el=>el.srcObject);
   return {video:root?.firstElementChild===video&&video.srcObject===stream,muted:video.muted,
    peer:peer.pc.connectionState,audio:outputs.length===1&&outputs[0]===audio,microphone:microphone.isConnected};
  })).toEqual({video:true,muted:true,peer:'connected',audio:true,microphone:true});
  await sameMedia.dispose();
  await media(page,hostId,'screenVideo');

  await button.click();await expect.poll(pip).toBe('screenVideo');
  await button.click();await expect.poll(pip).toBe(null);
  await button.click();await expect.poll(pip).toBe('screenVideo');
  await stop.click();
  await expect.poll(pip).toBe(null);
  await expect(button).toHaveCount(0);
  await media(page,hostId,'microphone');

  await share.click();await media(page,hostId,'screenVideo');
  await button.click();await expect.poll(pip).toBe('screenVideo');
  await page.getByRole('button',{name:'Sair da chamada',exact:true}).click();
  await expect.poll(pip).toBe(null);
  await expect(button).toHaveCount(0);
 }finally{await finish([host.page,page,unsupported.page],[host.context,receiver.context,unsupported.context])}
});

test('remote fullscreen preserves the video, stream and peer; stopping the share closes both viewers',async({browser},info)=>{
 const host=await tab(browser),guestDesktop=await tab(browser),guestMobile=await tab(browser,true);
 const {page}=host,desktop=guestDesktop.page,mobile=guestMobile.page;
 try{
  const invite=await owner(page);await enter(page);
  await guest(desktop,page,invite,'Desktop');await enter(desktop);
  await guest(mobile,page,invite,'Celular');await enter(mobile);
  await page.getByRole('button',{name:'Compartilhar tela',exact:true}).click();
  await page.getByRole('button',{name:'Ativar câmera',exact:true}).click();
  const hostId=await id(page);
  for(const viewer of[desktop,mobile]){
   for(const role of['screenVideo','screenAudio','microphone','camera'])await media(viewer,hostId,role);
   await viewer.evaluate(hostId=>{
    const w=window as any,call=document.querySelector('call-page') as any;
    const video=document.querySelector('.call-remote-screen video') as HTMLVideoElement;
    w.__viewerRefs={video,stream:video.srcObject,pc:call.voice.peers.get(hostId).pc,removed:0};
    new MutationObserver(records=>{
     for(const r of records)for(const node of r.removedNodes)if(node===video)w.__viewerRefs.removed++;
    }).observe(video.parentElement!,{childList:true});
   },hostId);
  }
  const full=desktop.locator('.call-fullscreen');
  await full.click();await expect.poll(()=>desktop.evaluate(()=>document.fullscreenElement?.classList.contains('call-preview'))).toBe(true);
  await expect(full).toHaveText('Sair da tela cheia');
  const before=(await evidence(desktop,hostId,'screenVideo')).frames;
  await expect.poll(async()=>(await evidence(desktop,hostId,'screenVideo')).frames).toBeGreaterThan(before);
  await full.click();await expect.poll(()=>desktop.evaluate(()=>document.fullscreenElement)).toBe(null);
  await full.click();await expect.poll(()=>desktop.evaluate(()=>document.fullscreenElement?.classList.contains('call-preview'))).toBe(true);

  await mobile.evaluate(()=>{
   Object.defineProperty(HTMLElement.prototype,'requestFullscreen',{configurable:true,value:undefined});
   (document.querySelector('call-page') as any).requestUpdate();
  });
  const expanded=mobile.getByRole('button',{name:'Ampliar tela',exact:true});
  await expanded.tap();
  await expect(mobile.getByRole('button',{name:'Sair do modo expandido',exact:true})).toBeInViewport();
  expect(await mobile.locator('.call-preview').evaluate(el=>{
   const r=el.getBoundingClientRect();
   return r.x===0&&r.y===0&&Math.abs(r.width-innerWidth)<2&&Math.abs(r.height-innerHeight)<2&&getComputedStyle(el.querySelector('.call-remote-screen video')!).objectFit==='contain';
  })).toBe(true);
  await mobile.screenshot({path:info.outputPath('remote-expanded-mobile.png')});

  for(const viewer of[desktop,mobile]){
   expect(await viewer.evaluate(hostId=>{
    const {video,stream,pc,removed}=(window as any).__viewerRefs;
    const call=document.querySelector('call-page') as any;
    return video===document.querySelector('.call-remote-screen video')&&video.srcObject===stream&&call.voice.peers.get(hostId).pc===pc&&pc.connectionState==='connected'&&removed===0;
   },hostId)).toBe(true);
   for(const role of['screenVideo','screenAudio','microphone','camera'])await media(viewer,hostId,role);
  }
  await page.getByRole('button',{name:'Parar compartilhamento',exact:true}).click();
  for(const viewer of[desktop,mobile]){
   await expect(viewer.locator('.call-fullscreen')).toHaveCount(0);
   await expect(viewer.locator('.is-expanded')).toHaveCount(0);
   await expect.poll(()=>viewer.evaluate(()=>document.fullscreenElement)).toBe(null);
   expect(await viewer.evaluate(()=>getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
   await media(viewer,hostId,'microphone');await media(viewer,hostId,'camera');
  }
 }finally{await finish([page,desktop,mobile],[host.context,guestDesktop.context,guestMobile.context])}
});

test('screen, independent audio and camera reach five real peers including late arrivals',async({browser},info)=>{
 const pages:Page[]=[],contexts:BrowserContext[]=[],errors:string[]=[];
 const add=async()=>{const t=await tab(browser);pages.push(t.page);contexts.push(t.context);t.page.on('pageerror',e=>errors.push(e.message));return t.page};
 try{
  const host=await add(),invite=await owner(host);await enter(host);const hostId=await id(host),second=await add();await guest(second,host,invite,'Pessoa 1');await enter(second);await media(second,hostId,'microphone');
  await host.getByRole('button',{name:'Compartilhar tela',exact:true}).click();await host.getByRole('button',{name:'Ativar câmera',exact:true}).click();
  await expect(host.locator('.call-layout')).toHaveAttribute('data-sharing','');
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
  await expect.poll(()=>host.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].every((p:any)=>p.transceivers.microphone.sender.track===null&&p.transceivers.screenAudio.sender.track!==null))).toBe(true);
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
  // Synthetic encoder pressure exercises progressive quality without saturating CI.
  await host.evaluate(async()=>{
   const mesh=(document.querySelector('call-page') as any).voice;
   for(const peer of mesh.peers.values()){
    peer.originalStats=peer.pc.getStats.bind(peer.pc);
    peer.pc.getStats=async()=>{
     const original=await peer.originalStats(),report=new Map();
     original.forEach((s:any,id:string)=>report.set(id,{
      ...s,...(s.type==='outbound-rtp'&&s.kind==='video'?{qualityLimitationReason:(window as any).__pressure?'cpu':'none'}:{})
     }));
     return report;
    };
   }
   (window as any).__pressure=true;
   for(let n=0;n<2;n++)await mesh.measure();
  });
  await expect.poll(()=>host.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].map((p:any)=>({
   cameraLimited:p.limited,tier:p.screenTier,
   cameraFps:p.transceivers.camera.sender.getParameters().encodings[0].maxFramerate,
   screenFps:p.transceivers.screenVideo.sender.getParameters().encodings[0].maxFramerate,
   scale:p.transceivers.screenVideo.sender.getParameters().encodings[0].scaleResolutionDownBy
  })))).toEqual(Array.from({length:4},()=>({cameraLimited:true,tier:1,cameraFps:15,screenFps:60,scale:1})));
  // Even under sustained pressure the app steps down to 720p, not 540p/480p.
  await host.evaluate(async()=>{const mesh=(document.querySelector('call-page') as any).voice;
   for(let n=0;n<4;n++)await mesh.measure()});
  await expect.poll(()=>host.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].map((p:any)=>({
   tier:p.screenTier,screenFps:p.transceivers.screenVideo.sender.getParameters().encodings[0].maxFramerate,
   scale:p.transceivers.screenVideo.sender.getParameters().encodings[0].scaleResolutionDownBy
  })))).toEqual(Array.from({length:4},()=>({tier:3,screenFps:33,scale:1.5})));
  await media(second,hostId,'screenVideo');
  await expect.poll(async()=>(await evidence(second,hostId,'screenVideo')).frames).toBeGreaterThan(framesBeforePressure);
  const reducedFrames=(await evidence(second,hostId,'screenVideo')).frames;
  await host.evaluate(async()=>{(window as any).__pressure=false;const mesh=(document.querySelector('call-page') as any).voice;
   for(let n=0;n<9;n++)await mesh.measure()});
  await expect.poll(()=>host.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].every((p:any)=>
   !p.limited&&p.screenTier===0&&p.transceivers.camera.sender.getParameters().encodings[0].maxFramerate===24&&
   p.transceivers.screenVideo.sender.getParameters().encodings[0].maxFramerate===60))).toBe(true);
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
  expect(signaling.every(s=>s.peakMessagesPer10s<120)).toBe(true);
  writeFileSync(info.outputPath('five-peer-media.json'),JSON.stringify({receivers:result,signaling,diagnostics:await host.evaluate(()=>(window as any).__metrics)},null,2));
  await host.getByRole('button',{name:'Encerrar sala',exact:true}).click();for(const p of pages.slice(0,5))await closedSources(p);
  expect(errors).toEqual([]);
 }catch(error){
  writeFileSync(info.outputPath('media-failure.json'),JSON.stringify(await Promise.all(pages.map(p=>p.evaluate(()=>{const page=(document.querySelector('call-page') as any);return {error:page.capture.error,voice:page.voice.error,roomError:page.call.error,signals:(window as any).__signalTypes,peakSignals:(window as any).__peakSignals,screens:page.call.screens,capture:!!page.capture.screen,transmitting:page.capture.transmitting,
   peers:[...page.voice.peers.values()].map((p:any)=>({phase:p.phase,failure:p.failure,state:p.pc.connectionState,roles:p.remoteRoles,senders:Object.entries(p.transceivers).map(([role,t]:[string,any])=>({role,mid:t.mid,track:t.sender.track?.kind,state:t.sender.track?.readyState,direction:t.currentDirection})),elements:Object.entries(p.elements).map(([role,e]:[string,any])=>({role,stream:!!e.srcObject,paused:e.paused,width:e.videoWidth,time:e.currentTime,attached:e.isConnected}))}))}}))),null,2));throw error;
 }finally{await finish(pages,contexts)}
});

test('two simultaneous screens switch video and local audio without replacing the WebRTC peers',async({browser})=>{
 const a=await tab(browser),b=await tab(browser),c=await tab(browser,true),pages=[a.page,b.page,c.page];
 const viewer=c.page,options=viewer.getByRole('group',{name:'Transmissões disponíveis'});
 const shareButton=(page:Page)=>page.getByRole('button',{name:'Compartilhar tela',exact:true});
 await viewer.addInitScript(()=>{
  const w=window as any;
  const device=(deviceId:string,label:string)=>({deviceId,label,kind:'audiooutput',groupId:''});
  w.__speakerDevices=[device('default','Padrão'),device('speakers','Caixas de som'),device('headphones','Headset')];
  Object.defineProperty(navigator.mediaDevices,'enumerateDevices',{configurable:true,value:async()=>w.__speakerDevices});
  Object.defineProperty(navigator.mediaDevices,'selectAudioOutput',{configurable:true,value:()=>Promise.resolve(w.__speakerDevices.find((d:any)=>d.deviceId==='headphones'))});
  Object.defineProperty(HTMLMediaElement.prototype,'setSinkId',{configurable:true,value:async function(id:string){
   if(id==='invalid')throw new DOMException('Device not found','NotFoundError');
   (this as any).__sink=id;
  }});
  Object.defineProperty(AudioContext.prototype,'setSinkId',{configurable:true,value:async function(id:string){
   if(id==='invalid')throw new DOMException('Device not found','NotFoundError');
   (this as any).__sink=id;
  }});
 });
 try{
  const invite=await owner(a.page);
  await guest(b.page,a.page,invite,'Bia');await guest(viewer,a.page,invite,'Caio');
  for(const page of pages)await enter(page);
  await connected(viewer,2);
  await viewer.getByRole('button',{name:'Visão compacta',exact:true}).click();
  await expect(viewer.locator('.call-layout')).toHaveClass(/is-compact/);
  await expect.poll(()=>viewer.evaluate(()=>JSON.parse(localStorage.getItem('2t:call:preferences:v1')||'null')?.nickname)).toBe('Caio');
  const first=await id(a.page),second=await id(b.page),watcher=await id(viewer);
  const hostQuality=a.page.getByRole('combobox',{name:'Qualidade da transmissão'});
  const hostContent=a.page.getByRole('combobox',{name:'Tipo de transmissão'});
  const hostSource=a.page.getByRole('combobox',{name:'Fonte da transmissão'});
  const guestSource=b.page.getByRole('combobox',{name:'Fonte da transmissão'});
  await expect(hostSource).toHaveValue('monitor');
  await expect(hostSource.locator('option')).toHaveCount(3);
  await guestSource.selectOption('window');
  await expect(b.page.locator('.call-share-hint')).toContainText('Janela sem bordas');
  await expect(hostQuality).toHaveValue('high');
  await hostQuality.selectOption('max');
  await hostContent.selectOption('game');
  for(const {page} of [a,b])await page.evaluate(()=>{(window as any).__delayDisplay=true});
  await shareButton(a.page).click();await shareButton(b.page).click();
  expect(await a.page.evaluate(()=>(window as any).__displayRequest)).toMatchObject({
   video:{width:{ideal:2560},height:{ideal:1440},frameRate:{ideal:60},displaySurface:'monitor'},
   monitorTypeSurfaces:'include',selfBrowserSurface:'exclude',surfaceSwitching:'include',
   systemAudio:'exclude'
  });
  expect(await b.page.evaluate(()=>(window as any).__displayRequest)).toMatchObject({
   video:{displaySurface:'window'},monitorTypeSurfaces:'include'
  });
  await expect(hostSource).toBeDisabled();
  await expect(guestSource).toBeDisabled();
  await expect.poll(()=>viewer.evaluate(()=>(document.querySelector('call-page') as any).call.screens.length)).toBe(2);
  await shareButton(viewer).click();
  await expect(viewer.getByRole('alert')).toContainText('Já existem duas transmissões');
  expect(await viewer.evaluate(()=>(window as any).__screens.length)).toBe(0);
  await a.page.evaluate(()=>(window as any).__resolveDisplay());
  await expect.poll(()=>a.page.evaluate(watcher=>{
   const peer=(document.querySelector('call-page') as any).voice.peers.get(watcher);
   return peer?.transceivers.screenVideo?.sender.getParameters().encodings?.[0]?.active;
  },watcher)).toBe(false);
  await expect(viewer.getByRole('button',{name:'Assistir',exact:true})).toBeVisible();
  await media(viewer,first,'screenVideo');
  await expect.poll(()=>a.page.evaluate(watcher=>{
   const peer=(document.querySelector('call-page') as any).voice.peers.get(watcher);
   const encoding=peer?.transceivers.screenVideo?.sender.getParameters().encodings?.[0];
   return encoding&&{bitrate:encoding.maxBitrate,fps:encoding.maxFramerate,scale:encoding.scaleResolutionDownBy};
  },watcher)).toEqual({bitrate:22000000,fps:60,scale:1});
  // The displayed resolution/FPS come from RTP receive stats, not preset labels.
  await viewer.evaluate(()=>((document.querySelector('call-page') as any).voice.measure()));
  await expect(viewer.getByLabel('Qualidade real do vídeo')).toContainText(/Recebendo|Medindo/);
  await expect.poll(()=>viewer.evaluate(()=>{
   const page=document.querySelector('call-page') as any;
   return page.voice.receivedScreenQuality(page.viewedScreen.owner)?.height??0;
  }),{timeout:15000}).toBeGreaterThan(0);
  // Severe congestion must not turn 1440p into a forced 480p half-resolution stream.
  await a.page.evaluate(async watcher=>{
   const voice=(document.querySelector('call-page') as any).voice,peer=voice.peers.get(watcher);
   peer.screenTier=3;await voice.limitVideo(peer,'screenVideo');
  },watcher);
  await expect.poll(()=>a.page.evaluate(watcher=>{
   const peer=(document.querySelector('call-page') as any).voice.peers.get(watcher);
   return peer?.transceivers.screenVideo?.sender.getParameters().encodings?.[0]?.scaleResolutionDownBy;
  },watcher)).toBeCloseTo(4/3,3);
  await a.page.evaluate(async watcher=>{
   const voice=(document.querySelector('call-page') as any).voice,peer=voice.peers.get(watcher);
   peer.screenTier=0;await voice.limitVideo(peer,'screenVideo');
  },watcher);
  await hostQuality.selectOption('normal');
  await expect.poll(()=>a.page.evaluate(watcher=>{
   const peer=(document.querySelector('call-page') as any).voice.peers.get(watcher);
   const encoding=peer?.transceivers.screenVideo?.sender.getParameters().encodings?.[0];
   return encoding&&{bitrate:encoding.maxBitrate,fps:encoding.maxFramerate,scale:encoding.scaleResolutionDownBy};
  },watcher)).toEqual({bitrate:5500000,fps:30,scale:1});
  await hostQuality.selectOption('max');
  await expect.poll(()=>a.page.evaluate(watcher=>{
   const peer=(document.querySelector('call-page') as any).voice.peers.get(watcher);
   return peer?.transceivers.screenVideo?.sender.getParameters().encodings?.[0]?.maxBitrate;
  },watcher)).toBe(22000000);
  await expect.poll(()=>a.page.evaluate(watcher=>{
   const peer=(document.querySelector('call-page') as any).voice.peers.get(watcher);
   return peer?.transceivers.screenVideo?.sender.getParameters().encodings?.[0]?.active;
  },watcher)).toBe(true);
  await b.page.evaluate(()=>(window as any).__resolveDisplay());
  await expect(options.getByRole('button')).toHaveCount(2);
  const choose=(name:string)=>options.getByRole('button',{name,exact:true});
  await expect(choose('Anfitrião')).toHaveAttribute('aria-pressed','true');
  await expect(options).toBeVisible();
  await viewer.setViewportSize({width:320,height:844});
  expect(await viewer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await media(viewer,first,'screenAudio');
  for(const person of [first,second])await media(viewer,person,'microphone');
  const output=viewer.getByRole('group',{name:'Saída de áudio',exact:true});
  const outputChoice=output.getByRole('combobox',{name:'Dispositivo de saída'});
  await expect(outputChoice).toBeVisible();
  await outputChoice.selectOption('speakers');
  await expect.poll(()=>viewer.evaluate(id=>{
   const peer=(document.querySelector('call-page') as any).voice.peers.get(id);
   return [peer.elements.microphone.__sink,peer.elements.screenAudio.__sink];
  },first)).toEqual(['speakers','speakers']);
  const sources=()=>viewer.evaluate(()=>{
   const {voice}=document.querySelector('call-page') as any;
   return {video:document.querySelector('.call-remote-screen video')?.getAttribute('data-participant'),
    audio:[...voice.peers.values()].flatMap(peer=>peer.elements.screenAudio.srcObject?[peer.id]:[]),
    gain:[...voice.audioMix.inputs.values()].flatMap(inputs=>{
     const bus=inputs.get('screenAudio')?.bus;return bus?[Math.round(bus.gain.gain.value*100)/100]:[];
    })};
  });
  const slider=(name:string,source='Volume da transmissão')=>viewer.getByRole('group',{name:`Áudio recebido de ${name}`}).getByRole('slider',{name:source});
  await slider('Anfitrião').press('End');
  await slider('Bia').evaluate((element:HTMLInputElement)=>{element.value='50';element.dispatchEvent(new Event('input',{bubbles:true}))});
  await expect.poll(sources).toMatchObject({video:first,audio:[first],gain:[2]});
  await expect.poll(()=>viewer.evaluate(()=>{
   const stored=JSON.parse(localStorage.getItem('2t:call:preferences:v1')||'null');
   return Object.fromEntries(stored.levels);
  })).toMatchObject({'anfitrião':{microphone:100,screenAudio:200,muted:false},
                       'bia':{microphone:100,screenAudio:50,muted:false}});
  await expect.poll(()=>viewer.evaluate(()=>(document.querySelector('call-page') as any).voice.audioMix.context?.__sink)).toBe('speakers');
  await output.getByRole('button',{name:'Escolher dispositivo'}).click();
  await expect(outputChoice).toHaveValue('headphones');
  await expect.poll(()=>viewer.evaluate(()=>JSON.parse(localStorage.getItem('2t:call:preferences:v1')||'null')?.output)).toBe('headphones');
  await expect.poll(()=>viewer.evaluate(id=>{
   const {voice}=(document.querySelector('call-page') as any),peer=voice.peers.get(id);
   return [peer.elements.microphone.__sink,peer.elements.screenAudio.__sink,voice.audioMix.context?.__sink];
  },first)).toEqual(['headphones','headphones','headphones']);
  const peers=await viewer.evaluateHandle(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].map(peer=>peer.pc));
  const pip=viewer.getByRole('button',{name:'Janela flutuante',exact:true});
  await pip.click();
  await expect.poll(()=>viewer.evaluate(()=>document.pictureInPictureElement?.getAttribute('data-participant'))).toBe(first);
  await choose('Bia').click();
  await expect.poll(()=>viewer.evaluate(()=>!!document.pictureInPictureElement)).toBe(false);
  await media(viewer,second,'screenVideo');
  await expect.poll(sources).toMatchObject({video:second,audio:[second],gain:[.5]});
  const screenOutput=await viewer.evaluateHandle(person=>{
   const mix=(document.querySelector('call-page') as any).voice.audioMix;
   const bus=mix.inputs.get(person).get('screenAudio').bus;
   const analyser=mix.context.createAnalyser();bus.compressor.connect(analyser);
   return analyser as AnalyserNode;
  },second);
  await expect.poll(()=>screenOutput.evaluate(analyser=>{
   const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);
   return samples.reduce((peak,sample)=>Math.max(peak,Math.abs(sample)),0);
  })).toBeGreaterThan(.03);
  await screenOutput.dispose();
  await pip.click();
  await expect.poll(()=>viewer.evaluate(()=>document.pictureInPictureElement?.getAttribute('data-participant'))).toBe(second);
  await pip.click();
  const full=viewer.locator('.call-fullscreen');
  await full.click();
  await expect.poll(()=>viewer.evaluate(()=>document.fullscreenElement?.querySelector('video[data-role="screenVideo"]')?.getAttribute('data-participant'))).toBe(second);
  await full.click();

  const deafen=viewer.getByRole('button',{name:'Ensurdecer',exact:true});
  await deafen.click();await choose('Anfitrião').click();await viewer.getByRole('button',{name:'Assistir',exact:true}).click();
  await expect.poll(sources).toMatchObject({video:first,audio:[first],gain:[2]});
  expect(await viewer.evaluate(()=>{
   const {voice}=document.querySelector('call-page') as any;
   return voice.audioMix.master.gain.value===0&&[...voice.peers.values()].every(peer=>peer.audio.muted&&peer.elements.screenAudio.muted);
  })).toBe(true);
  await deafen.click();await choose('Bia').click();await viewer.getByRole('button',{name:'Assistir',exact:true}).click();
  await expect.poll(sources).toMatchObject({video:second,audio:[second],gain:[.5]});
  expect(await peers.evaluate(original=>[...(document.querySelector('call-page') as any).voice.peers.values()].every(peer=>original.includes(peer.pc)))).toBe(true);
  await peers.dispose();
  await viewer.evaluate(()=>(document.querySelector('call-page') as any).call.socket.close());
  await expect(viewer.locator('.call-connection')).toHaveText('Conectado');
  await expect(choose('Bia')).toHaveAttribute('aria-pressed','true');
  await expect.poll(sources).toMatchObject({video:second,audio:[second],gain:[.5]});
  await expect(slider('Anfitrião')).toHaveValue('200');

  await b.page.evaluate(()=>{const t=(document.querySelector('call-page') as any).capture.screen.getAudioTracks()[0];t.stop();t.dispatchEvent(new Event('ended'))});
  await expect(viewer.locator('.call-caption')).toContainText('sem áudio compartilhado');
  await expect.poll(sources).toMatchObject({video:second,audio:[]});
  await b.page.getByRole('button',{name:'Ativar câmera',exact:true}).click();await media(viewer,second,'camera');
  await b.page.evaluate(()=>(document.querySelector('call-page') as any).call.socket.close());
  await expect(viewer.locator('.call-caption')).toContainText('Anfitrião');
  await expect(viewer.getByRole('button',{name:'Assistir',exact:true})).toBeVisible();
  await viewer.getByRole('button',{name:'Assistir',exact:true}).click();
  await expect.poll(sources).toMatchObject({video:first,audio:[first],gain:[2]});
  await expect(b.page.locator('.call-connection')).toHaveText('Conectado');
  await expect(b.page.getByRole('button',{name:'Ativar câmera',exact:true})).toBeVisible();
  expect(await b.page.evaluate(()=>(window as any).__screens.every((s:any)=>s.stream.getTracks().every((t:MediaStreamTrack)=>t.readyState==='ended')))).toBe(true);
  await media(viewer,second,'microphone');
  await viewer.evaluate(()=>{
   const w=window as any;
   w.__speakerDevices.push({deviceId:'invalid',label:'Saída inválida',kind:'audiooutput',groupId:''});
   navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
  });
  await expect(outputChoice.locator('option[value="invalid"]')).toHaveCount(1);
  await outputChoice.selectOption('invalid');
  await expect(output.getByRole('status')).toContainText('Dispositivo de áudio não encontrado');
  await expect(outputChoice).toHaveValue('headphones');
  await viewer.evaluate(()=>{
   const w=window as any;
   w.__speakerDevices=w.__speakerDevices.filter((device:any)=>device.deviceId!=='headphones');
   navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
  });
  await expect(outputChoice).toHaveValue('');
  await expect.poll(()=>viewer.evaluate(()=>JSON.parse(localStorage.getItem('2t:call:preferences:v1')||'null')?.output)).toBe('');
  await expect(output.getByRole('status')).toContainText('Dispositivo desconectado');
  await expect.poll(()=>viewer.evaluate(()=>{
   const {voice}=(document.querySelector('call-page') as any);
   return [voice.audioMix.context?.__sink,...[...voice.peers.values()].map(peer=>peer.elements.microphone.__sink)];
  })).toEqual(['','','']);
  await viewer.getByRole('button',{name:'Sair da chamada',exact:true}).click();await closedSources(viewer);
  await viewer.reload();
  await expect(viewer.getByLabel('Seu nome',{exact:true})).toHaveValue('Caio');
  expect(await viewer.evaluate(()=>{
   const prefs=(document.querySelector('call-page') as any).preferences;
   const saved=JSON.parse(localStorage.getItem('2t:call:preferences:v1')||'null');
   return {layout:prefs.layout,fields:Object.keys(saved).sort()};
  })).toEqual({layout:'compact',fields:['layout','levels','nickname','output','version']});
  expect(await viewer.evaluate(()=>{
   const {voice}=document.querySelector('call-page') as any;return voice.peers.size===0&&voice.audioMix.inputs.size===0;
  })).toBe(true);
  await expect(a.page.getByRole('button',{name:'Parar compartilhamento',exact:true})).toBeVisible();
  await a.page.getByRole('button',{name:'Encerrar sala',exact:true}).click();await closedSources(a.page);
 }finally{await finish(pages,[a.context,b.context,c.context])}
});

test('permission refusal, cancelled and late captures, local preview and route cleanup',async({browser})=>{
 const a=await tab(browser),b=await tab(browser),pages=[a.page,b.page];
 try{
  await a.page.goto(`${origin}/#/call`);await expect(a.page.locator('.call-layout')).toBeHidden();
  await expect(a.page.locator('.call-controls')).toBeHidden();
  expect(await a.page.evaluate(()=>(document.querySelector('call-page') as any).voice.peers.size)).toBe(0);
  const invite=await owner(a.page);await guest(b.page,a.page,invite,'Convidado');await enter(a.page);await enter(b.page);await media(b.page,await id(a.page),'microphone');
  const studio=a.page.getByRole('region',{name:'Controles de voz'});
  await expect(studio.getByRole('combobox',{name:'Microfone de entrada'})).toBeVisible();
  const talk=studio.getByRole('combobox',{name:'Modo de fala'});
  await expect(talk).toHaveValue('open');
  await expect(studio.getByLabel('Nível do microfone')).toBeVisible();
  await talk.selectOption('ptt');
  await expect.poll(()=>a.page.evaluate(()=>(document.querySelector('call-page') as any).microphone.getAudioTracks()[0].enabled)).toBe(false);
  const push=studio.getByRole('button',{name:'Segure para falar'});
  await push.dispatchEvent('pointerdown',{pointerId:1,pointerType:'mouse',button:0});
  await expect.poll(()=>a.page.evaluate(()=>(document.querySelector('call-page') as any).microphone.getAudioTracks()[0].enabled)).toBe(true);
  await push.dispatchEvent('pointerup',{pointerId:1,pointerType:'mouse',button:0});
  await expect.poll(()=>a.page.evaluate(()=>(document.querySelector('call-page') as any).microphone.getAudioTracks()[0].enabled)).toBe(false);
  await talk.selectOption('voice');
  await expect(studio.getByRole('slider',{name:'Limiar de voz'})).toBeVisible();
  await talk.selectOption('open');
  await expect.poll(()=>a.page.evaluate(()=>(document.querySelector('call-page') as any).microphone.getAudioTracks()[0].enabled)).toBe(true);
  await studio.getByRole('button',{name:'Gravar teste (6 segundos)'}).click();
  await expect(studio.getByRole('button',{name:'Parar gravação'})).toBeVisible();
  await a.page.waitForTimeout(350);
  await studio.getByRole('button',{name:'Parar gravação'}).click();
  await expect(studio.getByLabel('Reprodução do teste do microfone')).toBeVisible();
  await studio.getByRole('button',{name:'Excluir teste'}).click();
  await expect(studio.getByLabel('Reprodução do teste do microfone')).toHaveCount(0);
  const settings=a.page.locator('.call-microphone-settings');
  await settings.locator('summary').click();
  const mode=settings.getByRole('combobox',{name:'Processamento do microfone'});
  await expect(mode).toHaveValue('clean');
  expect(await a.page.evaluate(()=>(document.querySelector('call-page') as any).micProcessing.flags.autoGainControl)).toBe(false);
  await expect(settings.locator('.call-mic-effective')).toContainText('ruído:');
  await expect(settings.locator('.call-mic-effective')).toContainText('ganho:');
  await mode.selectOption('natural');
  await expect.poll(()=>a.page.evaluate(()=>{
   const processor=(document.querySelector('call-page') as any).micProcessing;
   return [processor.flags.echoCancellation,processor.flags.noiseSuppression,processor.flags.autoGainControl];
  })).toEqual([false,false,false]);
  await settings.getByRole('checkbox',{name:'Redução de ruídos'}).check();
  await expect(mode).toHaveValue('custom');
  const enhanced=settings.getByRole('checkbox',{name:'Supressão avançada de ruído (local)'});
  if(await enhanced.count()){
   await enhanced.check();
   await expect.poll(()=>a.page.evaluate(()=>(document.querySelector('call-page') as any).micProcessing.enhanced)).toBe(true);
   await enhanced.uncheck();
   await expect.poll(()=>a.page.evaluate(()=>(document.querySelector('call-page') as any).micProcessing.enhanced)).toBe(false);
  }
  const gate=settings.getByRole('slider',{name:'Sensibilidade de voz'});
  await gate.evaluate((input:HTMLInputElement)=>{input.value='55';input.dispatchEvent(new Event('input',{bubbles:true}))});
  await expect.poll(()=>a.page.evaluate(()=>{
   const page=document.querySelector('call-page') as any;
   return page.micProcessing.sensitivity===55&&!!page.micProcessing.context&&
    page.microphone?.getAudioTracks()[0]===page.micProcessing.stream?.getAudioTracks()[0];
  }),{timeout:12000}).toBe(true);
  await media(b.page,await id(a.page),'microphone');
  await gate.evaluate((input:HTMLInputElement)=>{input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}))});
  await expect.poll(()=>a.page.evaluate(()=>(document.querySelector('call-page') as any).micProcessing.sensitivity)).toBe(0);
  await expect.poll(()=>a.page.evaluate(()=>{
   const page=document.querySelector('call-page') as any;
   return page.micProcessing.context===undefined&&page.micProcessing.outgoing===undefined&&
    page.microphone?.getAudioTracks()[0]===page.micProcessing.source?.getAudioTracks()[0]&&
    page.micProcessing.source.getAudioTracks()[0].readyState==='live';
  })).toBe(true);
  await media(b.page,await id(a.page),'microphone');
  await a.page.evaluate(()=>{(window as any).__denyDisplay=true;(window as any).__denyCamera=true});
  await a.page.getByRole('button',{name:'Compartilhar tela',exact:true}).click();await expect(a.page.getByRole('alert')).toContainText('cancelado');
  await a.page.getByRole('button',{name:'Ativar câmera',exact:true}).click();await expect(a.page.getByRole('alert')).toContainText('Permita');
  await a.page.evaluate(()=>{(window as any).__denyDisplay=false;(window as any).__denyCamera=false;(window as any).__delayDisplay=true;(window as any).__delayCamera=true});
  await a.page.getByRole('button',{name:'Compartilhar tela',exact:true}).click();await a.page.getByRole('button',{name:'Cancelar seleção de tela',exact:true}).click();
  await a.page.evaluate(()=>(window as any).__resolveDisplay());await expect.poll(()=>a.page.evaluate(()=>(window as any).__screens.at(-1).stream.getTracks().every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
  await a.page.getByRole('button',{name:'Ativar câmera',exact:true}).click();await expect.poll(()=>a.page.evaluate(()=>typeof(window as any).__resolveCamera)).toBe('function');
  await a.page.getByRole('button',{name:'Compartilhar tela',exact:true}).click();
  await a.page.evaluate(()=>{(window as any).__oldCall=document.querySelector('call-page');location.hash='#/'});
  await expect(a.page.locator('call-page')).toBeHidden();await expect(a.page.locator('.call-dock')).toBeVisible();
  await a.page.getByRole('button',{name:'Sair da chamada',exact:true}).click();
  await a.page.evaluate(()=>{(window as any).__resolveCamera();(window as any).__resolveDisplay()});await closedSources(a.page);
  expect(await a.page.evaluate(()=>(window as any).__oldCall.voice.peers.size)).toBe(0);
  await expect(b.page.locator('.call-connection')).toHaveText('Conexão encerrada');await closedSources(b.page);
 }finally{await finish(pages,[a.context,b.context])}
});
