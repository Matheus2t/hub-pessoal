import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { LightElement } from "../ui";
import "./calculator-catalog";

@customElement("home-page")
export class HomePage extends LightElement {
  render() { return html`<calculator-catalog></calculator-catalog>`; }
}
