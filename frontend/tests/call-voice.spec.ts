import {test,expect,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const origin=process.env.CALL_TEST_URL||'http://127.0.0.1:8001';
const key=process.env.CALL_TEST_ADMIN_KEY;
const tone=resolve('.vercel/call-stage3-tone.wav');
test.skip(!key,'Start the single-process Call service and set CALL_TEST_ADMIN_KEY.');
test.setTimeout(90000);
test.use({launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',`--use-file-for-fake-audio-capture=${tone}`]}});
test.beforeAll(()=>{
 mkdirSync(resolve('.vercel'),{recursive:true});
 const rate=48000,samples=rate*2,data=Buffer.alloc(44+samples*2);
 data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);
 data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);
 data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(samples*2,40);
 for(let n=0;n<samples;n++)data.writeInt16LE(Math.round(4000*Math.sin(2*Math.PI*440*n/rate)),44+n*2);
 writeFileSync(tone,data);
});

async function tab(browser:Browser){
 const context=await browser.newContext({permissions:['microphone','clipboard-read','clipboard-write'],ignoreHTTPSErrors:process.env.CALL_TEST_LOCAL_TLS==='1'});
 const page=await context.newPage();
 await page.addInitScript(()=>{
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  (window as any).__captures=[];
  navigator.mediaDevices.getUserMedia=async options=>{const stream=await original(options);(window as any).__captures.push(stream);return stream};
 });
 return {context,page};
}
async function owner(page:Page){
 await page.goto(`${origin}/#/call`);await page.getByLabel('Seu nome',{exact:true}).fill('Anfitrião');
 await page.getByRole('button',{name:'Criar sala privada',exact:true}).click();await expect(page.locator('.call-connection')).toHaveText('Conectado');
 await page.getByRole('button',{name:'Copiar convite',exact:true}).click();return page.evaluate(()=>navigator.clipboard.readText());
}
async function guest(page:Page,host:Page,invite:string,name:string){
 await page.goto(invite);await page.getByLabel('Seu nome',{exact:true}).fill(name);
 await page.getByRole('button',{name:'Entrar por convite',exact:true}).click();
 await host.getByRole('button',{name:`Aceitar ${name}`,exact:true}).click();await expect(page.locator('.call-connection')).toHaveText('Conectado');
}
async function enter(page:Page,mic=true){
 await page.getByRole('button',{name:'Entrar na chamada',exact:true}).click();
 await expect(page.getByRole('button',{name:'Sair da chamada',exact:true})).toBeVisible();
 if(mic){await page.getByRole('button',{name:'Ativar microfone',exact:true}).click();await expect(page.getByRole('button',{name:'Desativar microfone',exact:true})).toBeVisible()}
}
async function connected(page:Page,count:number){
 await expect.poll(()=>page.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].filter((p:any)=>p.pc.connectionState==='connected').length),{timeout:20000}).toBe(count);
}
async function energy(page:Page,id:string){
 return page.evaluate(async id=>{const peer=(document.querySelector('call-page') as any).voice.peers.get(id);let energy=0;
  if(peer)(await peer.pc.getStats()).forEach((s:any)=>{if(s.type==='inbound-rtp'&&s.kind==='audio')energy+=s.totalAudioEnergy??0});return energy;
 },id);
}
async function audioEvidence(page:Page,count:number){
 await connected(page,count);
 const unlock=page.getByRole('button',{name:'Liberar áudio',exact:true});
 if(await unlock.isVisible()){
  try{await unlock.click({timeout:1200})}
  catch(error){if(await unlock.isVisible())throw error}
 }
 await expect.poll(()=>page.evaluate(async()=>{
  const mesh=(document.querySelector('call-page') as any).voice;let received=0;
  for(const p of mesh.peers.values()){
   const report=await p.pc.getStats();let energy=0;
   report.forEach((s:any)=>{if(s.type==='inbound-rtp'&&s.kind==='audio')energy+=s.totalAudioEnergy??0});
   if(energy>0&&!p.audio.paused&&!p.audio.muted&&p.audio.currentTime>0)received++;
  }return received;
 }),{timeout:20000}).toBe(count);
}
async function retained(page:Page){
 await page.evaluate(()=>{const mesh=(document.querySelector('call-page') as any).voice;(window as any).__oldPeers=[...mesh.peers.values()].map((p:any)=>({pc:p.pc,audio:p.audio}));(window as any).__oldTracks=(window as any).__captures.flatMap((s:MediaStream)=>s.getTracks())});
}
async function cleaned(page:Page){
 await expect.poll(()=>page.evaluate(()=>({
  closed:(window as any).__oldPeers.every((p:any)=>p.pc.connectionState==='closed'&&p.audio.srcObject===null&&!p.audio.isConnected),
  ended:(window as any).__oldTracks.every((t:MediaStreamTrack)=>t.readyState==='ended')
 }))).toEqual({closed:true,ended:true});
}

test('native audio mesh grows from two to five; mute, websocket resume, leave and close',async({browser},testInfo)=>{
 const contexts:BrowserContext[]=[],pages:Page[]=[],errors:string[]=[];
 const add=async()=>{const result=await tab(browser);contexts.push(result.context);pages.push(result.page);result.page.on('pageerror',e=>errors.push(e.message));return result.page};
 try{
  const host=await add(),sockets:string[]=[];host.on('websocket',socket=>sockets.push(socket.url()));
  const invite=await owner(host);await enter(host);
  const stats=[];
  for(let n=1;n<=4;n++){
   const page=await add();await guest(page,host,invite,`Pessoa ${n}`);await enter(page);
   for(const current of pages)await audioEvidence(current,n);
   for(const current of pages)expect(await current.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].every((p:any)=>p.pc.getTransceivers().length===4&&p.pc.getTransceivers().every((t:RTCRtpTransceiver)=>t.currentDirection==='sendrecv')&&new Set(Object.values(p.remoteRoles)).size===4))).toBe(true);
   stats.push(await host.evaluate(async()=>{const mesh=(document.querySelector('call-page') as any).voice;await mesh.measure();return [...mesh.peers.values()].map((p:any)=>p.stats)}));
  }
  writeFileSync(testInfo.outputPath('webrtc-stats-2-3-4-5.json'),JSON.stringify(stats,null,2));
  await testInfo.attach('webrtc-stats-2-3-4-5.json',{path:testInfo.outputPath('webrtc-stats-2-3-4-5.json'),contentType:'application/json'});
  expect(sockets.every(url=>url===(process.env.CALL_TEST_SIGNAL_URL||origin.replace('https:','wss:').replace('http:','ws:')+'/call/ws'))).toBe(true);
  await host.getByText('Verificar conexão',{exact:true}).click();
  await host.getByRole('button',{name:'Copiar diagnóstico',exact:true}).click();
  await expect(host.getByRole('button',{name:'Diagnóstico copiado',exact:true})).toBeVisible({timeout:12000});
  const diagnostic=JSON.parse(await host.evaluate(()=>navigator.clipboard.readText()));
  expect(diagnostic.peers).toHaveLength(4);expect(diagnostic.peers.every((p:any)=>p.path==='direct'&&p.received>0)).toBe(true);
  const text=JSON.stringify(diagnostic);expect(text).not.toContain('Anfitrião');expect(text).not.toContain('Pessoa');
  expect(text).not.toMatch(/candidate:|sdp|credential|invite|iceServers|\b\d{1,3}(?:\.\d{1,3}){3}\b/);
  await host.evaluate(()=>{const page=(document.querySelector('call-page') as any);(window as any).__previousRtc=page.call.rtc;page.call.send({type:'rtc_config'})});
  await expect.poll(()=>host.evaluate(()=>(document.querySelector('call-page') as any).call.rtc!==(window as any).__previousRtc)).toBe(true);
  expect(await host.evaluate(()=>(document.querySelector('call-page') as any).voice.error)).toBe('');
  await audioEvidence(host,4);
  for(const width of[1366,390])for(const theme of['dark','light']){
   await host.setViewportSize({width,height:950});await host.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   await host.evaluate(async()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
   expect(await host.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await host.screenshot({path:testInfo.outputPath(`voice-${width}-${theme}.png`),fullPage:true});
  }
  const sixth=await add();await sixth.goto(invite);await sixth.getByLabel('Seu nome',{exact:true}).fill('Sexto');await sixth.getByRole('button',{name:'Entrar por convite',exact:true}).click();
  await expect(sixth.getByRole('alert')).toContainText('cinco vagas');
  await expect(sixth.getByRole('button',{name:'Entrar na chamada',exact:true})).toHaveCount(0);
  const first=pages[1];await first.getByRole('button',{name:'Desativar microfone',exact:true}).click();
  const firstId=await first.evaluate(()=>(document.querySelector('call-page') as any).call.session.participant);
  await expect(host.locator('.call-people li').filter({hasText:'Pessoa 1'})).toContainText('microfone desligado');
  expect(await first.evaluate(()=>(window as any).__captures.at(-1).getTracks().every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
  await expect.poll(()=>first.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].every((p:any)=>p.sender.track===null))).toBe(true);
  const mutedEnergy=await energy(host,firstId);
  await first.getByRole('button',{name:'Ativar microfone',exact:true}).click();await audioEvidence(host,4);
  await expect.poll(()=>energy(host,firstId)).toBeGreaterThan(mutedEnergy);
  await host.evaluate(()=>(window as any).__stable=[...(document.querySelector('call-page') as any).voice.peers.values()].map((p:any)=>p.pc));
  await first.evaluate(()=>(document.querySelector('call-page') as any).call.socket.close());
  await expect(first.locator('.call-connection')).toHaveText('Reconectando…');await expect(first.locator('.call-connection')).toHaveText('Conectado');
  await audioEvidence(first,4);
  expect(await host.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].every((p:any)=>(window as any).__stable.includes(p.pc)))).toBe(true);
  const leaving=pages[2];await retained(leaving);await leaving.getByRole('button',{name:'Sair da chamada',exact:true}).click();await cleaned(leaving);
  await connected(host,3);await audioEvidence(pages[3],3);
  // Only the departing participant's connections close; unrelated pairs retain identity.
  expect(await host.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].every((p:any)=>(window as any).__stable.includes(p.pc)))).toBe(true);
  for(const page of pages.slice(0,5))await retained(page);
  await host.getByRole('button',{name:'Encerrar sala',exact:true}).click();
  for(const page of pages.slice(0,5)){await expect(page.locator('.call-connection')).toHaveText('Conexão encerrada');await cleaned(page)}
  expect(errors).toEqual([]);
 }catch(error){
  const failure=JSON.stringify(await Promise.all(pages.map(page=>page.evaluate(()=>{
   const p=(document.querySelector('call-page') as any);return {error:p.voice.error,signaling:p.call.error,self:p.call.session?.participant,people:p.call.people,
    peers:[...p.voice.peers.values()].map((x:any)=>({id:x.id,state:x.pc.connectionState,ice:x.pc.iceConnectionState,signaling:x.pc.signalingState,
     epoch:x.epoch,polite:x.polite,ignored:x.ignored.size,pending:x.candidates.length,phase:x.phase,failure:x.failure,
     local:x.pc.localDescription?.type,remote:x.pc.remoteDescription?.type,transceivers:x.pc.getTransceivers().map((t:any)=>({mid:t.mid,direction:t.direction,current:t.currentDirection}))}))};
  }))),null,2);writeFileSync(testInfo.outputPath('voice-failure.json'),failure);
  await testInfo.attach('voice-failure.json',{path:testInfo.outputPath('voice-failure.json'),contentType:'application/json'});throw error;
 }finally{await Promise.all(contexts.map(c=>c.close()))}
});

test('real simultaneous offers, ICE before SDP and autoplay recovery',async({browser})=>{
 const a=await tab(browser),b=await tab(browser);
 try{
  const invite=await owner(a.page);await guest(b.page,a.page,invite,'Convidado');
  await enter(a.page);await enter(b.page);await audioEvidence(a.page,1);await audioEvidence(b.page,1);
  const idB=await b.page.evaluate(()=>(document.querySelector('call-page') as any).call.session.participant);
  const beforeRestart=await energy(a.page,idB);
  for(const page of[a.page,b.page])await page.evaluate(()=>{
   const call=(document.querySelector('call-page') as any).call,native=call.send.bind(call);
   (window as any).__out=[];(window as any).__send=native;(window as any).__holding=true;
   call.send=(message:any)=>{if((window as any).__holding&&['offer','ice'].includes(message.type)){(window as any).__out.push(message);return true}return native(message)};
   const play=HTMLMediaElement.prototype.play;
   (window as any).__blockPlayback=true;
   HTMLMediaElement.prototype.play=function(){return (window as any).__blockPlayback&&this.tagName==='AUDIO'?Promise.reject(new DOMException('User gesture required','NotAllowedError')):play.call(this)};
   for(const peer of(document.querySelector('call-page') as any).voice.peers.values())peer.audio.pause();
   (document.querySelector('call-page') as any).voice.unlockAudio();
  });
  await Promise.all([a.page,b.page].map(page=>page.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()][0].pc.restartIce())));
  for(const page of[a.page,b.page]){
   await expect.poll(()=>page.evaluate(()=>(window as any).__out.filter((m:any)=>m.type==='offer').length)).toBe(1);
   await expect.poll(()=>page.evaluate(()=>(window as any).__out.filter((m:any)=>m.type==='ice'&&m.candidate).length)).toBeGreaterThan(0);
   expect(await page.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].every((p:any)=>p.pc.signalingState==='have-local-offer'))).toBe(true);
   await page.evaluate(()=>{for(const message of(window as any).__out.filter((m:any)=>m.type==='ice'))(window as any).__send(message)});
  }
  for(const page of[a.page,b.page])await expect.poll(()=>page.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].reduce((n:number,p:any)=>n+p.candidates.length,0))).toBeGreaterThan(0);
  await Promise.all([a.page,b.page].map(page=>page.evaluate(()=>{(window as any).__holding=false;for(const message of(window as any).__out.filter((m:any)=>m.type==='offer'))(window as any).__send(message)})));
  for(const page of[a.page,b.page]){
   await connected(page,1);await expect(page.getByRole('button',{name:'Liberar áudio',exact:true})).toBeVisible();
   await page.evaluate(()=>(window as any).__blockPlayback=false);
   await page.getByRole('button',{name:'Liberar áudio',exact:true}).click();await audioEvidence(page,1);
   expect(await page.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()].every((p:any)=>p.pc.signalingState==='stable'))).toBe(true);
  }
  await expect.poll(()=>energy(a.page,idB)).toBeGreaterThan(beforeRestart);
  await a.page.getByRole('button',{name:'Encerrar sala',exact:true}).click();
 }finally{await a.context.close();await b.context.close()}
});

test('listen only, denied microphone, late capture cleanup and route exit',async({browser})=>{
 const a=await tab(browser),b=await tab(browser);
 try{
  const invite=await owner(a.page);await guest(b.page,a.page,invite,'Ouvinte');await enter(a.page);await enter(b.page,false);
  await audioEvidence(b.page,1);
  expect(await b.page.evaluate(()=>(window as any).__captures.length)).toBe(0);
  await b.page.evaluate(()=>{(window as any).__nativeMic=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError')}});
  await b.page.getByRole('button',{name:'Ativar microfone',exact:true}).click();await expect(b.page.getByRole('alert')).toContainText('Permita');
  await audioEvidence(b.page,1);
  await b.page.evaluate(()=>{navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>(window as any).__lateMic=resolve)});
  await b.page.getByRole('button',{name:'Ativar microfone',exact:true}).click();await expect(b.page.getByRole('button',{name:'Aguardando microfone…',exact:true})).toBeVisible();
  await retained(b.page);await b.page.getByRole('button',{name:'Sair da chamada',exact:true}).click();await cleaned(b.page);
  await b.page.evaluate(async()=>{const stream=await(window as any).__nativeMic({audio:true});(window as any).__lateStream=stream;(window as any).__lateMic(stream)});
  await expect.poll(()=>b.page.evaluate(()=>(window as any).__lateStream.getTracks().every((t:MediaStreamTrack)=>t.readyState==='ended'))).toBe(true);
  await retained(a.page);await a.page.evaluate(()=>location.hash='#/');
  await expect(a.page.locator('call-page')).toBeHidden();await expect(a.page.locator('.call-dock')).toBeVisible();
  await a.page.getByRole('button',{name:'Sair da chamada',exact:true}).click();await cleaned(a.page);
  expect(await a.page.locator('.call-remote-audio audio').count()).toBe(0);
 }finally{await a.context.close();await b.context.close()}
});

test('actual ICE restart and limited automatic recovery',async({browser})=>{
 const a=await tab(browser),b=await tab(browser);
 try{
  const invite=await owner(a.page);await guest(b.page,a.page,invite,'Convidado');await enter(a.page);await enter(b.page);await audioEvidence(a.page,1);
  const original=await a.page.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()][0].pc.localDescription.sdp.match(/a=ice-ufrag:(.+)/)[1]);
  await a.page.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()][0].pc.restartIce());
  await expect.poll(()=>a.page.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()][0].pc.localDescription.sdp.match(/a=ice-ufrag:(.+)/)[1])).not.toBe(original);
  await audioEvidence(a.page,1);await audioEvidence(b.page,1);
  // Deterministic outage simulation: suppress restart effects and advance the retry timers.
  await a.page.clock.install();
  await a.page.evaluate(()=>{const mesh=(document.querySelector('call-page') as any).voice,peer=[...mesh.peers.values()][0];(window as any).__restarts=0;Object.defineProperty(peer.pc,'connectionState',{get:()=>'failed',configurable:true});peer.pc.restartIce=()=>{(window as any).__restarts++};mesh.recover(peer)});
  await expect.poll(()=>a.page.evaluate(()=>(window as any).__restarts)).toBe(1);
  await a.page.clock.runFor(10001);await a.page.clock.runFor(10001);
  expect(await a.page.evaluate(()=>(window as any).__restarts)).toBe(2);
  await expect(a.page.getByRole('button',{name:'Reconectar áudio',exact:true})).toBeVisible();
  await a.page.getByRole('button',{name:'Reconectar áudio',exact:true}).click();
  await expect.poll(()=>a.page.evaluate(()=>(window as any).__restarts)).toBe(3);
  await a.page.getByRole('button',{name:'Encerrar sala',exact:true}).click();
 }finally{await a.context.close();await b.context.close()}
});

test('lost signaling heartbeat resumes the same participant and preserves audio peers',async({browser})=>{
 const a=await tab(browser),b=await tab(browser);
 try{
  await a.page.clock.install(); // Install before the transport creates its interval.
  const invite=await owner(a.page);await guest(b.page,a.page,invite,'Convidado');await enter(a.page);await enter(b.page);await audioEvidence(a.page,1);
  const id=await a.page.evaluate(()=>(document.querySelector('call-page') as any).call.session.participant);
  await a.page.evaluate(()=>{const page=(document.querySelector('call-page') as any);(window as any).__previousSocket=page.call.socket;(window as any).__previousPeer=[...page.voice.peers.values()][0].pc;page.call.socket.onmessage=()=>{}});
  await a.page.clock.runFor(25001);
  await expect.poll(()=>a.page.evaluate(()=>{const page=(document.querySelector('call-page') as any);return {changed:page.call.socket!==(window as any).__previousSocket,state:page.call.state}})).toEqual({changed:true,state:'connected'});
  expect(await a.page.evaluate(()=>(document.querySelector('call-page') as any).call.session.participant)).toBe(id);
  expect(await a.page.evaluate(()=>[...(document.querySelector('call-page') as any).voice.peers.values()][0].pc===(window as any).__previousPeer)).toBe(true);
  await audioEvidence(a.page,1);await expect(b.page.locator('.call-people h2')).toHaveText('Participantes · 2/5');
  await a.page.getByRole('button',{name:'Encerrar sala',exact:true}).click();
 }finally{await a.context.close();await b.context.close()}
});
