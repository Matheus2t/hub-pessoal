# 2T Learn — protocolo de homologação com estudantes

**Status:** instrumento preparado; nenhuma sessão com estudantes foi realizada.

## Escopo e condições de início

Este protocolo avalia compreensão das instruções, navegação e uso da interface. Não mede ganho de aprendizagem, nível CEFR, proficiência ou eficácia pedagógica. Inglês e Russo devem ser observados separadamente. O piloto inicial deve envolver adultos; qualquer participação de menores exige decisão específica de consentimento e proteção antes do recrutamento.

As novas experiências C1–C5 estão restritas a `localhost`/loopback. Não enviar links públicos com parâmetros de prévia: parâmetros não são autenticação. Para uma sessão controlada, usar um único computador de homologação com URL local e um perfil temporário do navegador por participante; apagar o perfil/progresso ao fim. Nunca reutilizar o perfil pessoal do proprietário ou misturar históricos de participantes.

Antes do recrutamento, o responsável deve aprovar aviso de privacidade, consentimento, retenção e método de descarte. Sugestão operacional para notas pseudonimizadas: descarte até 30 dias após a síntese, com data de exclusão registrada; ajustar para prazo menor quando possível. Guardar consentimentos identificáveis separadamente das anotações e não os versionar no Git.

## Preparação do ambiente

1. Build local atual, Chromium/Brave atualizado, teclado e touch disponíveis.
2. Testar 1366×900 e 390×844; conferir tema escuro e claro.
3. Criar perfil temporário vazio. Confirmar que não há histórico anterior no IndexedDB `2t-learn`.
4. Verificar que o modo de prévia local está ativo apenas na sessão controlada; não usar domínio oficial.
5. Informar ao participante que a sessão pode ser interrompida, que respostas abertas ficam sem nota automática e que a síntese de voz não é gravação validada.

## Roteiro observado

Não orientar durante a tarefa. Se a pessoa ficar bloqueada, anotar o ponto e oferecer ajuda para continuar; marcar a ajuda como intervenção.

1. Encontrar Learn e escolher Inglês ou Russo.
2. Dizer o que espera encontrar na página do idioma; localizar diagnóstico e explicar se é obrigatório.
3. Fazer o diagnóstico opcional, interpretar os resultados e explicar o que significa `incerto` e `não avaliado`.
4. Abrir e concluir a aula-piloto; localizar contexto, diálogo, compreensão, prática guiada, transferência e resumo.
5. Responder uma tarefa fechada e uma aberta. Explicar o que a resposta aberta registrada significa e por que não recebeu correção automática.
6. Atualizar/reabrir a página e retomar a sessão sem duplicar evidências.
7. Encontrar revisões e explicar quando D+2/D+7 ficam disponíveis. Não simular datas como se fossem reais; testar revisão vencida em fixture técnica separada.
8. Encontrar plano diário e acompanhamento; distinguir resultado avaliado, incerto e não avaliado.
9. Exportar um backup de teste, confirmar o aviso de privacidade e restaurá-lo somente no perfil descartável.
10. Ao final, pedir que mostre como voltaria ao ponto em que parou e como apagaria o progresso local.

O roteiro deve ser executado por idioma em sessões distintas. Uma mesma pessoa pode participar dos dois fluxos, mas a ordem deve ser registrada por possível efeito de aprendizagem entre sessões.

## Registro e perguntas

Usar `templates/learn-student-session.json` como ficha manual. Registrar somente código aleatório, idioma, dispositivo, viewport, tema, tarefas, tempo aproximado, pontos de confusão, intervenções e observações. Por padrão, **não** registrar nome, e-mail, texto literal de respostas, áudio, vídeo, tela gravada, endereço IP ou identificador do navegador. Se a resposta literal for indispensável para revisão linguística, pedir consentimento separado, remover identificadores e armazená-la fora do repositório com acesso restrito e prazo de descarte.

Perguntar após cada bloco:

- O que você faria em seguida? O que nesta tela indicou isso?
- O que ficou salvo e onde? O que você entende que o Learn avaliou?
- Qual parte do enunciado, exemplo ou feedback ficou ambígua?
- Você conseguiu retomar e voltar sem ajuda? Onde hesitou?
- No Russo, o teclado fonético correspondeu à letra esperada? Houve confusão com `ё/е` ou forma gramatical?
- No Inglês, alguma instrução ou exemplo pareceu artificial ou difícil para o objetivo apresentado?
- O que você removeria ou esclareceria?

## Critérios de aprovação formativa

- Participante consegue dizer a próxima ação e retornar à área correta sem intervenção.
- Não interpreta `uncertain`/`notAssessed` como reprovação nem atribui fluência ou nível CEFR ao resultado.
- Não há perda, mistura entre idiomas, duplicação de tentativas ou vazamento de dados entre perfis.
- Instruções, suporte de teclado, layout móvel e estados de erro são compreendidos sem rolagem/overflow que impeça a tarefa.
- Problemas críticos de privacidade, interpretação de feedback, acessibilidade ou bloqueio interrompem a sessão e precisam ser corrigidos antes do próximo participante.

Registrar cada problema por tarefa, frequência observada, gravidade, evidência não identificável e correção proposta. Uma rodada pequena é exploratória; não prova retenção, eficácia, qualidade estatística ou adequação linguística geral.

## Situação real

Automação disponível: regressões Playwright C1–C5, legado, persistência, backups, proteção pública e layouts. **Testes humanos: pendentes.** Nenhum participante, duração, satisfação ou resultado de aprendizagem foi registrado nesta homologação.
