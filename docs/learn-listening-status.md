# 2T Learn — Listening: implementação e cobertura

## Implementado

- `learn-audio` reutiliza a Web Speech API local e oferece repetir, pausar/continuar, parar, volume ajustável e velocidade normal/reduzida.
- Vozes são filtradas pelo idioma solicitado; o player não substitui Inglês por Russo nem o contrário.
- O controle anuncia disponibilidade, carregamento inicial, reprodução e falha; botões, velocidade e volume têm nomes acessíveis e foco de teclado.
- A página marca a síntese como prática não validada. O evento `heard` declara `validated: false`; nenhum contrato C1–C5 é promovido por essa reprodução.
- `audio-assets.json` relaciona texto, idioma, tarefa, versão, origem, informação de licença, estado e elegibilidade de avaliação.

## Cobertura medida

- 120 atividades legadas (30 listening e 30 ditado por idioma) usam texto sintetizado localmente durante a reprodução. Isso não é gravação persistida nem sotaque controlado.
- As 4 tarefas de Listening dos diagnósticos (2 por idioma) estão marcadas `missing-reviewed-recording`, sem URL e sem avaliação.
- Total no manifest: 124 referências; **0 gravações validadas** e `assessmentEnabled: false` em todas.
- Não foi adicionada dependência, serviço externo ou custo de geração de áudio.

## Limitações e caminho para validar áudio real

A voz disponível, pronúncia, sotaque e qualidade variam por sistema operacional e navegador; não há metadados confiáveis da voz efetivamente escolhida nem controle de prosódia. Termos de voz são definidos pelo fornecedor do navegador/sistema e não foram revisados para redistribuição. Nenhum arquivo de áudio é exportado ou hospedado.

Para habilitar evidência de Listening, obter gravação licenciada/autorizada para cada tarefa, registrar origem, licença e variante, revisão por falante qualificado, conferir transcrição, nível de ruído, velocidade e correspondência com a pergunta, congelar versão/hash e testar o áudio em desktop e celular. Até isso ocorrer, manter `notAssessed` nas atividades pedagógicas e não usar TTS como evidência de compreensão auditiva. As respostas dos exercícios legados continuam registradas no histórico legado para compatibilidade, mas são somente prática de gabarito, não certificação de competência auditiva.

## Validação técnica

`npm run learn:validate-audio` confere se o manifest reflete os catálogos e diagnósticos, se não há URL/avaliação ativa e se o inventário continua com a cobertura esperada. Os testes Playwright/Playwright Node verificam seleção de idioma, volume, velocidade, estado do player e inelegibilidade das sínteses como evidência. Esses testes não validam a qualidade linguística de vozes instaladas.
