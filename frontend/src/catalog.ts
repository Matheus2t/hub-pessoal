import type { IconName } from "./ui";
export type Page = "overview" | "tools" | "calculator" | "simple" | "price" | "sac";
export interface Tool {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: IconName;
  href: string;
}
export const tools: Tool[] = [
  {
    id: "compound",
    name: "Juros compostos",
    category: "Investimentos",
    description:
      "Calcule saldo, aportes e juros por mês.",
    icon: "calculator",
    href: "#/calculadora",
  },
  { id: 'simple', name: 'Juros simples', category: 'Investimentos', description: 'Capital e juros sem capitalização.', icon: 'calculator', href: '#/juros-simples' },
  { id: 'price', name: 'Financiamento PRICE', category: 'Crédito', description: 'Parcelas fixas e custo total do crédito.', icon: 'calculator', href: '#/price' },
  { id: 'sac', name: 'Financiamento SAC', category: 'Crédito', description: 'Amortização constante e parcelas decrescentes.', icon: 'calculator', href: '#/sac' },
];
export const pages: Record<Page, { title: string; section: string }> = {
  simple: { title: 'Juros simples', section: 'Investimentos' },
  price: { title: 'Financiamento PRICE', section: 'Crédito' },
  sac: { title: 'Financiamento SAC', section: 'Crédito' },
  overview: { title: "Início", section: "2T" },
  tools: { title: "Calculadoras", section: "Calculadoras" },
  calculator: { title: "Juros compostos", section: "Calculadoras / Finanças" },
};
export const currentPage = (): Page =>
  location.hash === '#/juros-simples' ? 'simple' : location.hash === '#/price' ? 'price' : location.hash === '#/sac' ? 'sac' : location.hash === "#/calculadora"
    ? "calculator"
    : location.hash === "#/calculadoras" || location.hash === "#/ferramentas"
      ? "tools"
      : "overview";

export const navigation: { page: Page; href: string; label: string }[] = [
  { page: 'overview', href: '#/', label: 'Início' },
  { page: 'tools', href: '#/calculadoras', label: 'Calculadoras' },
];
