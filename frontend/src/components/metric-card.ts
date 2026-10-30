import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LightElement, icon, money, type IconName } from "../ui";
@customElement("metric-card")
export class MetricCard extends LightElement {
  @property() label = "";
  @property() value: string | number = 0;
  @property() detail = "";
  @property() tone = "";
  @property() glyph: IconName = "wallet";
  render() {
    return html`<article class="metric-card ${this.tone}">
      <div class="metric-label">${this.label}${icon(this.glyph)}</div>
      <strong title=${money(this.value)}>${money(this.value)}</strong>
      <p>${this.detail}</p>
    </article>`;
  }
}
