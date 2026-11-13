# 2T Learn — V11: liberação pública formativa

**Fonte editorial:** [PR #116](https://github.com/Matheus2t/hub-pessoal/pull/116), integrado após aprovação do proprietário em 12/11/2026. **Integração técnica:** [PR #132](https://github.com/Matheus2t/hub-pessoal/pull/132).

## Decisão de publicação

O proprietário autorizou a **disponibilização pública como prática formativa**, sem notas automáticas nem alegações de certificação CEFR, em 12/11/2026. A revisão editorial interna V11/V18 é material disponível; **não alegar revisão linguística independente, homologação de professor ou evidência de proficiência**.

A fonte arquivada `docs/learn-atividades-ponte-v11.json` mantém os metadados históricos `public:false`, preservando a trilha de auditoria do rascunho. A cópia de execução `frontend/src/learn/bridge-v11-content.ts` contém a decisão explícita de release: **20 itens não auditivos `public:true`**; **4 roteiros de Listening `public:false`** até o áudio ser homologado. Todos os 24 IDs estão preservados.

## Endereços públicos

- **Inglês:** `https://matheus2t.com.br/#/learn/en/bridges`
- **Russo:** `https://matheus2t.com.br/#/learn/ru/bridges`

As páginas são acessíveis sem flags ou parâmetros de prévia e aparecem como **Atividades-ponte** na seção **Níveis de estudo** de cada idioma.

## Experiência liberada

- 12 atividades por idioma, seis na transição A1→A2 e seis na A2→B1.
- 20 tarefas de gramática, escrita e leitura com espaço de resposta livre, estímulo, modelos exemplificativos e critérios de revisão.
- Quatro roteiros de Listening **visíveis apenas como referência textual**, claramente identificados como sem áudio aprovado: nenhuma reprodução, nenhuma avaliação auditiva.
- Nenhuma resposta é avaliada automaticamente, gravada em IndexedDB, contabilizada na progressão ou armazenada no histórico. Os **474 exercícios** existentes e os backups v1/v2/v3 permanecem inalterados.
- Conteúdo adicional para prática; não substitui lições, diagnóstico nem demonstra domínio A1–B1.

## Verificações

- Typecheck, build e Playwright Learn devem passar antes do merge da liberação.
- Testes dedicados validam disponibilidade de ambas as rotas sem flag, preservação dos 24 IDs, exatamente 20 tarefas formativas e 4 auditivas bloqueadas, ausência de avaliação automática, interface em russo e inglês, e responsividade até 320px.
- A ausência de homologação dos quatro áudios continua pendente, mesmo com aprovação do proprietário para os itens escritos.

## Pendências futuras (fora do escopo da liberação)

A distribuição de gravações de Listening depende de escuta/revisão, direitos de uso e autorização de publicação. Uma eventual funcionalidade de correção automática ou evidência de nível exigirá critérios próprios e testes adicionais. Esta autorização **não habilita avaliação auditiva nem certificação de idioma**.
