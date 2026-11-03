// Live TradingView ticker remains isolated from the parent document.
const widget=document.querySelector('tv-tickers');
const allowed=new Set(['ITUB4','PETR4','VALE3','MGLU3']);
function theme(){try{return parent.document.documentElement.dataset.theme==='light'?'light':'dark'}catch{return'dark'}}
document.documentElement.dataset.theme=theme();
widget.setAttribute('theme',theme());
widget.setAttribute('symbol-url',location.origin+'/#/acoes/{tvsymbol}');
if(parent!==window){try{new MutationObserver(()=>{const next=theme();document.documentElement.dataset.theme=next;if(widget.getAttribute('theme')!==next)widget.setAttribute('theme',next)}).observe(parent.document.documentElement,{attributes:true,attributeFilter:['data-theme']})}catch{}}
widget.addEventListener('tv-link-open',event=>{
 const raw=event.detail?.context?.symbol;
 const symbol=typeof raw==='string'?raw.replace(/^BMFBOVESPA:/,''):'';
 if(!allowed.has(symbol))return;
 event.preventDefault();
 try{parent.location.hash='#/acoes/'+symbol}catch{location.hash='#/acoes/'+symbol}
});

// Wheel gestures inside the same-origin iframe must scroll the enclosing
// document, not become trapped in a separate browsing context. Keep clicks,
// hover popovers and Ctrl+wheel browser zoom unchanged.
if (parent !== window) {
  window.addEventListener('wheel', event => {
    if (event.ctrlKey) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    event.preventDefault();
    parent.scrollBy(event.deltaX * unit, event.deltaY * unit);
  }, { capture: true, passive: false });
}
