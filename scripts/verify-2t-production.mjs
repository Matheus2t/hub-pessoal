/**
 * Read-only production verification for the existing 2T domain/project.
 * Does not attempt deployment or require/store credentials.
 */
const root='https://matheus2t.com.br';
const endpoints=['/','/learn.js','/api/health'];
const maxAttempts=5;
const pause=15000;
let verified=false;
for(let attempt=1;attempt<=maxAttempts;attempt++){
  const observations=[];
  try{
    for(const path of endpoints){
      const response=await fetch(root+path,{headers:{accept:path.endsWith('.js')?'application/javascript':'*/*'},redirect:'follow',signal:AbortSignal.timeout(20000)});
      const body=await response.text();
      const result={path,http:response.status,type:response.headers.get('content-type'),finalURL:response.url,vercel:!!response.headers.get('x-vercel-id')};
      if(path==='/learn.js'){
        result.hasPhoneticEditor=body.includes('learn-phonetic-editor');
        result.hasPhoneticToggle=body.includes('Fonético');
        result.hasRussianHelper=body.includes('Teclado americano');
      }
      observations.push(result);
    }
    console.log(JSON.stringify({attempt,observations}));
    const allOK=observations.every(x=>x.http===200&&!x.finalURL.includes('vercel.com/login'));
    const learn=observations.find(x=>x.path==='/learn.js');
    if(allOK&&learn?.hasPhoneticEditor&&learn?.hasPhoneticToggle&&learn?.hasRussianHelper){
      verified=true;break;
    }
  }catch(err){console.log(JSON.stringify({attempt,error:String(err).slice(0,300)}));}
  if(attempt<maxAttempts)await new Promise(resolve=>setTimeout(resolve,pause));
}
if(!verified){
  console.error('Domínio acessível parcialmente ou bundle Learn sem teclado fonético. Verifique projeto/domínio/deployment na Vercel.');
  process.exitCode=1;
}else console.log('Produção confirmada: domínio, API e novo Learn carregados com HTTP 200.');
