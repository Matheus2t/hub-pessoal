/** Local screen-sharing goals. These are ceilings, never guaranteed network quality. */
export type ScreenQuality='normal'|'high'|'max';
export type ScreenContent='screen'|'game';
export interface ScreenPreset {
 label:string;
 width:number;height:number;fps:number;
 screenBitrate:number;gameBitrate:number;
}
export const screenPresets:Readonly<Record<ScreenQuality,ScreenPreset>>={
 normal:{label:'Normal · 720p / 30 FPS',width:1280,height:720,fps:30,screenBitrate:4000000,gameBitrate:5500000},
 high:{label:'Alta · 1080p / 60 FPS',width:1920,height:1080,fps:60,screenBitrate:10000000,gameBitrate:13000000},
 max:{label:'Máxima · 1440p / 60 FPS',width:2560,height:1440,fps:60,screenBitrate:16000000,gameBitrate:22000000}
};
export const screenQualityOptions:ReadonlyArray<ScreenQuality>=['normal','high','max'];
export const defaultScreenQuality:ScreenQuality='high';

export function screenCaptureConstraints(quality:ScreenQuality):DisplayMediaStreamOptions{
 const {width,height,fps}=screenPresets[quality];
 // getDisplayMedia rejects min/exact; use ideal here, apply max after selection.
 return {video:{width:{ideal:width},height:{ideal:height},frameRate:{ideal:fps}},audio:true};
}
export function screenTrackConstraints(quality:ScreenQuality):MediaTrackConstraints{
 const {width,height,fps}=screenPresets[quality];
 return {width:{ideal:width,max:width},height:{ideal:height,max:height},frameRate:{ideal:fps,max:fps}};
}

/** Progressive fallback: preserve resolution before reducing FPS or scaling. */
export function screenEncoding(quality:ScreenQuality,content:ScreenContent,tier:number){
 const preset=screenPresets[quality],level=Math.max(0,Math.min(3,Math.floor(tier)));
 const maxBitrate=content==='game'?preset.gameBitrate:preset.screenBitrate;
 const bitrateFactors=[1,.86,.70,.56];
 const fpsFactors=[1,1,.8,.55];
 const scales:Record<ScreenQuality,number[]>={
  normal:[1,1,1,1],
  high:[1,1,1.2,1.5],
  max:[1,1,1.14,4/3]
 };
 return {
  maxBitrate:Math.round(maxBitrate*bitrateFactors[level]),
  maxFramerate:Math.round(preset.fps*fpsFactors[level]),
  scaleResolutionDownBy:scales[quality][level]
 };
}
