import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import './compound-calculator';
@customElement('app-shell')
export class AppShell extends LitElement {
  render() { return html`<div class="app-layout"><aside class="sidebar"><div class="brand"><img src="/2t-mark.svg" alt="2T" class="brand-logo"><div><strong>2T</strong><small>Ferramentas pessoais</small></div></div><div class="side-label">WORKSPACE</div><nav aria-label="Ferramentas"><a class="nav-item active" href="#calculadora"><span class="nav-icon">↗</span><span>Calculadora</span><b>01</b></a><a class="nav-item disabled" href="#"><span class="nav-icon">＋</span><span>Novas ferramentas</span><b>—</b></a></nav><div class="sidebar-card"><span class="sidebar-card-icon">✦</span><strong>Seu espaço, suas regras.</strong><p>Uma coleção de utilidades para deixar decisões do dia a dia mais simples.</p></div><div class="sidebar-footer"><span class="status-dot"></span> Ambiente local <span class="footer-domain">matheus2t.com</span></div></aside><main class="main-content"><header class="topbar"><div><p class="eyebrow">2T / FINANÇAS</p><h1>Calculadora de juros</h1></div><div class="topbar-meta"><span class="secure-badge"><i></i> Seus dados ficam locais</span><div class="avatar" aria-label="Perfil Matheus">M</div></div></header><compound-calculator></compound-calculator></main></div>`; }
}
