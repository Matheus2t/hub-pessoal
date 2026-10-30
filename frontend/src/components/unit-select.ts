import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { LightElement } from '../ui';

@customElement('unit-select')
export class UnitSelect extends LightElement {
  @property() label = '';
  @property() name = '';
  @property() value = '';
  @property({ attribute: false }) options: [string, string][] = [];
  @property({ type: Boolean }) disabled = false;
  render() {
    return html`<label class="unit-control">${this.label}<select .value=${this.value} ?disabled=${this.disabled}
      @change=${(event: Event) => this.dispatchEvent(new CustomEvent('unit-change', { detail: { name: this.name, value: (event.target as HTMLSelectElement).value }, bubbles: true }))}>
      ${this.options.map(([value, label]) => html`<option value=${value} ?selected=${value === this.value}>${label}</option>`)}
    </select></label>`;
  }
}
