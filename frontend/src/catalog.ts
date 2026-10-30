import type { IconName } from "./ui";
export type Page = "overview" | "calculator" | "simple" | "price" | "sac";
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
    category: "Calculadoras",
    description:
      "Calcule saldo, aportes e juros por mês.",
    icon: "calculator",
    href: "#/calculadora",
  },
  { id: 'simple', name: 'Juros simples', category: 'Calculadoras', description: 'Capital e juros sem capitalização.', icon: 'calculator', href: '#/juros-simples' },
  { id: 'price', name: 'Financiamento PRICE', category: 'Calculadoras', description: 'Parcelas fixas e custo total do crédito.', icon: 'calculator', href: '#/price' },
  { id: 'sac', name: 'Financiamento SAC', category: 'Calculadoras', description: 'Amortização constante e parcelas decrescentes.', icon: 'calculator', href: '#/sac' },
];
export const pages: Record<Page, { title: string; section: string }> = {
  simple: { title: 'Juros simples', section: 'Calculadoras' },
  price: { title: 'Financiamento PRICE', section: 'Calculadoras' },
  sac: { title: 'Financiamento SAC', section: 'Calculadoras' },
  overview: { title: "Início", section: "2T" },
  calculator: { title: "Juros compostos", section: "Calculadoras / Finanças" },
};
export const currentPage = (): Page =>
  location.hash === '#/juros-simples' ? 'simple' : location.hash === '#/price' ? 'price' : location.hash === '#/sac' ? 'sac' : location.hash === "#/calculadora"
    ? "calculator"
    : "overview";

// Categories come from the catalog; the aggregate filter is always last.
export function getCategories(items: readonly Pick<Tool, "category">[] = tools): string[] {
  return [...new Set(items.map(tool => tool.category))]
    .filter(category => category !== "Todas")
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .concat("Todas");
}

export function filterTools(category: string, query: string, items: readonly Tool[] = tools): Tool[] {
  const search = query.trim().toLocaleLowerCase("pt-BR");
  return items.filter(tool => (category === "Todas" || tool.category === category)
    && `${tool.name} ${tool.category}`.toLocaleLowerCase("pt-BR").includes(search));
}
