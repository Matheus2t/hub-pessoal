/* 2T Call PWA — cache only public application-shell assets, never live call traffic. */
const CACHE='2t-call-shell-v1';
const SHELL=['/','/bundle.js','/styles.css','/2t-mark.svg','/manifest.webmanifest'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('2t-call-shell-')&&key!==CACHE).map(key=>caches.delete(key)))),
  self.clients.claim()
 ]));
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||!SHELL.includes(url.pathname))return;
 event.respondWith(fetch(req).then(async response=>{
  if(response.ok&&response.type==='basic'){
   try{const cache=await caches.open(CACHE);await cache.put(req,response.clone())}catch{/* A full cache must not break live navigation. */}
  }
  return response;
 }).catch(async()=>await caches.match(req)||Response.error()));
});
