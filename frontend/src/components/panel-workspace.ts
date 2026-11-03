import {LitElement,html,nothing} from 'lit';
import {customElement,property,state} from 'lit/decorators.js';
import {repeat} from 'lit/directives/repeat.js';
import {styleMap} from 'lit/directives/style-map.js';
import {defaultPanels,readPanelPreferences,normalizePanels,savePanelPreferences,resolvePanels,editPanel,movePanel,type PanelDefinition,type PanelPreferences,type PanelMode,type PanelSize} from '../panel-preferences';

/** Native slots reorder the composed tree, preserving slotted inputs, widgets and async work. */
@customElement('panel-workspace')
export class PanelWorkspace extends LitElement {
 @property() area='default';@property({attribute:false}) panels:PanelDefinition[]=[];
 @state() private prefs:PanelPreferences=defaultPanels([]);@state() private notice='';
 private loadedArea='';
 private close=()=>{const d=this.renderRoot.querySelector<HTMLDialogElement>('dialog');if(d?.open)d.close()};
 connectedCallback(){super.connectedCallback();window.addEventListener('hashchange',this.close)}
 disconnectedCallback(){this.close();window.removeEventListener('hashchange',this.close);super.disconnectedCallback()}
 protected willUpdate(){if(this.loadedArea!==this.area){const r=readPanelPreferences(this.area,this.panels);this.prefs=r.value;this.notice=r.notice;this.loadedArea=this.area}else this.prefs=normalizePanels(this.prefs,this.panels)}
 private updatePrefs(p:PanelPreferences){this.prefs=p;this.notice=savePanelPreferences(this.area,p)?'Preferências salvas neste navegador.':'Não foi possível salvar. O layout atual continua disponível nesta sessão.';this.dispatchEvent(new CustomEvent('layout-change',{detail:{area:this.area,mode:p.mode},bubbles:true,composed:true}))}
 private mode(mode:PanelMode){this.updatePrefs({...this.prefs,mode})}
 private async move(id:string,direction:number){this.updatePrefs(movePanel(this.prefs,this.panels,id,direction));await this.updateComplete;this.renderRoot.querySelector<HTMLButtonElement>(`[data-move="${id}:${direction}"]`)?.focus()}
 private open(){this.renderRoot.querySelector<HTMLDialogElement>('dialog')?.showModal()}
 render(){const rows=resolvePanels(this.panels,this.prefs),movable=rows.filter(d=>!d.required),single=rows.filter(d=>d.visible).length===1;
  return html`<link rel="stylesheet" href="/styles.css"><div class="workspace-v2">
   <div class="ws-toolbar"><div class="ws-modes" role="group" aria-label="Modo de visualização">${([['essential','Essencial'],['complete','Completo'],['custom','Personalizado']] as const).map(([id,label])=>html`<button type="button" aria-pressed=${this.prefs.mode===id} @click=${()=>this.mode(id)}>${label}</button>`)}</div><button type="button" class="ws-customize" @click=${this.open}>Personalizar painel</button></div>
   ${this.notice?html`<p class="ws-notice" role="status">${this.notice}</p>`:nothing}
   <div class="ws-grid">${repeat(rows,d=>d.id,d=>html`<div class="ws-cell ${d.role||''}" data-panel=${d.id} ?hidden=${!d.visible} style=${styleMap({gridColumn:single?'1 / -1':`span ${{small:4,medium:8,large:12}[d.size]}`,gridRow:(d.role==='form'||d.role==='chart')&&d.size!=='large'&&!single?'span 2':undefined})}><slot name=${d.id}></slot></div>`)}</div>
   <dialog class="ws-config" aria-label="Personalizar painel" @click=${(e:MouseEvent)=>{if(e.target===e.currentTarget)this.close()}}>
    <header><h2>Personalizar painel</h2><button type="button" aria-label="Fechar personalização" @click=${this.close}>Fechar</button></header><p>As alterações são salvas por área neste navegador.</p>
    <ul class="ws-options">${repeat(rows,d=>d.id,d=>html`<li data-module=${d.id}><label><input type="checkbox" .checked=${d.intentVisible} ?disabled=${d.required||d.available===false} @change=${(e:Event)=>this.updatePrefs(editPanel(this.prefs,this.panels,d.id,{visible:(e.target as HTMLInputElement).checked}))}>${d.title}</label>${d.required?html`<small>Fixo</small>`:d.available===false?html`<small>${d.hint||'Disponível após simular'}</small>`:nothing}
      <div class="ws-module-actions"><button type="button" aria-label=${`Mover ${d.title} para cima`} data-move=${`${d.id}:-1`} ?disabled=${d.required||movable[0]?.id===d.id} @click=${()=>this.move(d.id,-1)}>↑</button><button type="button" aria-label=${`Mover ${d.title} para baixo`} data-move=${`${d.id}:1`} ?disabled=${d.required||movable.at(-1)?.id===d.id} @click=${()=>this.move(d.id,1)}>↓</button>
      ${d.resizable!==false?html`<select aria-label=${`Tamanho de ${d.title}`} .value=${d.size} @change=${(e:Event)=>this.updatePrefs(editPanel(this.prefs,this.panels,d.id,{size:(e.target as HTMLSelectElement).value as PanelSize}))}><option value="small">Compacto</option><option value="medium">Amplo</option><option value="large">Largura total</option></select>`:nothing}</div></li>`)}</ul>
    <footer><button type="button" @click=${()=>this.updatePrefs(defaultPanels(this.panels))}>Restaurar layout padrão</button><button type="button" @click=${this.close}>Concluir</button></footer>
   </dialog>
  </div>`;
 }
}
