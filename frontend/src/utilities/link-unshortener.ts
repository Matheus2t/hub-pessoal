import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { loadUtilityCapabilities } from "./api";
import type { CapabilitiesResult } from "./types";

@customElement("utility-link-unshortener")
export class UtilityLinkUnshortener extends LightElement {
  @state() private capabilities: CapabilitiesResult = { state: "unavailable" };
  private controller?: AbortController;

  connectedCallback() {
    super.connectedCallback();
    this.controller = new AbortController();
    void loadUtilityCapabilities(this.controller.signal).then(result => {
      if (this.isConnected) this.capabilities = result;
    });
  }

  disconnectedCallback() {
    this.controller?.abort();
    super.disconnectedCallback();
  }

  render() {
    const backendState = this.capabilities.state === "enabled" && this.capabilities.capabilities.utilities_enabled && this.capabilities.capabilities.link_resolver_enabled
      ? "Motor disponível pela API local. A interface de análise será integrada na próxima fase."
      : this.capabilities.state === "unavailable"
        ? "Backend local indisponível. Nenhuma URL será acessada."
        : "Protótipo desativado no backend local. Nenhuma URL será acessada.";
    return html`<section class="utilities-page utility-prototype" aria-labelledby="utility-link-title">
      <header class="utilities-heading"><p class="utilities-eyebrow"><a href="#/utilitarios">Utilitários</a> / PRÉVIA LOCAL</p><h1 id="utility-link-title">Desencurtador de Links</h1><p>Veja para onde um link encurtado levaria antes de abri-lo.</p></header>
      <section class="utility-prototype-panel" aria-label="Análise de link">
        <label class="utility-input"><span>URL encurtada</span><input type="url" inputmode="url" autocomplete="url" placeholder="https://exemplo.com/abc" aria-describedby="link-prototype-status" /></label>
        <button type="button" class="button utility-submit" disabled>Analisar link</button>
        <p id="link-prototype-status" class="utility-status" role="status" aria-live="polite">${backendState}</p>
        <div class="utility-result" aria-label="Resultado da análise"><span>Destino final</span><strong>Indisponível nesta fase</strong></div>
      </section>
    </section>`;
  }
}
