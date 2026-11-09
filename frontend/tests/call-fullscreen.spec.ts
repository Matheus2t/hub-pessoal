import {test,expect,type Page} from '@playwright/test';

const origin=process.env.CALL_TEST_URL||'';
test.skip(!origin,'Start the local Call service and set CALL_TEST_URL.');
test.use({ignoreHTTPSErrors:process.env.CALL_TEST_LOCAL_TLS==='1'});
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  const w=window as any;
  // Synthetic capture only. The viewer and browser Fullscreen API remain real.
  navigator.mediaDevices.getDisplayMedia=async()=>{
   const canvas=document.createElement('canvas');canvas.width=960;canvas.height=540;
   const draw=canvas.getContext('2d')!;let frame=0;
   const paint=()=>{draw.fillStyle='#111';draw.fillRect(0,0,960,540);draw.strokeStyle='#eee';draw.lineWidth=8;draw.strokeRect(4,4,952,532);draw.fillStyle='#ddd';draw.font='42px sans-serif';draw.fillText(`Prévia de teste · ${frame++}`,80,280)};
   paint();w.__timer=setInterval(paint,70);return canvas.captureStream(15);
  };
  // Track only these callbacks, never media, credentials or signaling payloads.
  const add=document.addEventListener.bind(document),remove=document.removeEventListener.bind(document);
  w.__viewerListeners=new Map<string,Set<EventListener>>();
  document.addEventListener=((type:string,listener:EventListener,options:any)=>{
   if(['fullscreenchange','webkitfullscreenchange'].includes(type)||type==='keydown'&&options===true){if(!w.__viewerListeners.has(type))w.__viewerListeners.set(type,new Set());w.__viewerListeners.get(type).add(listener)}
   return add(type,listener,options);
  }) as typeof document.addEventListener;
  document.removeEventListener=((type:string,listener:EventListener,options:any)=>{
   w.__viewerListeners.get(type)?.delete(listener);return remove(type,listener,options);
  }) as typeof document.removeEventListener;
 });
 await page.goto(`${origin}/#/call`);
 await expect(page.locator('call-page h1')).toHaveText('Call');
 await expect(page.locator('.call-fullscreen')).toHaveCount(0);
 await page.getByLabel('Seu nome',{exact:true}).fill('Anfitrião');
 await page.getByRole('button',{name:'Criar sala privada',exact:true}).click();
 await expect(page.locator('.call-connection')).toHaveText('Conectado');
 await page.getByRole('button',{name:'Entrar na chamada',exact:true}).click();
 await page.getByRole('button',{name:'Compartilhar tela',exact:true}).click();
 await expect(page.locator('.call-fullscreen')).toBeVisible();
 await expect.poll(()=>page.locator('.call-preview>video').evaluate((v:HTMLVideoElement)=>v.videoWidth)).toBe(960);
 await page.evaluate(()=>{
  const w=window as any;w.__viewer=document.querySelector('.call-preview');w.__video=w.__viewer.querySelector('video');w.__stream=w.__video.srcObject;w.__track=w.__stream.getVideoTracks()[0];
  w.__removed=0;w.__observer=new MutationObserver(records=>{for(const r of records)for(const n of r.removedNodes)if(n===w.__video||(n instanceof Element&&n.contains(w.__video)))w.__removed++});w.__observer.observe(w.__viewer,{subtree:true,childList:true});
 });
});
test.afterEach(async({page})=>{await page.evaluate(()=>{clearInterval((window as any).__timer);(window as any).__observer?.disconnect()}).catch(()=>{})});
async function intact(page:Page){
 await expect.poll(()=>page.evaluate(()=>{
  const w=window as any,v=document.querySelector('.call-preview>video') as HTMLVideoElement;
  return {sameVideo:v===w.__video,sameStream:v.srcObject===w.__stream,sameTrack:w.__stream.getVideoTracks()[0]===w.__track,trackState:w.__track.readyState,paused:v.paused,removed:w.__removed};
 })).toEqual({sameVideo:true,sameStream:true,sameTrack:true,trackState:'live',paused:false,removed:0});
}
async function noListeners(page:Page){expect(await page.evaluate(()=>[...(window as any).__viewerListeners.values()].every((s:Set<unknown>)=>s.size===0))).toBe(true)}
async function fits(page:Page){
 await expect.poll(()=>page.locator('.call-preview').evaluate(el=>{
  const r=el.getBoundingClientRect(),v=el.querySelector('video')!,b=el.querySelector('button')!.getBoundingClientRect();
  return {x:Math.round(r.x),y:Math.round(r.y),widthDiff:Math.round(r.width-innerWidth),heightDiff:Math.round(r.height-innerHeight),
   background:getComputedStyle(el).backgroundColor,fit:getComputedStyle(v).objectFit,buttonVisible:b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight};
 })).toEqual({x:0,y:0,widthDiff:0,heightDiff:0,background:'rgb(0, 0, 0)',fit:'contain',buttonVisible:true});
}
async function fallback(page:Page){await page.evaluate(()=>{
 Object.defineProperty(HTMLElement.prototype,'requestFullscreen',{configurable:true,value:undefined});
 (document.querySelector('call-page') as any).requestUpdate();
})}

test('local native fullscreen keeps the same video and stream; button, Escape and browser exit synchronize',async({page})=>{
 const button=page.locator('.call-fullscreen');await button.click();
 await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.classList.contains('call-preview'))).toBe(true);
 await expect(button).toHaveText('Sair da tela cheia');await fits(page);await intact(page);
 await button.click();await expect.poll(()=>page.evaluate(()=>document.fullscreenElement)).toBe(null);await noListeners(page);await intact(page);
 await button.click();await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 await page.keyboard.press('Escape');await expect(button).toHaveText('Tela cheia');await expect.poll(()=>page.evaluate(()=>document.fullscreenElement)).toBe(null);await noListeners(page);await intact(page);
 await button.click();await page.evaluate(()=>document.exitFullscreen());await expect(button).toHaveText('Tela cheia');await noListeners(page);await intact(page);
 await button.click();
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true);
 await page.evaluate(()=>{const track=(window as any).__track;track.stop();track.dispatchEvent(new Event('ended'))});
 await expect(button).toHaveCount(0);await expect.poll(()=>page.evaluate(()=>document.fullscreenElement)).toBe(null);await noListeners(page);
});

test('CSS fallback fits desktop and mobile in both themes, traps focus and restores the page',async({page},info)=>{
 await fallback(page);await expect(page.locator('.call-fullscreen')).toHaveText('Ampliar tela');
 for(const width of[1366,768,390,320])for(const theme of['dark','light']){
  await page.setViewportSize({width,height:width<500?844:900});
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  const button=page.locator('.call-fullscreen');await button.scrollIntoViewIfNeeded();
  const before=await page.evaluate(()=>({scroll:scrollY,overflow:getComputedStyle(document.documentElement).overflow}));
  await button.click();await expect(button).toHaveText('Sair do modo expandido');await fits(page);await intact(page);
  await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Desmutar microfone',exact:true})).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(button).toBeFocused();
  const outline=await button.evaluate(el=>getComputedStyle(el).outlineStyle);expect(outline).not.toBe('none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`local-expanded-${width}-${theme}.png`)});
  if(theme==='dark')await page.keyboard.press('Escape');else await button.click();
  await expect(page.locator('.is-expanded')).toHaveCount(0);await noListeners(page);await intact(page);await expect(button).toBeFocused();
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overflow)).toBe(before.overflow);
  expect(Math.abs(await page.evaluate(()=>scrollY)-before.scroll)).toBeLessThan(2);
 }
 await page.locator('.call-fullscreen').click();
 await page.evaluate(()=>{const track=(window as any).__track;track.stop();track.dispatchEvent(new Event('ended'))});
 await expect(page.locator('.call-fullscreen')).toHaveCount(0);await expect(page.locator('.is-expanded')).toHaveCount(0);await noListeners(page);
 expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
});

test('rejected native request falls back; navigation restores scroll and leaving the call releases media',async({page})=>{
 await page.evaluate(()=>{HTMLElement.prototype.requestFullscreen=()=>Promise.reject(new DOMException('Unavailable','NotAllowedError'));document.body.style.overflow='auto'});
 await page.locator('.call-fullscreen').click();await expect(page.locator('.call-fullscreen')).toHaveText('Sair do modo expandido');await fits(page);
 await page.evaluate(()=>{location.hash='#/'});
 await expect(page.getByRole('button',{name:'Sair da chamada',exact:true})).toBeVisible();
 await expect(page.locator('.call-preview.is-expanded')).toHaveCount(0);
 expect(await page.evaluate(()=>({body:document.body.style.overflow,root:getComputedStyle(document.documentElement).overflow==='hidden'}))).toEqual({body:'auto',root:false});await noListeners(page);
 expect(await page.evaluate(()=>(window as any).__track.readyState)).toBe('live');
 await page.getByRole('button',{name:'Sair da chamada',exact:true}).click();
 await expect(page.locator('call-page')).toBeHidden();
 await expect(page.locator('.call-dock')).toHaveCount(0);
 expect(await page.evaluate(()=>(window as any).__track.readyState)).toBe('ended');
});

test('late fullscreen resolution after leaving the call cannot retain expansion or media',async({page})=>{
 await page.evaluate(()=>{HTMLElement.prototype.requestFullscreen=()=>new Promise(resolve=>(window as any).__resolveFullscreen=resolve)});
 await page.locator('.call-fullscreen').click();await expect(page.locator('.call-fullscreen')).toHaveText('Sair da tela cheia');
 await page.evaluate(()=>{location.hash='#/'});
 await page.getByRole('button',{name:'Sair da chamada',exact:true}).click();
 await expect(page.locator('call-page')).toBeHidden();
 await expect(page.locator('.call-dock')).toHaveCount(0);
 await page.evaluate(()=>(window as any).__resolveFullscreen());await noListeners(page);
 expect(await page.evaluate(()=>document.fullscreenElement)).toBe(null);expect(await page.evaluate(()=>getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
 expect(await page.evaluate(()=>(window as any).__track.readyState)).toBe('ended');
});
