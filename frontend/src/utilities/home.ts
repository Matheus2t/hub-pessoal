import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { loadUtilityCapabilities } from "./api";
import { frontendUtilityAccess } from "./flags";
import type { CapabilitiesResult } from "./types";

@customElement("utilities-home")
export class UtilitiesHome extends LightElement {
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

  private entry(id: "links" | "background") {
    const access = frontendUtilityAccess();
    const capabilities = this.capabilities.state === "enabled" ? this.capabilities.capabilities : null;
    const available = capabilities?.utilities_enabled === true;
    const enabled = id === "links"
      ? access.linkResolver && available && capabilities?.link_resolver_enabled === true
      : access.backgroundRemover && available && capabilities?.background_remover_enabled === true;
    const data = id === "links"
      ? { title: "Desencurtador de Links", description: "Consulte o destino de um link encurtado.", href: "#/utilitarios/desencurtador", status: access.linkResolver ? "Backend local indisponível" : "Prévia desativada" }
      : { title: "Removedor de Fundo", description: "Prepare uma imagem para remover o fundo.", href: "#/utilitarios/remover-fundo", status: access.backgroundRemover ? "Backend local indisponível" : "Prévia desativada" };

    return enabled
      ? html`<a class="utility-entry" href=${data.href}><span class="utility-entry-copy"><strong>${data.title}</strong><small>${data.description}</small></span><span class="utility-entry-action">Abrir <span aria-hidden="true">↗</span></span></a>`
      : html`<article class="utility-entry utility-entry--disabled" aria-disabled="true"><span class="utility-entry-copy"><strong>${data.title}</strong><small>${data.description}</small></span><span class="utility-entry-status">${available ? "Prévia desativada" : data.status}</span></article>`;
  }

  render() {
    const status = this.capabilities.state === "unavailable"
      ? "Não foi possível consultar o backend local."
      : this.capabilities.state === "disabled"
        ? "Os protótipos estão desativados no backend local."
        : nothing;
    return html`<section class="utilities-page" aria-labelledby="utilities-title">
      <header class="utilities-heading"><p class="utilities-eyebrow">2T · ÁREAS</p><h1 id="utilities-title">Utilitários</h1><p>Ferramentas em preparação.</p></header>
      <div class="utilities-list" aria-label="Utilitários disponíveis">${this.entry("links")}${this.entry("background")}</div>
      ${status !== nothing ? html`<p class="utilities-status" role="status">${status}</p>` : nothing}
    </section>`;
  }
}
