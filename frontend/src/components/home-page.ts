import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { LightElement, icon } from "../ui";

@customElement("home-page")
export class HomePage extends LightElement {
  render() {
    return html`
      <section class="platform-intro">
        <h1>Início</h1>
      </section>
      <a class="home-call" href="#/call" aria-label="Acessar Call">
        <span class="home-call-icon" aria-hidden="true">
          <svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="11" width="24" height="22" rx="4"/>
            <path d="m30 18 8-5v18l-8-5"/>
            <path d="M12 39h18"/>
          </svg>
        </span>
        <span class="home-call-copy"><strong>Call</strong><span>Salas privadas para até 5 pessoas, com voz, câmera e compartilhamento de tela.</span></span>
        <span class="home-call-action">Acessar <span aria-hidden="true">↗</span></span>
      </a>
      <section class="platform-areas" aria-label="Áreas disponíveis">
        <a class="tool-card area-card area-calculators" href="#/calculadoras"><span class="area-icon">${icon("calculator")}</span>
          <div class="area-content"><div class="area-copy"><h2>Calculadoras</h2><p>Simule juros, aportes e parcelas de financiamentos.</p></div>
            <svg class="area-preview" viewBox="0 0 200 110" aria-hidden="true" focusable="false"><path class="preview-grid" d="M10 90H190M10 60H190M10 30H190"/><path class="preview-bars" d="M24 90V78M52 90V68M80 90V55M108 90V42M136 90V24M164 90V10"/><path class="preview-line" d="M10 85C65 85 116 66 190 9"/></svg>
          </div>
          <div class="area-access"><span>Explorar</span><span class="area-arrow" aria-hidden="true">↗</span></div>
        </a>
        <a class="tool-card area-card area-market" href="#/acoes"><span class="area-icon">${icon("chart")}</span>
          <div class="area-content"><div class="area-copy"><h2>Mercado de Ações</h2><p>Consulte empresas da B3, indicadores e gráficos.</p></div>
            <svg class="area-preview" viewBox="0 0 200 110" aria-hidden="true" focusable="false"><path class="preview-grid" d="M10 90H190M10 60H190M10 30H190"/><path class="preview-wicks" d="M25 40V90M58 15V65M91 34V91M124 20V78M157 8V60M184 24V76"/><path class="preview-candles" d="M25 55V75M58 26V48M91 49V72M124 36V60M157 20V42M184 35V58"/></svg>
          </div>
          <div class="area-access"><span>Explorar</span><span class="area-arrow" aria-hidden="true">↗</span></div>
        </a>
        <a class="tool-card area-card area-fixed-income" href="#/renda-fixa"><span class="area-icon">${icon("wallet")}</span>
          <div class="area-content"><div class="area-copy"><h2>Renda Fixa</h2><p>Simule e compare CDB, LCI, LCA e Tesouro.</p></div>
            <svg class="area-preview" viewBox="0 0 200 110" aria-hidden="true" focusable="false"><path class="preview-grid" d="M10 90H190M10 60H190M10 30H190"/><path class="preview-line" d="M10 90Q90 78 190 16"/><path class="preview-wicks" stroke-dasharray="4 4" d="M10 90Q90 82 190 38"/></svg>
          </div><div class="area-access"><span>Explorar</span><span class="area-arrow" aria-hidden="true">↗</span></div>
        </a>
        <a class="tool-card area-card area-learn" href="#/learn"><span class="area-icon">${icon("layers")}</span>
          <div class="area-content"><div class="area-copy"><h2>Learn / Изучать</h2><p>Inglês e russo. Vocabulário, exercícios e revisões.</p></div>
            <svg class="area-preview" viewBox="0 0 200 110" aria-hidden="true"><path class="preview-line" d="M20 20h65q15 0 15 15v65q-15-12-30-12H20Zm160 0h-65q-15 0-15 15v65q15-12 30-12h50Z"/><path class="preview-grid" d="M34 40h40m-40 15h40m-40 15h30m62-30h40m-40 15h40m-40 15h30"/></svg>
          </div><div class="area-access"><span>Explorar</span><span class="area-arrow" aria-hidden="true">↗</span></div>
        </a>
      </section>
      <a class="home-call home-games-entry" href="#/games" aria-label="Explorar Games"><span class="home-call-icon home-games-icon" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7"><rect x="4" y="10" width="32" height="20" rx="7"/><path d="M12 17v7m-3.5-3.5h7M26 18h.1M30 22h.1"/></svg></span><span class="home-call-copy"><strong>Games</strong><span>10 jogos clássicos. Arcade, lógica, palavras e desafios de habilidade.</span></span><span class="home-call-action">Explorar jogos <span aria-hidden="true">↗</span></span></a>`;
  }
}
