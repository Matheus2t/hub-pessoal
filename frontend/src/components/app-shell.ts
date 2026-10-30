import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import './compound-calculator';
@customElement('app-shell')
export class AppShell extends LitElement { render() { return html`<div class="app-layout"><aside class="sidebar"><div class="brand"><span class="brand-mark">HP</span><div><strong>Hub Pessoal</strong><small>Seu espaço financeiro</small></div></div><nav><a class="nav-item active" href="#calculadora"><span>✦</span> Calculadora</a><a class="nav-item disabled" href="#"><span>◌</span> Em breve</a></nav><div class="sidebar-footer"><span class="status-dot"></span> Ambiente local</div></aside><main class="main-content"><header class="topbar"><div><p class="eyebrow">FERRAMENTAS / FINANÇAS</p><h1>Calculadora de juros</h1></div><div class="avatar">M</div></header><compound-calculator></compound-calculator></main></div>`; } }
