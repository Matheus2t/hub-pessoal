# 2T Learn — trabalho em andamento

**Não é uma entrega completa nem um módulo publicado.**

Checkpoint anterior: `1fdf509947bfb9b20562125d90d7a5dd1c3357a1`, branch
`checkpoint/pre-2t-learn-20261031`. Desenvolvimento: `codex/2t-learn`.
Nenhum arquivo de outros módulos, rota, homepage ou configuração foi alterado.
Os módulos de Learn ainda não são importados pelo bundle público.

## Implementado e verificado

- Tipos estritos para idiomas, conteúdo, tentativas e cartões.
- IndexedDB isolado `2t-learn`, versão 1; stores de tentativas e cartões;
  criação aditiva no upgrade e fechamento em mudanças de versão.
- Transação atômica para tentativa + cartão; IDs de tentativas idempotentes.
- Cartões identificados por idioma + item; salvar novamente não apaga revisões.
- Revisão inspirada no SM-2: esquecimento em dez minutos, difícil em um dia,
  bom em um/seis dias e intervalos progressivos; facilidade de 1,3 a 3.
- Estatísticas derivadas exclusivamente dos eventos e cartões de cada idioma.
  Domínio: pelo menos três revisões, intervalo >=21 dias e última nota boa/fácil.
- Normalização de caixa, espaços e pontuação; variantes explícitas; ё distinta
  de е por padrão. Não faz avaliação semântica de texto livre.
- Backup JSON v1, limites de tamanho/quantidade, validação de registros e chaves
  duplicadas; restauração substitutiva transacional com confirmação obrigatória
  quando já há dados. Não há mesclagem automática.
- Contratos/validador de conteúdo: IDs, repetições, respostas e referências;
  vocabulário russo exige cirílico. Não substitui revisão linguística humana.
- Adaptador SpeechSynthesis com seleção por idioma, preferência por voz local,
  ausência explícita de voz compatível e cancelamento da reprodução anterior.
  Integração com ciclo de vida da futura interface ainda pendente.

## Testes executados

Typecheck e build de produção aprovados. Seis testes Playwright aprovados:
normalização, intervalos, estatísticas independentes, backup, conteúdo e IndexedDB
real no navegador. O teste de banco verifica persistência após reload, deduplicação,
separação entre idiomas, substituição confirmada e rollback de atualização inválida.
O harness é servido por rota interceptada somente no teste; a CSP da aplicação não
foi alterada. Nenhum teste visual de Learn foi executado, pois ainda não há interface.
Não foram testadas vozes reais disponíveis em diferentes sistemas operacionais.

## Pendências para a entrega solicitada

- Etapa A: rotas, seleção de idioma, componentes e carregamento de conteúdo sob demanda.
- Etapa B: vocabulário, flashcards, listening, ditado e escrita na interface.
- Etapa C: leituras, gramática, avaliações, caderno de erros e treino direcionado.
- Etapa D: plano diário retomável, painel visual, player integrado e tela de backup.
- Etapa E: conteúdo original revisado completo, testes de todas as atividades,
  acessibilidade e inspeção visual nas cinco larguras/ambos os temas; regressão e deploy.

Conteúdo cadastrado para uso real: **zero entradas/atividades em ambos os idiomas**.
Os exemplos no teste são fixtures, não um catálogo educacional. Não foram criados
dados repetidos para atingir as quantidades solicitadas. Ainda faltam, por idioma,
150 entradas, 50 frases, 30 listening, 30 ditados, 40 exercícios escritos,
10 leituras, 10 lições e 30 questões de avaliação.

Não integrar esta branch à main ou publicar como plataforma concluída antes de
implementar e validar essas pendências. O estado atual foi preservado para continuação.
