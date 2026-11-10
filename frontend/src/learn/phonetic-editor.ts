import {html,type PropertyValues} from 'lit';
import {customElement,property,query,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {PhoneticBuffer,type Edit} from './phonetic';

const storageKey='2t-learn-phonetic-ru';
const preference=()=>{try{return localStorage.getItem(storageKey)!=='off'}catch{return true}};
const special=['ё','й','ы','э','ь','ъ','щ','ж','ю','я'] as const;

/** Light-DOM editor. Its textarea is accessible through the existing label. */
@customElement('learn-phonetic-editor')
export class LearnPhoneticEditor extends LightElement {
  @property({attribute:false}) value='';
  @property({type:Boolean}) disabled=false;
  @property({type:Number}) maxlength=2000;
  @state() private phonetic=preference();
  @query('textarea') private field?:HTMLTextAreaElement;
  private readonly fieldId='learn-phonetic-'+crypto.randomUUID();
  private model=new PhoneticBuffer('',this.phonetic);
  private composing=false;
  private selectedStart=0;
  private selectedEnd=0;

  protected updated(changes:PropertyValues){
    if(changes.has('value')&&this.value!==this.model.value){
      this.model=new PhoneticBuffer(this.value,this.phonetic);
      if(this.field&&this.field.value!==this.model.value)this.field.value=this.model.value;
    }
  }
  private rememberSelection(){
    if(!this.field)return;
    this.selectedStart=this.field.selectionStart;
    this.selectedEnd=this.field.selectionEnd;
  }
  private notify(){
    this.dispatchEvent(new CustomEvent<string>('answer-changed',{
      bubbles:true,composed:true,detail:this.model.value
    }));
  }
  private show(result:Edit,forceNotify=false){
    const field=this.field;
    if(!field)return;
    field.value=result.value;
    const pos=Math.max(0,Math.min(result.value.length,result.position));
    field.setSelectionRange(pos,pos);
    this.selectedStart=pos;this.selectedEnd=pos;
    if(result.changed||forceNotify)this.notify();
  }
  private apply(kind:string,data:string|null){
    if(!this.field||this.disabled)return;
    this.show(this.model.edit(kind,data,this.field.selectionStart,this.field.selectionEnd,this.maxlength));
  }
  private beforeInput(event:InputEvent){
    if(!this.phonetic||this.composing||event.isComposing||this.disabled||!event.cancelable)return;
    const kind=event.inputType;
    if(kind==='historyUndo'||kind==='historyRedo'){
      event.preventDefault();
      this.show(kind==='historyUndo'?this.model.undo():this.model.redo());
      return;
    }
    if(kind.startsWith('insert')){
      if(kind==='insertFromPaste'||kind==='insertFromDrop')return;
      if(kind!=='insertText'&&kind!=='insertReplacementText'&&kind!=='insertLineBreak'&&kind!=='insertParagraph')return;
      if(!event.data&&kind!=='insertLineBreak'&&kind!=='insertParagraph')return;
    }else if(!kind.startsWith('delete'))return;
    event.preventDefault();this.apply(kind,event.data);
  }
  private onInput(event:InputEvent){
    if(this.composing||event.isComposing||!this.field)return;
    if(this.field.value!==this.model.value){
      const change=this.model.external(this.field.value,this.field.selectionStart);
      this.show(change,true);
    }
  }
  private onKeydown(event:KeyboardEvent){
    if(!this.phonetic||this.disabled||this.composing||!(event.ctrlKey||event.metaKey)||event.altKey)return;
    const k=event.key.toLowerCase();
    if(k==='z'||k==='y'){
      event.preventDefault();
      this.show(k==='y'||event.shiftKey?this.model.redo():this.model.undo());
    }
  }
  private onPaste(event:ClipboardEvent){
    if(!this.phonetic||this.disabled||this.composing||!event.clipboardData)return;
    event.preventDefault();
    this.apply('insertFromPaste',event.clipboardData.getData('text/plain'));
  }
  private onCut(event:ClipboardEvent){
    if(!this.phonetic||this.disabled||this.composing||!this.field||!event.clipboardData)return;
    const start=this.field.selectionStart,end=this.field.selectionEnd;
    if(start===end)return;
    event.preventDefault();
    event.clipboardData.setData('text/plain',this.field.value.slice(start,end));
    this.apply('deleteByCut',null);
  }
  private onDrop(event:DragEvent){
    if(!this.phonetic||this.disabled||this.composing||!event.dataTransfer)return;
    const data=event.dataTransfer.getData('text/plain');
    if(!data)return;
    event.preventDefault();
    this.apply('insertFromDrop',data);
  }
  private setPhonetic(){
    if(this.disabled||!this.field)return;
    const next=!this.phonetic;
    const before=this.model.value;
    const result=this.model.setEnabled(next,this.field.selectionStart);
    this.phonetic=next;
    try{localStorage.setItem(storageKey,next?'on':'off')}catch{/* Optional preference. */}
    this.show(result,before!==result.value);
    this.field.focus();
  }
  private insertSymbol(symbol:string){
    if(!this.field||this.disabled)return;
    this.field.focus();
    this.field.setSelectionRange(this.selectedStart,this.selectedEnd);
    this.apply('insertText',symbol);
  }
  render(){
    return html`<div class="learn-phonetic-editor">
      <div class="learn-phonetic-editor__header">
        <label for=${this.fieldId}>Sua resposta</label>
        <button type="button" class="learn-phonetic-editor__toggle"
          aria-pressed=${this.phonetic} ?disabled=${this.disabled}
          @click=${()=>this.setPhonetic()}>
          <span class="learn-phonetic-editor__indicator" aria-hidden="true"></span>
          Fonético ${this.phonetic?'ligado':'desligado'}
        </button>
      </div>
      <textarea id=${this.fieldId} lang="ru" maxlength=${this.maxlength}
        .value=${this.model.value} ?disabled=${this.disabled} spellcheck="false"
        @beforeinput=${(e:InputEvent)=>this.beforeInput(e)}
        @input=${(e:InputEvent)=>this.onInput(e)}
        @keydown=${(e:KeyboardEvent)=>this.onKeydown(e)}
        @paste=${(e:ClipboardEvent)=>this.onPaste(e)}
        @cut=${(e:ClipboardEvent)=>this.onCut(e)}
        @drop=${(e:DragEvent)=>this.onDrop(e)}
        @compositionstart=${()=>this.composing=true}
        @compositionend=${()=>{this.composing=false;queueMicrotask(()=>this.onInput(new InputEvent('input')))}}
        @select=${()=>this.rememberSelection()}
        @click=${()=>this.rememberSelection()}
        @keyup=${()=>this.rememberSelection()}
      ></textarea>
      ${this.phonetic?html`<div class="learn-phonetic-editor__footer">
        <p>Teclado americano → cirílico · <span lang="ru">privet → привет</span> · sh → ш · shch → щ</p>
        <div class="learn-phonetic-editor__symbols" role="group" aria-label="Inserir letras russas">
          ${special.map(c=>html`<button type="button" lang="ru"
            aria-label=${'Inserir '+c} ?disabled=${this.disabled}
            @pointerdown=${(e:PointerEvent)=>e.preventDefault()}
            @click=${()=>this.insertSymbol(c)}>${c}</button>`)}
        </div>
      </div>`:html`<p class="learn-phonetic-editor__hint">Digite com seu teclado atual. Ative o modo fonético para converter letras latinas automaticamente.</p>`}
    </div>`;
  }
}
