# 2T Learn — V20 | Nova organização visual para o percurso A1–B1

**Escopo:** redesign da navegação do Learn, hub dos idiomas, sessão de estudo, ferramentas, catálogo e progressão privada V12, compatível com futuras atividades auditivas V19.  
**Stack preservada:** Lit + TypeScript + SCSS + esbuild. Sem nova dependência; sem mudanças no backend.

## Direção de design

- **Monocromático**: superfícies preto, branco e cinza; sem gradientes decorativos, interfaces exageradas ou cards chamativos.
- **Hierarquia:** identidade de idioma compacta → ação principal de estudo → mapa A1/A2/B1 → ferramentas e modalidades → indicadores detalhados.
- **Prática:** oito modalidades preservadas (Vocabulário, Flashcards, Listening, Ditado, Escrita, Leitura, Gramática, Avaliações) com navegação nativa por link.
- **Organização:** trilha existente, plano diário, acompanhamento, erros, treino direcionado e backup no painel lateral (reorganizado para telas estreitas).
- **Progressão privada V12:** 15 etapas por idioma, 6 questões legadas por etapa, barras mostrando **atividades respondidas**; a barra NÃO representa domínio, certificação ou nota CEFR.
- **Conteúdos editoriais V11/V13/V14/V16/V17:** não expor links, transcrições nem novas questões ainda não publicadas. O link para a V12 só aparece se a flag de prévia **local** estiver habilitada.
- **V19 áudios:** o redesign **não modifica** player, controle de som, direitos das gravações, manifesto, nem desbloqueia roteiro sem gravação validada.

## Arquivos e arquitetura

- `frontend/src/learn/home.ts`: novo componente Lit `<learn-home>` da página inicial do idioma. Usa os dados existentes do catálogo e histórico; não grava novos dados nem altera IndexedDB.
- `frontend/src/learn/page.ts`: conexão da página nova, navegação contextual em subpáginas e progresso detalhado no final do hub.
- `frontend/src/learn/progression-page.ts`: barras de progresso honestas por ID e painel de observações recolhível.
- `frontend/styles/_learn-workspace-v20.scss`: camada visual aditiva, aplicada **após** o CSS da plataforma para não alterar outros módulos.
- `frontend/styles/main.scss`: inclusão do arquivo SCSS.
- `frontend/tests/learn-workspace-v20.spec.ts`: testes Playwright de rotas, oito modalidades, navegação, layout móvel/desktop, temas e gate da progressão privada.

## Restrições de compatibilidade

- Os 474 IDs originais, resultados, revisões, IndexedDB e backups v1/v2/v3 permanecem intocados.
- Progresso e salvamento de sessão existentes continuam em seus componentes originais.
- Não modifica módulos Call, Games, Times, Ações, Calculadoras ou Renda Fixa.
- Não remove as oito rotas públicas; o hub ainda apresenta as oito âncoras de modalidade.
- A página de seleção `#/learn` ainda possui duas opções (Inglês/Russo).
- O modo `#/learn/{lang}/progression` permanece protegido por prévia local.

## Validação técnica

Rodar no ambiente com dependências instaladas:

```bash
npm run typecheck
npm run build
npm run test:e2e -- --grep "Learn V20"
npm run test:e2e -- --grep "V12"
```

Também executar a suíte Learn existente para conferir regressões, especialmente:
`frontend/tests/learn-ui.spec.ts`,
`frontend/tests/learn-progression-v12.spec.ts`,
`frontend/tests/learn-audio-v15.spec.ts` e
`frontend/tests/learn-core.spec.ts`.

Conferir visualmente em **1366 px, 768 px, 390 px e 320 px**, temas escuro/claro, teclado, cirílico e áudio. Testes Playwright são propostos, mas precisam rodar em CI/ambiente de build; a simples criação não indica sucesso.

## Antes da publicação

1. Verificar o build e todos os checks do PR.
2. Corrigir regressões e overflow nas resoluções-alvo, se houver.
3. Validar a experiência em dispositivos reais quando possível.
4. Fazer merge da branch visual na `main` separadamente da V19 de áudios.
5. Confirmar o deployment da Vercel apontando para o SHA esperado; não inferir publicação apenas porque o site responde HTTP 200.

**Critério de entrega:** interface de estudo reorganizada, sem criar falsos resultados pedagógicos e sem liberar a coleção editorial enquanto V19 estiver em produção.
