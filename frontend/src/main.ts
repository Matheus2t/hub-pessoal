import "./components/app-shell";

// Installed 2T Call uses the same site; keep the call itself network-dependent.
// Local WebRTC test fixtures should never be controlled by a service worker.
if('serviceWorker' in navigator&&window.isSecureContext&&
   location.hostname!=='localhost'&&location.hostname!=='127.0.0.1'){
 window.addEventListener('load',()=>{
  void navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
 },{once:true});
}
