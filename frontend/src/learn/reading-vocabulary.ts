import type {Curriculum,Reading} from './content';
/** Exact registered forms only. No fuzzy matching, stemming or translation request. */
export function readingTokens(unit:Reading,catalog:Curriculum):{text:string;id?:string}[]{
 const forms=new Map<string,string>();
 for(const id of unit.vocabulary){const word=catalog.words.find(w=>w.id===id);if(word)forms.set(word.word.toLocaleLowerCase(),id)}
 for(const term of unit.forms||[])forms.set(term.text.toLocaleLowerCase(),term.wordId);
 const keys=[...forms.keys()].sort((a,b)=>b.length-a.length);if(!keys.length)return [{text:unit.text}];
 const escaped=keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 return unit.text.split(new RegExp(`((?<![\\p{L}\\p{N}])(?:${escaped.join('|')})(?![\\p{L}\\p{N}]))`,'giu')).filter(Boolean).map(text=>({text,id:forms.get(text.toLocaleLowerCase())}));
}
