import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { LightElement } from '../ui';
import { findStock, featuredStocks, normalizeSearch, searchStocks, sectors } from '../market-catalog';
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

type DirectoryFundamental = {profit:number|null;roe:number|null;scope:'con'|'ind';document:number};
type DirectorySnapshot = {period:string;companies:Record<string,DirectoryFundamental>};

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
  @state() private directoryLoading = false;
  @state() private directoryLoadError = false;
  @state() private directoryData:DirectorySnapshot|null = null;
  private directoryController?:AbortController;
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
  disconnectedCallback(){window.removeEventListener('scroll',this.pageScroll);clearTimeout(this.scrollIdle);this.classList.remove('is-page-scrolling');this.coverageController?.abort();this.directoryController?.abort();super.disconnectedCallback()}
  protected updated(changes:Map<PropertyKey,unknown>){if(changes.has('symbol')&&findStock(this.symbol))void this.inspectCoverage()}
  private async inspectCoverage(){
    this.coverageController?.abort();const c=this.coverageController=new AbortController();this.coverage='pending';
    try{
      const [m,...d]=await Promise.all([manifest(c.signal),...['distributions','distributions-unit'].map(async dir=>{const r=await fetch(`/financials/${dir}/manifest.json`,{signal:c.signal});if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data.companies))throw Error();return data})]);
      if(c.signal.aborted)return;this.hasFinancial=!!m.companies[this.symbol];this.hasDistributions=d.some(x=>x.companies.includes(this.symbol));this.coverage='known';
    }catch{if(!c.signal.aborted)this.coverage='failed'}
  }
  private directoryToggle(event:Event){
    this.directoryOpen=(event.currentTarget as HTMLDetailsElement).open;
    if(this.directoryOpen&&!this.directoryData&&!this.directoryLoading)void this.loadDirectory();
  }
  private async loadDirectory(){
    this.directoryController?.abort();
    const controller=this.directoryController=new AbortController();
    this.directoryLoading=true;this.directoryLoadError=false;
    try{
      const response=await fetch('/financials/directory-2025.json',{signal:controller.signal});
      if(!response.ok)throw Error('Não foi possível carregar os dados CVM.');
      const snapshot=await response.json() as DirectorySnapshot;
      if(snapshot.period!=='2025-12-31'||!snapshot.companies||typeof snapshot.companies!=='object')throw Error('Resumo CVM inválido.');
      if(!controller.signal.aborted)this.directoryData=snapshot;
    }catch(e){if(!controller.signal.aborted)this.directoryLoadError=true;}
    finally{if(!controller.signal.aborted)this.directoryLoading=false;}
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
      {id:'chart',title:'Gráfico do Ibovespa',role:'chart',required:true,essential:true,size:'medium'},
      {id:'quotes',title:'Ações acompanhadas',size:'small'},
      {id:'panorama',title:'Panorama do mercado',size:'small'},
      {id:'directory',title:'Catálogo de ações',size:'large'},
    ];
    return html`<header class="ws-page-heading"><div><p class="ws-context">${stock?'Ações / '+stock.sector:'Mercado brasileiro'}</p><h1>${stock?stock.symbol:'Mercado de Ações'}</h1>${stock?html`<h2 class="ws-company-name">${stock.name}</h2><p>Classificação setorial editorial</p><a class="market-back" href="#/acoes">← Voltar à lista de ações</a>`:nothing}</div></header>
      ${this.renderAnalysisLinks()}
      <panel-workspace fixed-layout ?panorama-expanded=${!stock&&this.panorama} area=${stock?'actions-company':'actions-overview'} .panels=${panels}>
       <section slot="chart" class="workspace-panel ws-main-chart"><header class="ws-panel-heading"><h2>${stock?'Gráfico · '+stock.symbol:'Ibovespa'}</h2>${stock?html`<div class="market-chart-modes" role="group" aria-label="Tipo de gráfico"><button class="button secondary" aria-pressed=${!this.advanced} @click=${()=>{this.advanced=false}}>Simples</button><button class="button secondary" aria-pressed=${this.advanced} @click=${()=>{this.advanced=true}}>Avançado</button></div>`:nothing}</header>
        ${!stock||this.advanced?html`<market-embed kind="advanced-chart" .symbol=${stock?.symbol||'IBOV'}></market-embed>`:html`<tradingview-widget kind="overview" .symbol=${stock.symbol}></tradingview-widget>`}
       </section>
       ${stock?html`<section slot="financial" class="workspace-panel"><financial-analysis .symbol=${stock.symbol}></financial-analysis></section>
        <section slot="company" class="workspace-panel"><company-sections .symbol=${stock.symbol}></company-sections></section>
        <section slot="distributions" class="workspace-panel market-distributions"><button class="button secondary" aria-expanded=${this.distributions} @click=${()=>this.distributions=!this.distributions}>${this.distributions?'Fechar proventos':'Dividendos e JCP'}</button>${this.distributions?html`<distributions-host .symbol=${stock.symbol}></distributions-host>`:nothing}</section>`:html`
        <section slot="quotes" class="workspace-panel"><h2>Ações acompanhadas</h2><iframe class="market-quotes-frame" title="TradingView — cotações acompanhadas" src="/ticker-isolated.html" loading="eager"></iframe></section>
        <section slot="panorama" class="workspace-panel"><details class="market-panorama" ?open=${this.panorama} @toggle=${(e:Event)=>{this.panorama=(e.target as HTMLDetailsElement).open}}><summary>Panorama do Mercado · Ibovespa</summary>${this.panorama?html`<div class="market-panorama-expanded"><div class="market-panorama-chart"><market-embed kind="market-overview"></market-embed></div><aside class="market-panorama-context"><p class="market-panorama-eyebrow">VISÃO DO MERCADO</p><h3>Índice e empresas brasileiras</h3><p>Explore o desempenho no widget do TradingView. A seleção de índices, setores e períodos é feita diretamente no gráfico.</p><h4>Empresas acompanhadas</h4><nav aria-label="Empresas em destaque">${featuredStocks.map(item=>html`<a href=${`#/acoes/${item.symbol}`}> <strong>${item.symbol}</strong><span>${item.name}</span><span aria-hidden="true">↗</span></a>`)}</nav><p class="market-panorama-note">Cotações e variações são apresentadas pela fonte externa. Não calculamos preços nem rankings próprios nesta área.</p></aside></div>`:nothing}</details></section>
        <section slot="directory" class="workspace-panel market-directory-panel">
         <details class="market-directory-details" ?open=${this.directoryOpen} @toggle=${this.directoryToggle}>
           <summary class="market-directory-summary"><span class="market-directory-name">Empresas</span><span class="market-directory-count">${matches.length} ${matches.length===1?'empresa':'empresas'}</span><span class="market-directory-chevron" aria-hidden="true"></span></summary>
           <div class="market-directory-content">
             <form class="market-search" @submit=${this.search}>
       <label for="stock-search">Buscar ação</label><div><input id="stock-search" type="search" role="combobox" aria-autocomplete="list" aria-controls="stock-suggestions" aria-expanded=${Boolean(this.query&&this.expanded&&suggestions.length)} aria-activedescendant=${this.expanded&&this.active>=0?`stock-option-${this.active}`:nothing} @keydown=${this.keydown} @focus=${()=>{this.expanded=true}} placeholder="Buscar por código ou empresa" .value=${this.query} @input=${(event:Event)=>{this.query=(event.target as HTMLInputElement).value.toLocaleUpperCase('pt-BR');this.error='';this.active=-1;this.expanded=true}} autocomplete="off" aria-describedby=${this.error?'market-search-error':nothing}>
        <button class="button secondary" type="button" @click=${()=>{this.query='';this.error='';this.active=-1;this.expanded=false;this.querySelector<HTMLInputElement>('#stock-search')?.focus()}}>Limpar</button><button class="button primary">Buscar</button></div></form>
       <div class="market-filters"><div><label for="stock-sector">Setor</label><select id="stock-sector" .value=${this.sector} @change=${(e:Event)=>{this.sector=(e.target as HTMLSelectElement).value;this.active=-1;this.error=''}}><option value="">Todos os setores</option>${sectors.map(sector=>html`<option>${sector}</option>`)}</select></div><div><label for="stock-order">Ordenar por</label><select id="stock-order" .value=${this.order} @change=${(e:Event)=>{this.order=(e.target as HTMLSelectElement).value as 'symbol'|'name';this.active=-1}}><option value="symbol">Ticker</option><option value="name">Empresa (A–Z)</option></select></div></div>
       ${this.error?html`<p id="market-search-error" class="market-note" role="alert">${this.error}</p>`:nothing}
       <ul id="stock-suggestions" class="stock-suggestions" role="listbox" aria-label="Sugestões de ações" ?hidden=${!this.query||!this.expanded||!suggestions.length}>${suggestions.map((item,index)=>html`<li role="presentation"><a id=${`stock-option-${index}`} role="option" aria-selected=${this.active===index} href=${`#/acoes/${item.symbol}`}>${item.symbol} · ${item.name}</a></li>`)}</ul>
             <p class="market-result-count" role="status">${matches.length} ${matches.length===1?'resultado encontrado':'resultados encontrados'}</p>
             ${this.directoryLoading?html`<p class="market-note" role="status">Carregando indicadores anuais CVM…</p>`:nothing}
             ${this.directoryLoadError?html`<p class="market-note" role="status">Indicadores contábeis indisponíveis. A navegação das empresas continua funcionando. <button type="button" class="market-data-retry" @click=${()=>void this.loadDirectory()}>Tentar novamente</button></p>`:nothing}
             ${!matches.length?html`<p class="market-note">Nenhuma ação encontrada. Ajuste a busca ou o setor.</p>`:nothing}
             <div class="stock-directory">
               <div class="stock-directory-heading" aria-hidden="true"><span>Ticker</span><span>Empresa</span><span>Setor</span><span>Lucro 2025</span><span>ROE 2025</span><span>Escopo</span></div>
               ${matches.map(item=>{const financial=this.directoryData?.companies[item.symbol];return html`<a class="stock-item" href=${`#/acoes/${item.symbol}`} aria-label=${`${item.symbol} · ${item.name} · abrir análise`}>
                  <strong class="stock-symbol">${item.symbol}</strong>
                  <span class="stock-name">${item.name}</span>
                  <span class="stock-sector">${item.sector}</span>
                  <span class="stock-profit" title="Lucro líquido anual do emissor, CVM 2025">${financial?formatFinancial(financial.profit):'—'}</span>
                  <span class="stock-roe" title="ROE anual calculado sobre o patrimônio líquido médio">${financial?.roe!=null?`${financial.roe.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`:'—'}</span>
                  <span class="stock-scope">${financial?.scope==='con'?'Consolidado':financial?.scope==='ind'?'Individual':'Sem dados'}</span>
                </a>`})}
             </div>
             <p class="market-directory-source">Lucro e ROE: demonstrações anuais de 2025 da <a href="https://dados.cvm.gov.br/dataset/cia_aberta-doc-dfp" target="_blank" rel="noopener noreferrer">CVM</a>, atualizadas no acervo 2T em 02/11/2026. Indicadores do emissor, não da ação; o escopo pode ser consolidado ou individual. Não são cotações, P/L ou dividend yield em tempo real. Se não houver cobertura, exibimos “—”. Clique em uma empresa para acessar o gráfico e os demonstrativos.</p>
           </div>
         </details>
       </section>`}
      </panel-workspace>`;
  }
}
