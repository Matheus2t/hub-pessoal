import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { LightElement } from "../ui";

@customElement("utility-background-remover")
export class UtilityBackgroundRemover extends LightElement {
  render() {
    return html`<section class="utilities-page utility-prototype" aria-labelledby="utility-background-title">
      <header class="utilities-heading"><p class="utilities-eyebrow"><a href="#/utilitarios">Utilitários</a> / PRÉVIA LOCAL</p><h1 id="utility-background-title">Removedor de Fundo</h1><p>Remoção de fundo de imagens com processamento assistido por IA.</p></header>
      <section class="utility-prototype-panel" aria-label="Prévia do removedor de fundo">
        <div class="utility-image-workspace">
          <div class="utility-upload" role="group" aria-disabled="true" aria-label="Envio de imagem indisponível"><span class="utility-upload-mark" aria-hidden="true">＋</span><strong>Envio indisponível nesta fase</strong><small>O protótipo ainda não recebe arquivos.</small></div>
          <div class="utility-image-preview" role="group" aria-label="Prévia da imagem"><span>Prévia</span><p>Imagem não selecionada</p></div>
          <div class="utility-image-preview" role="group" aria-label="Resultado sem fundo"><span>Resultado</span><p>Processamento ainda não disponível</p></div>
        </div>
        <p class="utility-status" role="status">Nenhuma imagem é enviada ou processada nesta fase.</p>
      </section>
    </section>`;
  }
}
