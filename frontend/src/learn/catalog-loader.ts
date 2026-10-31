import {validateCurriculum,type Curriculum} from './content';
import type {Language} from './model';
const cache=new Map<Language,Promise<Curriculum>>();
export function loadCurriculum(language:Language):Promise<Curriculum>{
  let pending=cache.get(language);
  if(!pending){pending=fetch(`/learn/${language}.json`).then(async r=>{
    if(!r.ok)throw Error('Catálogo indisponível');
    const data:Curriculum=await r.json();
    if(data.language!==language||!Array.isArray(data.words)||!Array.isArray(data.exercises))throw Error('Catálogo inválido');
    validateCurriculum(data);return data;
  }).catch(error=>{cache.delete(language);throw error});cache.set(language,pending)}
  return pending;
}
