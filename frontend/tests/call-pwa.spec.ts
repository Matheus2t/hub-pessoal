import {test,expect} from '@playwright/test';

test('PWA manifest starts in Call and publishes an offline-only public shell',async({page,request})=>{
 await page.goto('/#/call');
 await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','/manifest.webmanifest');
 const manifestResponse=await request.get('/manifest.webmanifest');
 expect(manifestResponse.ok()).toBe(true);
 const manifest=await manifestResponse.json();
 expect(manifest).toMatchObject({name:'Call',start_url:'/#/call',display:'standalone',scope:'/'});
 expect(manifest.icons.some((icon:any)=>icon.src==='/2t-mark.svg'&&icon.type==='image/svg+xml')).toBe(true);
 expect((await request.get('/2t-mark.svg')).ok()).toBe(true);
 const workerResponse=await request.get('/service-worker.js');
 expect(workerResponse.ok()).toBe(true);
 const worker=await workerResponse.text();
 expect(worker).toContain("self.addEventListener('fetch'");
 expect(worker).toContain("if(req.method!=='GET'||url.origin!==self.location.origin||!SHELL.includes(url.pathname))return;");
 expect(worker).not.toContain('/call/ws');
 expect(worker).not.toContain('indexedDB');
});
