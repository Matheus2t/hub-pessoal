# 2T Learn — V11: integração das atividades-ponte

**Origem editorial:** [PR #116](https://github.com/Matheus2t/hub-pessoal/pull/116), arquivo `docs/learn-atividades-ponte-v11.json`. O conteúdo foi copiado **sem alterar os 24 IDs** para `frontend/src/learn/bridge-v11-content.ts`. O PR editorial permanece independente; sua aprovação não deve ser inferida do merge técnico.

## Entrega

- 12 atividades de Inglês e 12 de Russo; cada idioma tem seis tarefas A1→A2 e seis A2→B1.
- 10 de gramática, 3 de escrita guiada, 4 de inferência de leitura, 4 roteiros auditivos e 3 atividades de escrita integrada.
- Interface responsiva `learn-bridge-v11` com seleção de nível/tarefa, estímulo, instrução, rascunho livre, exemplos revisados e rubricas explicativas.
- Quatro tarefas auditivas mostram **áudio indisponível** e apenas disponibilizam o roteiro para inspeção editorial. Não reproduzem voz sintetizada como se fosse uma gravação aprovada.
- O botão de mostrar modelos não calcula acerto/erro, não usa o modelo de resposta como gabarito automático e não altera as tentativas legadas, trilha A1–B1, IndexedDB ou backups.
- Os 474 exercícios públicos existentes continuam intactos.

## Acesso de desenvolvimento

Os rascunhos possuem `public:false` e revisão docente independente pendente. Por isso **a página V11 não fica aberta em matheus2t.com.br**. O código é versionado e pode ser visualizado localmente:

```bash
npm ci
npm run build
# sirva dist em 127.0.0.1 no ambiente de desenvolvimento
```

Abra, no computador local, respectivamente:

- `http://127.0.0.1:8123/?learn-preview=bridge-v11#/learn/en/bridges`
- `http://127.0.0.1:8123/?learn-preview=bridge-v11#/learn/ru/bridges`

No domínio público e em páginas sem a flag, a rota exibe `Prévia indisponível`. A flag de localhost é uma proteção de interface para rascunhos, **não um mecanismo de autorização de dados confidenciais**. O material editorial já consta em PR público.

## Critérios antes da abertura pública

1. Aceite editorial do responsável pelos conteúdos (e revisão linguística adicional quando desejada). O conteúdo ainda não está validado como avaliação certificadora.
2. Decidir se a V11 será prática formativa, com resultados `uncertain`, ou avaliação revisada; nunca converter respostas abertas em erradas só por diferença do modelo.
3. Para os quatro itens de Listening, associar somente áudio efetivamente ouvido, aprovado e com distribuição licenciada; sem isso, mantê-los indisponíveis para avaliação.
4. Integrar eventuais registros de estudo preservando a compatibilidade com os IDs, o progresso legado e os backups, com novos testes.
5. Remover a flag de prévia apenas mediante aprovação explícita de publicação, com regressão completa validada.

**V11 técnica integrada não significa 24 atividades avaliáveis em produção.** Os 20 itens não auditivos já podem ser experimentados na interface local de forma não pontuada; os quatro roteiros auditivos aguardam homologação.
