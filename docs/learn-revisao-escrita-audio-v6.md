# 2T Learn — revisão pedagógica v6: escrita e estímulos auditivos

**Rodada:** 12/11/2026.  
**Natureza:** auditoria editorial interna de texto, significado e gabaritos; **sem audição de gravações**, sem avaliação de pronúncia e sem parecer de docentes independentes.  
**Base:** `main` com o PR #110 integrado.  
**Escopo:** 104 exercícios de tradução/escrita e 120 exercícios com estímulos auditivos (60 Listening de vocábulos + 60 ditados), totalizando 224 itens analisados pelo texto.

## Alterações introduzidas

- **86 exercícios distintos modificados nesta rodada:** 36 EN (16 Listening, 6 ditado, 14 escrita) e 50 RU (16 Listening, 13 ditado, 21 escrita).
- **86 novas respostas aceitas:** 39 EN (19 Listening, 20 escrita) e 47 RU (19 Listening, 28 escrita). Nenhuma resposta anterior foi excluída.
- **Acumulado de edições editoriais desde a base `d22b1d0`: 328 exercícios distintos de 474** (168 EN e 160 RU); 146 registros não foram modificados. Esse indicador mede **registros alterados, não itens certificados**.
- Todos os **474 IDs**, níveis, habilidades e vínculos de unidade foram preservados.
- As mudanças foram aplicadas tanto aos arquivos `frontend/public/learn/{en,ru}.json` quanto à camada reprodutível `scripts/learn/catalog-editorial-overrides.json`.

## Escrita e equivalência semântica

### Inglês

Exemplos com equivalência sustentada:

- `en-writing-073`: `The meeting starts/begins in ten minutes`.
- `en-writing-087`: `leaves/departs` e `at noon/midday`.
- `en-writing-098`: `traffic light(s)`, `stoplight` e `traffic signal`.
- `en-writing-091`: `We are going` / `We're on our way` to the airport.
- `en-v2-writing-007`: `Finishing/Completing the course` e `achievement/accomplishment`.
- `en-v2-writing-012`: `purpose`, `aim` e `goal` no contexto de objetivo da reunião.

Mantidas explicações sobre diferenças de registro, formulação e intensidade dos modais. As variantes não são sinônimos universais: a equivalência é dependente do contexto disponível.

### Russo

- `ru-writing-061/068/081/093`: imperativos corteses e informais e posição de `пожалуйста` quando a instrução portuguesa não fixa o tratamento.
- `ru-writing-063`: `Этот стул свободен` / `Этот стул не занят` para cadeira desocupada.
- `ru-writing-070/073/076`: ordem de palavras e elipse natural de `находится`.
- `ru-writing-084`: forma curta `Ваш ответ верен`.
- `ru-writing-096`: `Я впервые в этом городе` / `Я первый раз в этом городе`.
- `ru-v2-writing-002`: `Этому источнику можно доверять` para uma fonte confiável.
- `ru-v2-writing-012`: `Какова/Какая цель` ou `В чём цель`, com `встреча` ou `собрание`.

A inclusão de variantes **não** deve supor que todo verbo de movimento, aspecto, caso, gênero ou formalidade seja intercambiável. A validação independente permanece necessária.

## Listening e ditado

### Adições estritamente na interpretação do significado

Nos itens de Listening que pedem **significado em português**, passaram a ser aceitos alguns formatos equivalentes:

- `não` / `nao`, `olá` / `ola`, `família` / `familia`, `mãe` / `mae`;
- numerais escritos por extenso ou com algarismos: `um/uma/1`, `dois/duas/2`, `três/tres/3`, `4`, `5`, `10`;
- `parents/родители`: `pais` / `pai e mãe`, sem confundir `parents` com parentes em geral.

**Importante:** essas equivalências de português não autorizam remover acentos do texto em russo ou mudar a grafia esperada nos ditados.

### Feedback específico de transcrição

- Inglês: `there is milk` / `there is fruit`, `I would like`, `have lunch`, Present Continuous e pedidos com `please`.
- Russo: `ребёнок` (substantivo masculino e grafia com `ё`), concordância `вода холодная`, genitivo após `без`, dativo em `нам нужен`, instrumental após `перед`, plural `лежат фрукты`, imperativos e gênero dos adjetivos.

**Os 60 ditados mantiveram o estímulo e seu gabarito literal**. As variantes foram adicionadas apenas em Listening semântico, não em transcrição estrita.

### Validação textual dos 120 estímulos

Foi conferida a correspondência de cada item com seu verbete e gabarito:

- 30 Listening e 30 ditados por idioma.
- Em Listening, `audio` corresponde ao termo de vocabulário associado por `wordIds`.
- Em ditado, `audio` corresponde à frase esperada em `answers[0]` e ao exemplo lexical associado.
- **Nenhuma divergência textual identificada nos 120 itens.**

Isso **não** comprova a qualidade de voz sintetizada, articulação, timing, diferenças de sotaque, velocidade ou transcrição feita por estudantes. Não foi usado áudio gravado/validado.

## Resultados e limitações da revisão

A auditoria textual identificou um padrão: atividades de escrita exigem equivalência semântica, enquanto ditados exigem transcrição do estímulo. Aplicar tolerância indiscriminada de acentos a toda a plataforma prejudicaria o aprendizado da escrita russa; por isso a tolerância foi adicionada apenas onde é justificada pela tarefa.

Mesmo com novas variantes, o avaliador não pode julgar todas as paráfrases. Respostas livres não reconhecidas devem continuar com o resultado `uncertain` quando não houver decisão semântica confiável.

**Verificações já realizadas nesta branch:**

- 237 exercícios por idioma, 15 leituras por idioma e estrutura de identidade intacta.
- Nenhuma perda de respostas cadastradas.
- Nenhuma duplicação de gabaritos após normalização simples.
- Integridade textual dos 120 estímulos auditivos.

**Pendente antes do merge:** CI oficial com determinismo dos catálogos, validadores, typecheck, build e testes de navegador.

## Próximas pendências de qualidade

1. Linguistas/professores devem julgar variantes especialmente nas diferenças de aspecto, formalidade e naturalidade do Russo; algumas traduções continuam dependendo de contexto não explícito.
2. Avaliar o conteúdo de áudio real, não apenas suas transcrições, com gravações licenciadas ou autorizadas.
3. Construir tarefas adicionais de compreensão interpretativa B1 e produção autônoma para testar transferência, não só reconhecimento de frases.
4. Homologar com estudantes e documentar resultados, sem declarar proficiência CEFR.
5. Preservar gates C1–C5 e não liberar experiências apenas com CI verde.
