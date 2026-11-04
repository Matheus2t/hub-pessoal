import {test,expect} from '@playwright/test';

// Opt-in deployment smoke only. Never accepts or reads the owner's Render key.
const preview=process.env.CALL_PREVIEW_URL;
const signal='wss://twot-call.onrender.com/call/ws';
test.skip(!preview,'Provide the exact authorized HTTPS preview URL.');
test.setTimeout(120000); // Includes the existing 90-second, user-initiated cold-start wait.
test.use({trace:'off',video:'off',screenshot:'off'});

test('private preview loads public Render configuration and refuses an unauthenticated room',async({page})=>{
 const origin=new URL(preview!).origin;
 expect(origin.startsWith('https://')).toBe(true);
 expect(new URL(origin).hostname.endsWith('.vercel.app')).toBe(true);
 const token=process.env.VERCEL_OIDC_TOKEN;
 // Scope Vercel authentication to this preview only; never send it to Render,
 // widgets, fonts or another origin. Keep request/header tracing disabled.
 if(token)await page.route(origin+'/**',route=>route.continue({headers:{...route.request().headers(),'x-vercel-trusted-oidc-idp-token':token}}));
 const errors:string[]=[],sockets:string[]=[],insecure:string[]=[],renderCredentialHeaders:boolean[]=[];
 page.on('pageerror',error=>errors.push(error.name));
 page.on('websocket',socket=>sockets.push(socket.url()));
 page.on('request',request=>{
  const url=new URL(request.url());
  if(url.protocol==='http:'||url.protocol==='ws:')insecure.push(url.origin);
  if(url.origin==='https://twot-call.onrender.com'){
   const headers=request.headers();renderCredentialHeaders.push(Boolean(headers.authorization||headers['x-vercel-trusted-oidc-idp-token']||headers.cookie));
  }
 });
 const response=await page.goto(origin+'/#/call');expect(response?.status()).toBe(200);
 await expect(page.getByRole('heading',{name:'2T Call',exact:true})).toBeVisible();
 const config=await page.evaluate(async()=>({value:(globalThis as any).__2T_CALL_SIGNAL_URL__,status:(await fetch('/call-config.js')).status}));
 expect(config).toEqual({value:signal,status:200});
 const csp=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
 expect(csp).toContain('wss://twot-call.onrender.com');expect(csp).toContain('https://twot-call.onrender.com');
 await page.getByLabel('Seu nome',{exact:true}).fill('Security smoke');
 await page.getByText('Sou o proprietário',{exact:true}).click();
 // Public invalid marker, not an authentication secret. No successful room is created.
 await page.getByLabel('Credencial do proprietário',{exact:true}).fill('test-only-invalid-render-credential');
 await page.getByRole('button',{name:'Criar sala privada',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Credencial inválida.',{timeout:95000});
 expect(sockets).toEqual([signal]);expect(renderCredentialHeaders.length).toBeGreaterThan(0);
 expect(renderCredentialHeaders.some(Boolean)).toBe(false);
 expect(insecure).toEqual([]);expect(errors).toEqual([]);
 await expect(page.getByLabel('Credencial do proprietário',{exact:true})).toHaveValue('');
 for(const width of [1366,768,390,320])for(const theme of ['dark','light']){
  await page.setViewportSize({width,height:950});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('navigation',{name:'Navegação principal'}).getByRole('link',{name:'2T Call',exact:true})).toHaveAttribute('aria-current','page');
  if((width===1366&&theme==='dark')||(width===320&&theme==='light'))await page.screenshot({path:test.info().outputPath(`preview-${width}-${theme}.png`),fullPage:true,animations:'disabled'});
 }
 await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('link',{name:'Início',exact:true}).click();
 await expect(page.locator('call-page')).toHaveCount(0);
});
