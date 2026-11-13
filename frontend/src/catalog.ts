import type { IconName } from "./ui";
import { isLearnDelayedReviewPreviewEnabled,isLearnDiagnosticPreviewEnabled,isLearnIntegrationPreviewEnabled,isLearnListeningV13PreviewEnabled,isLearnPilotPreviewEnabled } from "./learn/pilot-preview";
export type Page = "games" | "call" | "sports" | "learn" | "learnEn" | "learnRu" | "learnInvalid" | "overview" | "calculator" | "simple" | "price" | "sac" | "retirement" | "housing" | "amortization" | "clt" | "catalog" | "market" | "fixedIncome" | "76ers" | "spfc" | "barcelona";
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
  { id: 'retirement', name: 'Aposentadoria', category: 'Calculadoras', description: 'Planeje patrimônio, aportes e renda futura.', icon: 'calculator', href: '#/aposentadoria' },
  { id: 'housing', name: 'Aluguel x Financiamento', category: 'Calculadoras', description: 'Compare o patrimônio de alugar ou comprar.', icon: 'calculator', href: '#/aluguel-vs-financiamento' },
  { id: 'amortization', name: 'Calculadora de amortização', category: 'Calculadoras', description: 'Antecipe parcelas e reduza juros ou prazo.', icon: 'calculator', href: '#/amortizacao' },
  { id: 'clt', name: 'Custo de funcionário CLT', category: 'Calculadoras', description: 'Salário, encargos e benefícios do empregador.', icon: 'calculator', href: '#/custo-clt' },
];
export const pages: Record<Page, { title: string; section: string }> = {
  games: {title:'Games',section:'Games'},
  call: {title:'Call',section:'Call'},
  sports: {title:'Times',section:'Times'},
  learn: {title:'Learn / Изучать',section:'Idiomas'},
  learnEn: {title:'Inglês',section:'Learn / Изучать'},
  learnRu: {title:'Russo',section:'Learn / Изучать'},
  learnInvalid: {title:'Página não encontrada',section:'Learn / Изучать'},
  fixedIncome: { title: 'Renda Fixa', section: 'Renda Fixa' },
  '76ers': { title: 'Philadelphia 76ers', section: 'Philadelphia 76ers' },
  spfc: { title: 'São Paulo Futebol Clube', section: 'São Paulo Futebol Clube' },
  barcelona: { title: 'FC Barcelona', section: 'FC Barcelona' },
  retirement: { title: 'Aposentadoria', section: 'Calculadoras' },
  housing: { title: 'Aluguel x Financiamento', section: 'Calculadoras' },
  amortization: { title: 'Calculadora de amortização', section: 'Calculadoras' },
  clt: { title: 'Custo de funcionário CLT', section: 'Calculadoras' },
  catalog: { title: 'Calculadoras', section: 'Calculadoras' },
  market: { title: 'Mercado de Ações', section: 'Ações' },
  simple: { title: 'Juros simples', section: 'Calculadoras' },
  price: { title: 'Financiamento PRICE', section: 'Calculadoras' },
  sac: { title: 'Financiamento SAC', section: 'Calculadoras' },
  overview: { title: "Início", section: "2T" },
  calculator: { title: "Juros compostos", section: "Calculadoras / Finanças" },
};
export const currentPage = (): Page =>
  /^#\/games(?:\/(?:snake|sudoku|2048|breakout|pong|palavra-secreta|digitacao|jogo-da-velha|reflexos|memoria))?$/.test(location.hash) ? 'games' :
  /^#\/call(?:\/.*|\?.*)?$/.test(location.hash) ? 'call' :
  location.hash === '#/learn' ? 'learn' : /^#\/learn\/(en|ru)\/bridges$/.test(location.hash) ? (location.hash.includes('/en/')?'learnEn':'learnRu') : /^#\/learn\/(en|ru)\/audio-v19$/.test(location.hash) ? (location.hash.includes('/en/')?'learnEn':'learnRu') : /^#\/learn\/(en|ru)\/listening-v13$/.test(location.hash)&&isLearnListeningV13PreviewEnabled() ? (location.hash.includes('/en/')?'learnEn':'learnRu') : location.hash==='#/learn/en/pilot-c1'&&isLearnPilotPreviewEnabled('c1') ? 'learnEn' : location.hash==='#/learn/ru/pilot-c2'&&isLearnPilotPreviewEnabled('c2') ? 'learnRu' : location.hash==='#/learn/en/diagnostic'&&isLearnDiagnosticPreviewEnabled('en') ? 'learnEn' : location.hash==='#/learn/ru/diagnostic'&&isLearnDiagnosticPreviewEnabled('ru') ? 'learnRu' : /^#\/learn\/(en|ru)\/reviews$/.test(location.hash)&&isLearnDelayedReviewPreviewEnabled() ? (location.hash.includes('/en/')?'learnEn':'learnRu') : /^#\/learn\/(en|ru)\/integration$/.test(location.hash)&&isLearnIntegrationPreviewEnabled() ? (location.hash.includes('/en/')?'learnEn':'learnRu') : /^#\/learn\/(en|ru)\/progression$/.test(location.hash) ? (location.hash.includes('/en/')?'learnEn':'learnRu') : /^#\/learn\/en(?:\/(?:vocabulary|flashcards|listening|dictation|writing|reading|grammar|test|errors|targeted|daily|dashboard|backup|path))?$/.test(location.hash) ? 'learnEn' : /^#\/learn\/ru(?:\/(?:vocabulary|flashcards|listening|dictation|writing|reading|grammar|test|errors|targeted|daily|dashboard|backup|path))?$/.test(location.hash) ? 'learnRu' : /^#\/learn(?:\/|$)/.test(location.hash) ? 'learnInvalid' :
  location.hash === '#/times' ? 'sports' :
  location.hash === '#/renda-fixa' ? 'fixedIncome' :
  location.hash === '#/76ers' ? '76ers' : location.hash === '#/spfc' ? 'spfc' : location.hash === '#/barcelona' ? 'barcelona' :
  location.hash === '#/calculadoras' ? 'catalog' :
  location.hash === '#/aposentadoria' ? 'retirement' :
  location.hash === '#/aluguel-vs-financiamento' ? 'housing' :
  location.hash === '#/amortizacao' ? 'amortization' :
  location.hash === '#/custo-clt' ? 'clt' : /^#\/acoes(?:\/.*)?$/.test(location.hash) ? 'market' :
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

export const learnActivities:Record<string,string>={vocabulary:'Vocabulário',flashcards:'Flashcards',listening:'Listening',dictation:'Ditado',writing:'Escrita',reading:'Leitura',grammar:'Gramática',test:'Avaliações',errors:'Caderno de erros',targeted:'Treino direcionado',daily:'Plano diário',dashboard:'Acompanhamento',backup:'Backup',path:'Trilha de aprendizado',progression:'Progressão guiada A1–B1','pilot-c1':'Aula-piloto (prévia)','pilot-c2':'Aula-piloto (prévia)',diagnostic:'Diagnóstico inicial (prévia)',reviews:'Revisões espaçadas (prévia)',integration:'Percurso integrado (prévia)','audio-v19':'Áudios V19 (prévia local)','listening-v13':'Listening A2/B1 (prévia local)',bridges:'Atividades-ponte (prévia V11)'};
