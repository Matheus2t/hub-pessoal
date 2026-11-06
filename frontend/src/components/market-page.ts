import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../ui';
import { findStock, normalizeSearch, searchStocks, sectors } from '../market-catalog';
import './tradingview-widget';
import './market-embed';
import './company-sections';
import './financial-comparison';
import './financial-analysis';
import './market-tools';
import './distributions-host';
import './panel-workspace';
import type {PanelDefinition} from '../panel-preferences';
import {manifest,formatFinancial} from '../financial-data';

@customElement('market-page')
export class MarketPage extends LightElement {
  @property() symbol = '';
  @state() private query = '';
  @state() private error = '';
  @state() private sector = '';
  @state() private order: 'symbol' | 'name' = 'symbol';
  @state() private active = -1;
  @state() private expanded = false;
  @state() private advanced = false;
  @state() private panorama = false;
  @state() private directoryOpen = false;
  @state() private directoryStatus: 'idle'|'loading'|'ready'|'error' = 'idle';
  @state() private directoryMetrics: Record<string,{year:string;profit:number|null;roe:number|null;scope:string}> = {};
  @state() private distributions = false;
  @state() private coverage:'pending'|'known'|'failed'='pending';
  @state() private hasFinancial=false;
  @state() private hasDistributions=false;
  private coverageController?:AbortController;
  private scrollIdle?:number;
  // Keep an ongoing page gesture from being captured when it crosses an iframe.
  // This is deliberately non-reactive: scrolling never re-renders the catalog.
  private pageScroll=()=>{
    if(this.symbol)return;
    if(!this.classList.contains('is-page-scrolling'))this.classList.add('is-page-scrolling');
    clearTimeout(this.scrollIdle);
    this.scrollIdle=window.setTimeout(()=>this.classList.remove('is-page-scrolling'),180);
  };
  connectedCallback(){super.connectedCallback();this.classList.add('workspace-v2','market-terminal');window.addEventListener('scroll',this.pageScroll,{passive:true})}
  disconnectedCallback(){window.removeEventListener('scroll',this.pageScroll);clearTimeout(this.scrollIdle);this.classList.remove('is-page-scrolling');this.coverageController?.abort();super.disconnectedCallback()}
  protected updated(changes:Map<PropertyKey,unknown>){if(changes.has('symbol')&&findStock(this.symbol))void this.inspectCoverage()}
  private async inspectCoverage(){
    this.coverageController?.abort();const c=this.coverageController=new AbortController();this.coverage='pending';
    try{
      const [m,...d]=await Promise.all([manifest(c.signal),...['distributions','distributions-unit'].map(async dir=>{const r=await fetch(`/financials/${dir}/manifest.json`,{signal:c.signal});if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data.companies))throw Error();return data})]);
      if(c.signal.aborted)return;this.hasFinancial=!!m.companies[this.symbol];this.hasDistributions=d.some(x=>x.companies.includes(this.symbol));this.coverage='known';
    }catch{if(!c.signal.aborted)this.coverage='failed'}
  }
  private async toggleDirectory() {
    this.directoryOpen = !this.directoryOpen;
    if (!this.directoryOpen || this.directoryStatus !== 'idle') return;
    this.directoryStatus = 'loading';
    try {
      const response = await fetch('/financials/directory-summary.json');
      if (!response.ok) throw Error('Directory data unavailable');
      const data = await response.json() as {companies: Record<string,{year:string;profit:number|null;roe:number|null;scope:string}>};
      if (!data || typeof data.companies !== 'object' || data.companies === null) throw Error('Invalid directory data');
      if (this.isConnected) { this.directoryMetrics = data.companies; this.directoryStatus = 'ready'; }
    } catch { if (this.isConnected) this.directoryStatus = 'error'; }
  }
  private get filteredStocks() { return searchStocks(this.query, this.sector, this.order); }
  private keydown(event: KeyboardEvent) {
    const suggestions = this.filteredStocks.slice(0, 8);
    if (event.key === 'Escape') { event.preventDefault(); this.expanded = false; this.active = -1; }
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && this.query && suggestions.length) {
      event.preventDefault(); this.expanded = true;
      this.active = this.active < 0 ? (event.key === 'ArrowDown' ? 0 : suggestions.length - 1)
        : (this.active + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
    }
    if (event.key === 'Enter' && this.expanded && this.active >= 0 && suggestions[this.active]) {
      event.preventDefault(); location.hash = `#/acoes/${suggestions[this.active].symbol}`;
    }
  }
  private search(event: Event) {
    event.preventDefault();
    const text = normalizeSearch(this.query);
    const results = this.filteredStocks;
    const exact = results.find(stock => stock.symbol === text || normalizeSearch(stock.name) === text);
    const selected = exact || (text && results.length === 1 ? results[0] : undefined);
    if (!selected) { this.error = !results.length ? 'Ação não encontrada no catálogo com estes filtros.' : 'Selecione uma empresa nos resultados.'; return; }
    location.hash = `#/acoes/${selected.symbol}`;
  }
  // Shared local navigation: the active tool remains discoverable on its own route.
  private renderAnalysisLinks(active = '') {
    const links = [
      {id:'COMPARAR',href:'#/acoes/comparar',label:'Comparar empresas',detail:'Dados CVM'},
      {id:'RANKINGS',href:'#/acoes/rankings',label:'Rankings por setor',detail:''},
      {id:'APORTES',href:'#/acoes/aportes',label:'Simulador de aportes',detail:''},
      {id:'PROVENTOS',href:'#/acoes/proventos',label:'Proventos',detail:'Arquivo CVM'},
      {id:'DY',href:'#/acoes/dy',label:'DY manual',detail:''},
    ];
    return html`<nav class="ws-analysis-links" aria-label="Ferramentas de análise">
      ${links.map(link=>html`<a href=${link.href} aria-current=${active===link.id?'page':nothing} title=${link.detail?`${link.label} · ${link.detail}`:link.label}>${link.label}</a>`)}
    </nav>`;
  }
  render() {
    if (this.symbol === 'SIMULADOR-DIVIDENDOS') return html`<distributions-host mode="simulator"></distributions-host>`;
    if (this.symbol === 'PROVENTOS') return html`${this.renderAnalysisLinks('PROVENTOS')}<distributions-host mode="history"></distributions-host>`;
    if (this.symbol === 'DY') return html`${this.renderAnalysisLinks('DY')}<distributions-host mode="dy"></distributions-host>`;
    if (this.symbol === 'RANKINGS') return html`${this.renderAnalysisLinks('RANKINGS')}<market-rankings></market-rankings>`;
    if (this.symbol === 'APORTES') return html`${this.renderAnalysisLinks('APORTES')}<market-contributions></market-contributions>`;
    if (this.symbol === 'COMPARAR') return html`${this.renderAnalysisLinks('COMPARAR')}<financial-comparison></financial-comparison>`;
    const stock = findStock(this.symbol);
    if (this.symbol && !stock) return html`<div class="page-heading"><h1>Ação não encontrada</h1></div><p class="market-note" role="alert">Este código não está disponível no catálogo da 2T.</p><a class="market-back" href="#/acoes">← Voltar à lista de ações</a>`;
    const matches = this.filteredStocks;
    const suggestions = matches.slice(0, 8);
    const panels:PanelDefinition[]=stock?[
      {id:'chart',title:'Gráfico principal',role:'chart',required:true,essential:true,size:'medium'},
      {id:'financial',title:'Indicadores e estatísticas CVM',size:'small',available:this.coverage==='known'?this.hasFinancial:this.coverage==='failed',hint:this.coverage==='pending'?'Verificando cobertura':'Sem cobertura CVM nesta versão'},
      {id:'company',title:'Informações da empresa',size:'small'},
      {id:'distributions',title:'Dividendos e JCP',size:'large',available:this.coverage==='known'?this.hasDistributions:this.coverage==='failed',hint:this.coverage==='pending'?'Verificando cobertura':'Sem registros verificados nesta versão'},
    ]:[
      {id:'chart',title:'Gráfico do Ibovespa',required:true,essential:true,size:'medium'},
      {id:'quotes',title:'Ações acompanhadas',size:'small'},
      {id:'panorama',title:'Panorama do mercado',size:'large'},
      {id:'directory',title:'Catálogo de ações',size:'large'},
    ];
    return html`<header class="ws-page-heading"><div><p class="ws-context">${stock?'Ações / '+stock.sector:'Mercado brasileiro'}</p><h1>${stock?stock.symbol:'Mercado de Ações'}</h1>${stock?html`<h2 class="ws-company-name">${stock.name}</h2><p>Classificação setorial editorial</p><a class="market-back" href="#/acoes">← Voltar à lista de ações</a>`:nothing}</div></header>
      ${this.renderAnalysisLinks()}
      <panel-workspace fixed-layout area=${stock?'actions-company':'actions-overview'} .panels=${panels}>
       <section slot="chart" class="workspace-panel ws-main-chart"><header class="ws-panel-heading"><h2>${stock?'Gráfico · '+stock.symbol:'Ibovespa'}</h2>${stock?html`<div class="market-chart-modes" role="group" aria-label="Tipo de gráfico"><button class="button secondary" aria-pressed=${!this.advanced} @click=${()=>{this.advanced=false}}>Simples</button><button class="button secondary" aria-pressed=${this.advanced} @click=${()=>{this.advanced=true}}>Avançado</button></div>`:nothing}</header>
        ${!stock||this.advanced?html`<market-embed kind="advanced-chart" .symbol=${stock?.symbol||'IBOV'}></market-embed>`:html`<tradingview-widget kind="overview" .symbol=${stock.symbol}></tradingview-widget>`}
       </section>
       ${stock?html`<section slot="financial" class="workspace-panel"><financial-analysis .symbol=${stock.symbol}></financial-analysis></section>
        <section slot="company" class="workspace-panel"><company-sections .symbol=${stock.symbol}></company-sections></section>
        <section slot="distributions" class="workspace-panel market-distributions"><button class="button secondary" aria-expanded=${this.distributions} @click=${()=>this.distributions=!this.distributions}>${this.distributions?'Fechar proventos':'Dividendos e JCP'}</button>${this.distributions?html`<distributions-host .symbol=${stock.symbol}></distributions-host>`:nothing}</section>`:html`
        <section slot="quotes" class="workspace-panel"><h2>Ações acompanhadas</h2><iframe class="market-quotes-frame" title="TradingView — cotações acompanhadas" src="/ticker-isolated.html" loading="eager"></iframe></section>
        <section slot="panorama" class="workspace-panel"><details class="market-panorama" @toggle=${(e:Event)=>{this.panorama=(e.target as HTMLDetailsElement).open}}><summary>Panorama do Mercado · Ibovespa</summary>${this.panorama?html`<market-embed kind="market-overview"></market-embed><p class="market-note">Índice e ativos brasileiros selecionados. Não representa um ranking da B3.</p>`:nothing}</details></section>
        <section slot="directory" class="workspace-panel market-directory-panel">
         <div class="market-directory">
           <button type="button" class="market-directory-toggle" aria-expanded=${this.directoryOpen} aria-controls="market-directory-content" @click=${this.toggleDirectory}>
             <span class="market-directory-heading"><strong>Empresas</strong><small>${matches.length} ${matches.length===1?'ação':'ações'} no catálogo</small></span>
             <span class="market-directory-action">${this.directoryOpen?'Recolher lista':'Explorar empresas'}</span>
           </button>
           ${this.directoryOpen?html`<div id="market-directory-content" class="market-directory-content">
             <form class="market-search" @submit=${this.search}>
       <label for="stock-search">Buscar ação</label><div><input id="stock-search" type="search" role="combobox" aria-autocomplete="list" aria-controls="stock-suggestions" aria-expanded=${Boolean(this.query&&this.expanded&&suggestions.length)} aria-activedescendant=${this.expanded&&this.active>=0?`stock-option-${this.active}`:nothing} @keydown=${this.keydown} @focus=${()=>{this.expanded=true}} placeholder="Buscar por código ou empresa" .value=${this.query} @input=${(event:Event)=>{this.query=(event.target as HTMLInputElement).value.toLocaleUpperCase('pt-BR');this.error='';this.active=-1;this.expanded=true}} autocomplete="off" aria-describedby=${this.error?'market-search-error':nothing}>
        <button class="button secondary" type="button" @click=${()=>{this.query='';this.error='';this.active=-1;this.expanded=false;this.querySelector<HTMLInputElement>('#stock-search')?.focus()}}>Limpar</button><button class="button primary">Buscar</button></div></form>
       <div class="market-filters"><div><label for="stock-sector">Setor</label><select id="stock-sector" .value=${this.sector} @change=${(e:Event)=>{this.sector=(e.target as HTMLSelectElement).value;this.active=-1;this.error=''}}><option value="">Todos os setores</option>${sectors.map(sector=>html`<option>${sector}</option>`)}</select></div><div><label for="stock-order">Ordenar por</label><select id="stock-order" .value=${this.order} @change=${(e:Event)=>{this.order=(e.target as HTMLSelectElement).value as 'symbol'|'name';this.active=-1}}><option value="symbol">Ticker</option><option value="name">Empresa (A–Z)</option></select></div></div>
       ${this.error?html`<p id="market-search-error" class="market-note" role="alert">${this.error}</p>`:nothing}
       <ul id="stock-suggestions" class="stock-suggestions" role="listbox" aria-label="Sugestões de ações" ?hidden=${!this.query||!this.expanded||!suggestions.length}>${suggestions.map((item,index)=>html`<li role="presentation"><a id=${`stock-option-${index}`} role="option" aria-selected=${this.active===index} href=${`#/acoes/${item.symbol}`}>${item.symbol} · ${item.name}</a></li>`)}</ul>
             <p class="market-result-count" role="status">${matches.length} ${matches.length===1?'resultado encontrado':'resultados encontrados'}</p>
             ${this.directoryStatus==='loading'?html`<p class="market-note" role="status">Carregando dados contábeis da CVM…</p>`:nothing}
             ${this.directoryStatus==='error'?html`<p class="market-note" role="status">Indicadores CVM indisponíveis temporariamente; a pesquisa continua funcionando.</p>`:nothing}
             ${!matches.length?html`<p class="market-note">Nenhuma ação encontrada. Ajuste a busca ou o setor.</p>`:nothing}
             <div class="stock-directory">
               <div class="stock-directory-heading" aria-hidden="true"><span>Ticker</span><span>Empresa</span><span>Setor</span><span>Lucro anual</span><span>ROE anual</span></div>
               ${matches.map(item=>{const metric=this.directoryMetrics[item.symbol];return html`<a class="stock-item" href=${`#/acoes/${item.symbol}`}>
                 <strong>${item.symbol}</strong><span class="stock-name">${item.name}</span><span class="stock-sector">${item.sector}</span>
                 <span class="stock-metric is-profit">${metric?.profit==null?'—':formatFinancial(metric.profit)}<small>${metric?.year||'Sem dados CVM'}</small></span>
                 <span class="stock-metric is-roe">${metric?.roe==null?'—':metric.roe.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%'}<small>${metric?.year||'—'}</small></span>
               </a>`})}
             </div>
             <p class="market-directory-source">Fonte: CVM/DFP. Lucro líquido e ROE do último exercício anual disponível, por empresa e não por classe de ação. Alguns emissores utilizam demonstrações individuais; os detalhes metodológicos estão nas páginas das empresas. Valores contábeis não são cotações.</p>
           </div>`:nothing}
         </div>
        </section>`}
      </panel-workspace>`;
  }
}
