#!/usr/bin/env node
/** Generate only public legacy Listening clips using pinned, permissively licensed Piper voices. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const PRIVATE=path.join(ROOT,'private/learn-audio-public');
const MODEL_DIR=path.join(PRIVATE,'models');
const WORK=path.join(PRIVATE,'work');
const OUTPUT=path.join(ROOT,'frontend/public/learn/audio');
const REVISION='cf910fb';
const MODELS={
 en:{name:'en_US-joe-medium',locale:'en-US',accent:'General American',path:'en/en_US/joe/medium',cardSha:'d6c9dc095927749342e44c7f5cf99432ff91a3d9',cardBytes:423,configSha:'9dbbd529471dd6064fabc4e6927ede028dc0f94a',configBytes:5465,modelSha:'abf4b998e34045cbd00eaf050de2de620f81ded6eb8b85a24b022a1c2b3f08d2',modelBytes:63221984},
 ru:{name:'ru_RU-denis-medium',locale:'ru-RU',accent:'Russian',path:'ru/ru_RU/denis/medium',cardSha:'a97e89d1da2fcbced2e4a42ac49a670a1c19c8a8',cardBytes:418,configSha:'ef303184a1b36263939cee3375333b7c8342dbc6',configBytes:5464,modelSha:'879bc365cb14d1380e3f5ed6044162ccf54c99f6161871569b7f830aec3ce841',modelBytes:63221984},
};
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlobSha1=bytes=>crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
function run(command,args){const result=spawnSync(command,args,{cwd:ROOT,encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});if(result.error||result.status!==0)throw Error(`${command} falhou: ${result.error?.message||result.stderr?.slice(-1200)||result.status}`);return result;}
async function artifact(model,key,filename,expectedBytes,expectedHash){
 const destination=path.join(MODEL_DIR,`${key}-${filename}`);
 let bytes=fs.existsSync(destination)?fs.readFileSync(destination):null;
 const valid=()=>bytes&&bytes.length===expectedBytes&&(filename==='MODEL_CARD'?gitBlobSha1(bytes)===expectedHash:filename.endsWith('.onnx')?sha256(bytes)===expectedHash:gitBlobSha1(bytes)===expectedHash);
 if(!valid()){
  const url=`https://huggingface.co/rhasspy/piper-voices/resolve/${REVISION}/${model.path}/${filename}`;
  const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw Error(`Origem oficial retornou HTTP ${response.status} ao buscar ${filename}.`);
  bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==expectedBytes||(filename==='MODEL_CARD'?gitBlobSha1(bytes):filename.endsWith('.onnx')?sha256(bytes):gitBlobSha1(bytes))!==expectedHash)throw Error(`Hash/tamanho divergente para ${filename}; artefato rejeitado.`);
  fs.mkdirSync(MODEL_DIR,{recursive:true});fs.writeFileSync(destination,bytes);
 }
 if(filename==='MODEL_CARD'&&(!/\* License:\s*CC0\b/i.test(bytes.toString('utf8'))||!/rdh base model[^\n]*CC0/i.test(bytes.toString('utf8'))))throw Error(`A licença CC0 e a cadeia rdh do model card ${key} não conferem.`);
 return destination;
}
function catalog(language){return JSON.parse(fs.readFileSync(path.join(ROOT,`frontend/public/learn/${language}.json`),'utf8'));}
function generate(language,exercise,python){
 const model=MODELS[language],id=exercise.id;
 if(!/^[a-z0-9-]+$/.test(id)||!exercise.audio?.trim())throw Error(`Estímulo inválido: ${id}`);
 const outputDir=path.join(OUTPUT,language),output=path.join(outputDir,`${id}.mp3`);
 if(fs.existsSync(output)&&!process.argv.includes('--force'))throw Error(`Arquivo já existe; use --force apenas para regeneração intencional: ${id}`);
 const work=path.join(WORK,language,id);fs.mkdirSync(work,{recursive:true});fs.mkdirSync(outputDir,{recursive:true});
 const text=path.join(work,'input.txt'),wav=path.join(work,'output.wav');fs.writeFileSync(text,exercise.audio.normalize('NFC')+'\n','utf8');
 run(python,['-m','piper','-m',path.join(MODEL_DIR,`${language}-${model.name}.onnx`),'-c',path.join(MODEL_DIR,`${language}-${model.name}.onnx.json`),'-i',text,'-f',wav]);
 run(process.env.FFMPEG_BIN||'ffmpeg',['-v','error','-i',wav,'-af','loudnorm=I=-18:TP=-2:LRA=11','-ar','22050','-ac','1','-codec:a','libmp3lame','-b:a','64k','-write_xing','0','-y',output]);
 const bytes=fs.readFileSync(output);if(bytes.length<512||bytes.toString('ascii',0,3)!=='ID3'&&bytes[0]!==0xff)throw Error(`MP3 inválido ou curto demais: ${id}`);
 return {id,bytes:bytes.length,sha256:sha256(bytes),language,voice:model.name,locale:model.locale};
}
async function main(){
 const python=process.env.PIPER_PYTHON||path.join(PRIVATE,'.venv','Scripts','python.exe');
 if(!fs.existsSync(python))throw Error(`Piper não instalado. Crie private/learn-audio-public/.venv e instale piper-tts==1.8.0; consulte docs/learn-audio-public.md.`);
 fs.mkdirSync(PRIVATE,{recursive:true});
 const results=[];
 for(const language of ['en','ru']){
  const model=MODELS[language];
  const card=await artifact(model,language,'MODEL_CARD',model.cardBytes,model.cardSha);
  const config=await artifact(model,language,`${model.name}.onnx.json`,model.configBytes,model.configSha);
  const onnx=await artifact(model,language,`${model.name}.onnx`,model.modelBytes,model.modelSha);
  fs.copyFileSync(card,path.join(MODEL_DIR,`MODEL_CARD_${language}`));
  run(python,['-c','import piper; print("Piper runtime available")']);
  results.push(...catalog(language).exercises.filter(item=>item.skill==='listening').map(item=>generate(language,item,python)));
 }
 console.log(JSON.stringify({generated:results.length,bytes:results.reduce((sum,item)=>sum+item.bytes,0),voices:Object.fromEntries(Object.entries(MODELS).map(([language,model])=>[language,{name:model.name,locale:model.locale,accent:model.accent,revision:REVISION,datasetLicense:'CC0'}])),files:results},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
