# 2T Learn — avaliação de respostas abertas

## Comportamento verificado

- Questões fechadas continuam avaliadas pelo gabarito e pelas alternativas cadastradas.
- Respostas abertas dos pilotos, diagnóstico e revisões permanecem `uncertain`, `pending`, sem nota e sem feedback corretivo automático.
- `makeOpenResponseReviewPacket` cria uma ficha derivada com enunciado, contexto, resposta, critérios e ajudas; não altera o evento imutável e não avalia o texto.
- A exportação é uma ação local explícita. O arquivo inclui texto particular da resposta e não é transmitido pelo Learn. A interface agora informa armazenamento restrito, compartilhamento manual e descarte ao fim da revisão.
- Os exemplos das rubricas são critérios para análise, não gabaritos nem saídas de um avaliador.

## Status da revisão humana

**Não existe fluxo autenticado de revisão humana.** O frontend não tem identidade de revisor, login/role de avaliador, endpoint protegido, persistência remota de decisões nem auditoria de retificações. O tipo `humanReview` e o estado `reviewed` no contrato não significam que um revisor autenticado esteja implementado.

Não foi criado um formulário que aceite nome digitado como autenticação: isso seria falsificável. Também não foi criada uma API sem controle de acesso, nem movidas respostas do IndexedDB para o servidor. Assim, não é possível registrar uma avaliação humana como confiável nesta entrega; a evidência original continua incerta.

## Pré-requisitos para habilitar um serviço de revisão

1. Definir identidade/autenticação e autorização de avaliadores (conta individual, MFA quando disponível, role separada de estudante e revogação).
2. Criar endpoint server-side que rejeite por padrão e valide sessão/role antes de ler ou escrever qualquer resposta; proteger CSRF, abuso e rate limits.
3. Obter decisão do proprietário sobre base remota, região, retenção, consentimento, política de privacidade e quem poderá acessar as respostas.
4. Persistir revisões como registros append-only: resposta de origem, IDs/version/hash do conteúdo e rubrica, avaliador autenticado, data, resultado por critério, feedback e referência ao registro substituído. Correções não apagam eventos anteriores.
5. Validar exportação/importação e testes de autorização negativa antes de qualquer homologação remota. Não enviar respostas a um modelo ou serviço terceiro sem autorização específica.

## Evidências e limites

Os testes `learn-final-prep.spec.ts`, `learn-c1.spec.ts` e `learn-c3.spec.ts` exercitam respostas abertas, variantes, ambiguidades, ajudas, imutabilidade do evento e exportação manual. Isso valida o contrato do pacote, **não autentica um revisor e não valida qualidade linguística**. Até o serviço protegido existir e especialistas revisarem amostras, `uncertain` é o único resultado confiável para produção aberta.
