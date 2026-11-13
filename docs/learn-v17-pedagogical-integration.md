# 2T Learn — V17: integração pedagógica segura da progressão A1–B1

**Fonte editorial:** [PR #122](https://github.com/Matheus2t/hub-pessoal/pull/122), documentos `docs/learn-avaliacao-etapas-v17.json` e `docs/learn-avaliacao-politica-v17.json`. A política foi harmonizada com o relatório [V18](./learn-revisao-final-v18.md). **Revisão externa e aplicação-piloto não realizadas.**

## Parte implementada pelo ChatGPT

- 30 propostas de cenário novo: 15 em Inglês e 15 em Russo; vinculadas a 30 etapas V12 (6 IDs de exercícios legados por etapa).
- Seis propostas de checkpoint, A1/A2/B1 por idioma, mostrando compreensão escrita, escrita independente e transferência; compreensão auditiva, produção oral e interação permanecem **não avaliadas**.
- Sete competências separadas; acesso livre às 15 etapas de cada idioma e recomendação reversível da primeira etapa com atividades ainda não respondidas.
- Interface Lit responsiva em modo de prévia, com cobertura de **IDs distintos**, estado de estudo, cenário de prática não pontuada e critérios disponíveis sob demanda.
- Nenhuma resposta é classificada automaticamente; rascunhos de cenário ficam só na memória da aba e são descartados ao trocar de etapa ou atualizar. Nada é gravado nos stores do Learn.
- Política de decisão pura para testes **sintéticos**, com estados `not_assessed`, `awaiting_review`, `needs_practice`, `partially_supported` e `supported_for_observed_task`. A função **não é ligada** às respostas reais: sua única finalidade atual é garantir os limites de evidência propostos.
- Correção no texto da antiga prévia V12: as atividades-ponte V11 já estão publicadas como prática formativa; quatro roteiros de Listening continuam bloqueados.

## Como testar a prévia

Sirva o build na interface de desenvolvimento local, em `127.0.0.1` ou `localhost`, e acesse:

- `http://127.0.0.1:8123/?learn-preview=progress-v17#/learn/en/progress-v17`
- `http://127.0.0.1:8123/?learn-preview=progress-v17#/learn/ru/progress-v17`

O link também aparece em **Níveis de estudo** com a flag ativa. Em `matheus2t.com.br`, mesmo com o parâmetro de prévia, a rota retorna **Prévia indisponível**. A flag de localhost não é mecanismo de segurança para dados privados; os cenários editoriais da branch são material de rascunho, não conteúdo sigiloso.

## Contagem de estudo não significa proficiência

A V12 já conta IDs diferentes de gramática/leitura por idioma. A V17 preserva esse contrato: um exercício respondido de forma incorreta ou `uncertain` **conta como estudo**, não como domínio. Repetir o mesmo ID sete vezes só representa **um item distinto**. Tentativas em Russo não entram em Inglês e vice-versa.

Os 16 casos sintéticos editoriais testam, entre outros, áudio não aprovado, TTS de navegador, transcrição antecipada, ajuda/modelo prévio, repetição da tarefa, revisão humana pendente e edição posterior do material. Quando não há evidência válida, informar `not_assessed`, e quando a avaliação de resposta aberta não é conclusiva, informar `awaiting_review` em vez de erro. Mesmo evidência válida descreve **somente a tarefa observada**, nunca um nível global.

## Fora do escopo desta entrega

- **Não** converter a V17 em sistema de aprovação automática A1, A2 ou B1. Sem certificação CEFR.
- **Não** ativar avaliação auditiva sem áudio V19 aprovado e correspondência exata ao roteiro.
- **Não** publicar checkpoints ou tarefas como exames, nem registrar resultados sintéticos como alunos reais.
- **Não** modificar schema IndexedDB, tentativas legadas, os 474 exercícios, as versões de backup ou os módulos V13/V14.
- **Não** incorporar o PR editorial #122 automaticamente à `main`; a fonte fica rastreável e continua dependente de aprovação.
- Para a próxima etapa técnica, o Codex poderá implementar avaliação com eventos de proveniência, validação humana, gestão de revisão e política de versão. Antes disso, o proprietário precisa aprovar o uso formativo; qualquer alegação oficial exigiria validação externa apropriada.

## Verificações

Os testes de `frontend/tests/learn-progress-v17.spec.ts` cobrem o inventário, os 16 casos sintéticos, a separação dos idiomas e dos 6 IDs distintos por etapa, bloqueio do domínio público, interação local, limpeza de rascunhos e não overflow em 320/390/768/1366 px e nos dois temas. A execução de CI e o resultado devem constar no PR de integração.
