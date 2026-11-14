type StopAudio=()=>void;
const activePlayers=new Set<StopAudio>();

/** Coordinate the single audible Learn source across files and browser synthesis. */
export function registerLearnAudioPlayer(stop:StopAudio):()=>void {
  activePlayers.add(stop);
  return ()=>activePlayers.delete(stop);
}

export function stopOtherLearnAudioPlayers(current:StopAudio):void {
  for(const stop of activePlayers)if(stop!==current)stop();
}
