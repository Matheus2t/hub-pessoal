import type { IconName } from "./ui";
export type Page = "overview" | "tools" | "calculator";
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
    category: "Finanças",
    description:
      "Calcule saldo, aportes e juros por mês.",
    icon: "calculator",
    href: "#/calculadora",
  },
];
export const pages: Record<Page, { title: string; section: string }> = {
  overview: { title: "Visão geral", section: "Seu espaço de ferramentas" },
  tools: { title: "Ferramentas", section: "Explore a plataforma" },
  calculator: { title: "Juros compostos", section: "Ferramentas / Finanças" },
};
export const currentPage = (): Page =>
  location.hash === "#/calculadora"
    ? "calculator"
    : location.hash === "#/ferramentas"
      ? "tools"
      : "overview";
