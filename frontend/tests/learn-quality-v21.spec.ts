import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {evaluateExerciseAnswer,normalizeAnswer} from '../src/learn/engine';
import type {Exercise} from '../src/learn/content';

const files=['en','ru'].map(language=>JSON.parse(readFileSync(`frontend/public/learn/${language}.json`,'utf8')));
const find=(language:'en'|'ru',id:string):Exercise=>{
 const catalog=files[language==='en'?0:1];
 const item=catalog.exercises.find((x:Exercise)=>x.id===id);
 if(!item)throw Error('Legacy exercise missing: '+id);
 return item;
};
test('V21 preserves 474 unique legacy exercises and zero duplicated answers',()=>{
 const exercises=files.flatMap(data=>data.exercises) as Exercise[];
 expect(exercises).toHaveLength(474);
 expect(new Set(exercises.map(x=>x.id)).size).toBe(474);
 for(const item of exercises){
  expect(new Set(item.answers.map(x=>normalizeAnswer(x,item.acceptYoAsE))).size,item.id).toBe(item.answers.length);
  expect(item.prompt.trim().length,item.id).toBeGreaterThan(8);
  expect(item.explanation.trim().length,item.id).toBeGreaterThan(11);
 }
});
test('V21 accepts formal phrasing and informal Russian address when meaning is preserved',()=>{
 for(const [id,response]of [
  ['ru-writing-074','Мой коллега говорит на русском языке.'],
  ['ru-writing-084','Твой ответ правильный.'],
  ['ru-writing-084','Твой ответ верный.'],
  ['ru-writing-097','Можешь показать мне на карте?'],
 ]){
  expect(evaluateExerciseAnswer(response,find('ru',id)),id).toBe('correct');
 }
 expect(evaluateExerciseAnswer('Моя коллега говорит по-русски.',find('ru','ru-writing-074'))).toBe('uncertain');
 expect(evaluateExerciseAnswer('Ты можешь сказать, где на карте?',find('ru','ru-writing-097'))).toBe('uncertain');
});
test('V21 keeps unknown translations uncertain instead of declaring them incorrect',()=>{
 expect(evaluateExerciseAnswer('My colleague can speak Russian.',find('en','en-writing-074'))).toBe('uncertain');
 expect(evaluateExerciseAnswer('Мой коллега говорит на русском языке.',find('ru','ru-writing-074'))).toBe('correct');
 expect(evaluateExerciseAnswer('Мой коллега говорит по-русски.',find('ru','ru-writing-074'))).toBe('correct');
});
test('V21 keeps ё/е distinct unless explicitly enabled by the item',()=>{
 const item=find('ru','ru-dictation-017');
 expect(item.acceptYoAsE).not.toBe(true);
 expect(normalizeAnswer('Ребёнок спит.')===normalizeAnswer('Ребенок спит.')).toBe(false);
});
