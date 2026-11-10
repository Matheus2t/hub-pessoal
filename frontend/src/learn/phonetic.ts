/**
 * Russian phonetic keyboard. Pure model: input positions are UTF-16 offsets, as
 * in textarea.selectionStart/End. A phonetic unit (sh, shch, x, ...) is atomic
 * for deletion, selection replacement and cursor movement.
 */
const combinations:ReadonlyArray<readonly [string,string]> = [
  ['shch','щ'],['sch','щ'],['yo','ё'],['yu','ю'],['ya','я'],
  ['zh','ж'],['ch','ч'],['sh','ш'],['kh','х'],['ts','ц'],['eh','э']
];
const singles:Readonly<Record<string,string>> = {
  a:'а', b:'б', c:'ц', d:'д', e:'е', f:'ф', g:'г', h:'х',
  i:'и', j:'й', k:'к', l:'л', m:'м', n:'н', o:'о', p:'п',
  q:'к', r:'р', s:'с', t:'т', u:'у', v:'в', w:'в',
  x:'кс', y:'ы', z:'з'
};
export const phoneticExamples = ['privet → привет','sh → ш','shch → щ','ya → я','yu → ю','yo → ё'];
export type Segment = {rawStart:number;rawEnd:number;start:number;end:number;value:string};
export type Snapshot = {raw:string;position:number};
export type Edit = {value:string;position:number;changed:boolean};
const latin = (char:string) => /^[a-z]$/i.test(char);
const letterCase = (text:string,raw:string) => raw===raw.toUpperCase() ? text.toUpperCase() : text;

/** Greedy ordered parse. All original Cyrillic and punctuation is passed through. */
export function transliterate(raw:string,enabled=true):{value:string;segments:Segment[]} {
  const segments:Segment[]=[];let value='';
  for(let i=0;i<raw.length;){
    let size=1,converted=raw[i];
    if(enabled&&latin(raw[i])){
      let found=false;
      for(const [source,replacement] of combinations){
        const candidate=raw.slice(i,i+source.length);
        if(candidate.toLowerCase()===source) {
          size=source.length;converted=letterCase(replacement,candidate);found=true;break;
        }
      }
      if(!found)converted=letterCase(singles[raw[i].toLowerCase()]||raw[i],raw[i]);
    }else {
      const code=raw.codePointAt(i)!;
      size=code>0xffff?2:1;
      converted=raw.slice(i,i+size);
    }
    const start=value.length;
    value+=converted;
    segments.push({rawStart:i,rawEnd:i+size,start,end:value.length,value:converted});
    i+=size;
  }
  return {value,segments};
}
function toRaw(position:number,segments:Segment[],rawLength:number,edge:'start'|'end'='start'):number {
  for(const seg of segments) {
    if(position<=seg.start)return seg.rawStart;
    if(position===seg.end)return seg.rawEnd;
    if(position<seg.end)return edge==='start'?seg.rawStart:seg.rawEnd;
  }
  return rawLength;
}
function toDisplay(position:number,segments:Segment[],length:number):number {
  for(const seg of segments) {
    if(position<=seg.rawStart)return seg.start;
    if(position<=seg.rawEnd)return seg.end;
  }
  return length;
}
const whitespace = (s:string)=>/\s/u.test(s);
export class PhoneticBuffer {
  private rawValue='';
  private enabledValue=true;
  private past:Snapshot[]=[];
  private future:Snapshot[]=[];
  private cursor=0;
  constructor(raw='',enabled=true){this.rawValue=raw;this.enabledValue=enabled;this.cursor=this.value.length;}
  get value(){return transliterate(this.rawValue,this.enabledValue).value;}
  get raw(){return this.rawValue;}
  get enabled(){return this.enabledValue;}
  get position(){return this.cursor;}
  setEnabled(value:boolean,position:number=this.cursor):Edit {
    if(value===this.enabledValue)return {value:this.value,position,changed:false};
    const text=this.value;
    this.enabledValue=value;
    // Lock already visible characters, preserving what the user actually sees.
    this.rawValue=text;this.past=[];this.future=[];
    this.cursor=Math.min(position,this.value.length);
    return {value:this.value,position:this.cursor,changed:false};
  }
  /** For programmatic filling, IME commits or an unrecognized browser input event. */
  external(text:string,position:number=text.length):Edit {
    const before=this.value;
    this.remember();
    this.rawValue=text;
    this.cursor=Math.min(position,this.value.length);
    this.future=[];
    return {value:this.value,position:this.cursor,changed:this.value!==before};
  }
  /** Replace one editor selection. The visible value is never persisted as raw Latin. */
  edit(kind:string,data:string|null,start:number,end:number,maxLength=2000):Edit {
    const before=transliterate(this.rawValue,this.enabledValue),length=before.value.length;
    start=Math.max(0,Math.min(length,start));end=Math.max(start,Math.min(length,end));
    let left=toRaw(start,before.segments,this.rawValue.length,'start');
    let right=toRaw(end,before.segments,this.rawValue.length,'end');
    const range=start!==end;
    if(!range) {
      left=toRaw(start,before.segments,this.rawValue.length,'end');
      right=left;
      if(kind.startsWith('delete')) {
        if(kind.includes('Backward')&&start>0){
          let cut=start-1;
          if(kind.includes('Word')) {
            while(cut>0&&whitespace(before.value[cut]))cut--;
            while(cut>0&&!whitespace(before.value[cut-1]))cut--;
          }else if(kind.includes('Line'))cut=before.value.lastIndexOf('\n',start-1)+1;
          left=toRaw(cut,before.segments,this.rawValue.length,'start');
        }else if(kind.includes('Forward')&&start<length){
          let cut=start+1;
          if(kind.includes('Word')) {
            while(cut<length&&!whitespace(before.value[cut]))cut++;
            while(cut<length&&whitespace(before.value[cut]))cut++;
          }else if(kind.includes('Line')){const next=before.value.indexOf('\n',start);cut=next<0?length:next+1;}
          right=toRaw(cut,before.segments,this.rawValue.length,'end');
        }else return {value:before.value,position:start,changed:false};
      }
    }
    const isInsert=kind.startsWith('insert');
    const insertion=isInsert?(kind==='insertLineBreak'||kind==='insertParagraph'?'\n':data||''):'';
    const nextRaw=this.rawValue.slice(0,left)+insertion+this.rawValue.slice(right);
    const next=transliterate(nextRaw,this.enabledValue);
    if(next.value.length>maxLength)return {value:before.value,position:start,changed:false};
    if(nextRaw===this.rawValue)return {value:before.value,position:start,changed:false};
    this.remember(start);
    this.rawValue=nextRaw;this.future=[];
    this.cursor=toDisplay(left+insertion.length,next.segments,next.value.length);
    return {value:next.value,position:this.cursor,changed:true};
  }
  private remember(position:number=this.cursor){
    this.past.push({raw:this.rawValue,position});
    if(this.past.length>300)this.past.shift();
  }
  undo():Edit {
    const previous=this.past.pop();
    if(!previous)return {value:this.value,position:this.cursor,changed:false};
    this.future.push({raw:this.rawValue,position:this.cursor});
    this.rawValue=previous.raw;this.cursor=Math.min(previous.position,this.value.length);
    return {value:this.value,position:this.cursor,changed:true};
  }
  redo():Edit {
    const next=this.future.pop();
    if(!next)return {value:this.value,position:this.cursor,changed:false};
    this.remember();this.rawValue=next.raw;this.cursor=Math.min(next.position,this.value.length);
    return {value:this.value,position:this.cursor,changed:true};
  }
}
