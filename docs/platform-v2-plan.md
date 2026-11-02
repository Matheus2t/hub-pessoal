# 2T V2 — plano e registro de execução

Data de início: 01/11/2026. Base: `69e5534da6dd89140b1277d0ccf51a7bf0b57d82`.
Checkpoint remoto: `checkpoint/2t-before-v2-20261101`. Trabalho: `codex/2t-platform-v2`.

## Estado inicial
Lit, TypeScript, SCSS e esbuild; FastAPI, MySQL/SQLAlchemy/Alembic opcionais em produção. Learn carregado sob demanda, catálogos separados, IndexedDB v2 e backups v1/v2. Quatro calculadoras, projeções de renda fixa, dados contábeis locais com origem, widgets oficiais e provedores esportivos existentes. Não substituir esses mecanismos.

## Entregas e aceite
1. Fundação: quatro cards verticais, navegação completa, menus acessíveis e URLs antigas preservadas.
2. Learn inteligente: seleção determinística, trilhas e domínio por cobertura/repetição em datas distintas.
3. Conteúdo: expansão editorial A2/B1 sem alterar IDs antigos; validar referências e registrar contagens reais, sem alegar revisão humana.
4. Learn integrado: leitura/revisão, áudio legal com fallback, diagnóstico por amostra; preservar backups e histórico.
5. Ações: comparação/rankings apenas sobre dados rastreáveis; projeções hipotéticas; proventos dependem de fonte permitida.
6. Renda Fixa: cenários locais e taxa equivalente usando a projeção existente; nenhuma alteração presumida nas regras tributárias.
7. Times: agenda/calendário/resultados compartilhando o cache dos provedores existentes; falhas independentes.
8. Finalização: acessibilidade, medições, regressão, capturas reais e publicação por PR após preview validado.

## Dependências e riscos
Fontes externas têm cobertura/licenciamento e limites próprios. Não contratar serviços nem contornar bloqueios. Áudio estático depende de licença comprovada; não declarar áudio real validado por mocks. Conteúdo novo exige conferência editorial humana antes de alegar tal revisão. Persistência deve ser aditiva e manter backups compatíveis. Dados ausentes não equivalem a zero. Não confundir falha de infraestrutura com regressão.

## Testes
Unitários determinísticos de seleção/domínio, validação editorial, migrações/backups, matemática financeira e datas; Playwright dos fluxos e regressão, 1920/1366/768/390/320 nos dois temas; typecheck, build, Pytest com temporário no projeto e diff check. Inspecionar capturas; registrar tempos, bytes, requests e limitações reais.

## Integração e rollback
Commits separados por entrega; push da branch. Integrar apenas funcionalidades aprovadas, por PR sem reescrever histórico. Verificar SHA do deploy, assets, API e fluxos reais no domínio. O checkpoint remoto permanece disponível; em regressão crítica, reverter o PR com um novo commit ou restaurar o deployment anterior, preservando dados e histórico.

## Execução
Auditoria inicial e checkpoint concluídos. Resultados detalhados serão registrados em `platform-v2-results.md`; itens sem validação não serão marcados como entregues.
