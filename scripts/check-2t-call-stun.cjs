// Optional outbound-only probe. No microphone, room, tunnel, TURN or public listener.
const {chromium}=require('@playwright/test');
(async()=>{
 const browser=await chromium.launch({channel:process.env.PW_CHANNEL||'chrome'});
 try{
  const page=await browser.newPage();
  const result=await page.evaluate(()=>new Promise(async(resolve,reject)=>{
   const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.cloudflare.com:3478'}]});
   const types={},errors=new Set();let done=false;
   const finish=reason=>{if(done)return;done=true;clearTimeout(timer);pc.close();resolve({status:(types.srflx??0)>0?'mapped':'not-confirmed',gathering:reason,candidateTypes:types,errorCodes:[...errors]})};
   const timer=setTimeout(()=>finish('timed-out'),12000);
   pc.onicecandidate=e=>{if(e.candidate){const type=e.candidate.type||'unknown';types[type]=(types[type]??0)+1}};
   pc.onicecandidateerror=e=>errors.add(e.errorCode);
   pc.onicegatheringstatechange=()=>{if(pc.iceGatheringState==='complete')finish('complete')};
   try{pc.addTransceiver('audio',{direction:'recvonly'});await pc.setLocalDescription()}catch{clearTimeout(timer);pc.close();reject(new Error('STUN probe could not start'))}
  }));
  // Candidate contents, IPs, ports and SDP are deliberately never printed.
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(result.status!=='mapped')process.exitCode=2;
 }finally{await browser.close()}
})().catch(()=>{process.stderr.write('STUN probe failed; no private diagnostics were logged.\n');process.exitCode=1});
