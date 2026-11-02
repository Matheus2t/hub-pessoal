import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {validateCurriculum,type Curriculum} from '../src/learn/content';
import {readingTokens} from '../src/learn/reading-vocabulary';
for(const language of ['en','ru'])test(`B1 additive content preserves all old objects; forms keep punctuation ${language}`,()=>{
 const current=JSON.parse(readFileSync(`frontend/public/learn/${language}.json`,'utf8')) as Curriculum,base=JSON.parse(execFileSync('git',['show',`69e5534:frontend/public/learn/${language}.json`],{encoding:'utf8'}));validateCurriculum(current);
 for(const key of ['words','phrases','exercises','readings','lessons'] as const)for(const original of base[key])expect(current[key]!.find(row=>row.id===original.id)).toEqual(original);
 expect(current.words).toHaveLength(162);expect(current.phrases).toHaveLength(62);expect(current.exercises).toHaveLength(237);
 for(const reading of current.readings!){const tokens=readingTokens(reading,current);expect(tokens.map(t=>t.text).join('')).toBe(reading.text);expect(tokens.filter(t=>t.id).every(t=>reading.vocabulary.includes(t.id!))).toBe(true)}
 if(language==='ru'){const r=current.readings!.find(r=>r.id==='ru-v2-reading-001')!;expect(readingTokens(r,current)).toContainEqual({text:'опыта',id:'ru-v2-word-011'})}
});
