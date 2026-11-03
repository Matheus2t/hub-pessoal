// Preview only. The live TradingView web component cannot resize the parent document.
const widget=document.querySelector('tv-tickers');
const allowed=new Set(['ITUB4','PETR4','VALE3','MGLU3']);
function theme(){try{return parent.document.documentElement.dataset.theme==='light'?'light':'dark'}catch{return'dark'}}
widget.setAttribute('theme',theme());
widget.setAttribute('symbol-url',location.origin+'/#/acoes/{tvsymbol}');
if(parent!==window){try{new MutationObserver(()=>{const next=theme();if(widget.getAttribute('theme')!==next)widget.setAttribute('theme',next)}).observe(parent.document.documentElement,{attributes:true,attributeFilter:['data-theme']})}catch{}}
widget.addEventListener('tv-link-open',event=>{
 const raw=event.detail?.context?.symbol;
 const symbol=typeof raw==='string'?raw.replace(/^BMFBOVESPA:/,''):'';
 if(!allowed.has(symbol))return;
 event.preventDefault();
 try{parent.location.hash='#/acoes/'+symbol}catch{location.hash='#/acoes/'+symbol}
});
