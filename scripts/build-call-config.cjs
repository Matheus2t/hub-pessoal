// Public endpoint only: no token, owner password, invitation or TURN secret.
const fs=require('node:fs');
const path=require('node:path');
function configure(folder=path.resolve('dist'),value=process.env.CALL_SIGNAL_URL||''){
 let endpoint='';
 if(value){const url=new URL(value);if(url.protocol!=='wss:'||url.username||url.password||url.search||url.hash||url.pathname!=='/call/ws')throw new Error('CALL_SIGNAL_URL must be an exact WSS /call/ws URL without credentials');endpoint=url.href}
 fs.writeFileSync(path.join(folder,'call-config.js'),`globalThis.__2T_CALL_SIGNAL_URL__=${JSON.stringify(endpoint)};\n`);
 const file=path.join(folder,'index.html');let html=fs.readFileSync(file,'utf8');
 if(endpoint){const ws=new URL(endpoint),https=new URL(endpoint);https.protocol='https:';
  html=html.replace("connect-src 'self'",`connect-src 'self' ${ws.origin} ${https.origin}`);
 }
 fs.writeFileSync(file,html);
}
module.exports={configure};
if(require.main===module)configure();
