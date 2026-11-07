import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { LightElement } from "../ui";
@customElement("form-field")
export class FormField extends LightElement {
  @property() name = "";
  @property() idPrefix = "field";
  @property() label = "";
  @property() value = "";
  @property() unit = "";
  @property() hint = "";
  @property() error = "";
  @property({ type: Boolean }) integer = false;
  @property({ type: Boolean }) disabled = false;
  render() {
    return html`<div class="form-field">
      <label for=${`${this.idPrefix}-${this.name}`}>${this.label}</label>
      <div class="field-input ${this.error ? "invalid" : ""}">
        ${this.unit === "R$"
          ? html`<span class="field-prefix">R$</span>`
          : ""}<input
          id=${`${this.idPrefix}-${this.name}`}
          name=${this.name}
          type="text"
          inputmode=${this.integer ? "numeric" : "decimal"}
          autocomplete="off"
          .value=${this.value}
          ?disabled=${this.disabled}
          aria-invalid=${Boolean(this.error)}
          aria-describedby=${`${this.idPrefix}-hint-${this.name}`}
          @input=${(e: Event) =>
            this.dispatchEvent(
              new CustomEvent("field-input", {
                detail: {
                  name: this.name,
                  value: (e.target as HTMLInputElement).value,
                },
                bubbles: true,
              }),
            )}
          @blur=${() =>
            this.dispatchEvent(
              new CustomEvent("field-blur", {
                detail: this.name,
                bubbles: true,
              }),
            )}
        />${this.unit !== "R$"
          ? html`<span class="field-suffix">${this.unit}</span>`
          : ""}
      </div>
      <p
        id=${`${this.idPrefix}-hint-${this.name}`}
        class="field-hint ${this.error ? "field-error" : ""}"
      >
        ${this.error || this.hint}
      </p>
    </div>`;
  }
}
