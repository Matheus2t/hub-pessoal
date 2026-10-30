import { LitElement, html, svg } from "lit";
/** Shared Light DOM lets the SCSS design system style every 2T component. */
export class LightElement extends LitElement {
  protected createRenderRoot() {
    return this;
  }
}
export type IconName =
  | "home"
  | "grid"
  | "calculator"
  | "arrow"
  | "chart"
  | "wallet"
  | "layers"
  | "sun"
  | "moon"
  | "menu"
  | "close"
  | "check"
  | "info"
  | "chevron";
const paths: Record<IconName, unknown> = {
  home: svg`<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>`,
  grid: svg`<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>`,
  calculator: svg`<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h2m4 0h2M8 14h2m4 0h2M8 18h2m4 0h2"/>`,
  arrow: svg`<path d="M4 12h16m-6-6 6 6-6 6"/>`,
  chart: svg`<path d="M3 3v18h18M6 15l5-5 4 3 6-8"/>`,
  wallet: svg`<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-5 4h5v4h-5Z"/>`,
  layers: svg`<path d="m12 2 10 5-10 5L2 7Zm-9 10 9 5 9-5M3 17l9 5 9-5"/>`,
  sun: svg`<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>`,
  moon: svg`<path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z"/>`,
  menu: svg`<path d="M4 6h16M4 12h16M4 18h16"/>`,
  close: svg`<path d="m6 6 12 12M6 18 18 6"/>`,
  check: svg`<path d="m5 12 4 4L19 6"/>`,
  info: svg`<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>`,
  chevron: svg`<path d="m9 5 7 7-7 7"/>`,
};
export const icon = (name: IconName) =>
  html`<svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    ${paths[name]}
  </svg>`;
export const money = (value: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value),
  );
export const decimal = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
export function parseBrazilian(value: string): number {
  const text = value.trim().replace(/R\$|\s/g, "");
  if (!text || !/^-?[\d.,]+$/.test(text)) return NaN;
  return Number(
    text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text,
  );
}
