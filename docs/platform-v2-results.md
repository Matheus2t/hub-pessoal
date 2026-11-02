# 2T V2 — entrega progressiva e limitações

Execução: 01–02/11/2026. **Escopo integral ainda parcial.** Este relatório distingue funcionalidades utilizáveis de metas editoriais e integrações sem cobertura. Não é uma declaração de conclusão dos 20 critérios finais.

## Implementado
- Homepage com quatro cards 3:4 no desktop amplo, duas colunas intermediárias e uma no celular. CSS antigo de homepage consolidado, calendário de feriados preservado.
- Navegação Início, Calculadoras, Ações, Renda Fixa, Times e Learn; menu nativo de Times operável por teclado, Escape e links antigos preservados. Agenda em `#/times` e breadcrumbs das equipes.
- Seleção de prática determinística: revisão, novo e misto; idiomas isolados, sem repetição na sessão, prioridade para vencidos/erros e variedade de temas. Misto reserva posições alternadas para conteúdo inédito. Exposições frequentes no mesmo dia recebem redução de prioridade para evitar fixação em uma dificuldade. O SRS não foi modificado.
- Trilha inicial em `#/learn/en/path` e `#/learn/ru/path`, organizada por nível/tema e atividades existentes. Cobertura e consolidação vêm das tentativas. Domínio exige ao menos 3 acertos nas últimas 4 tentativas, última correta e acertos em 2 dias locais distintos. Unidades não bloqueiam outras áreas. Essa organização ainda não substitui uma sequência editorial completa de lições interligadas.
- Avaliações filtráveis por assunto/nível, até 30 questões, seleção por exposição nas repetições. IDs da seleção ficam no rascunho e são recuperados em recargas; resultados anteriores permanecem no histórico. Quatro classificações internas, sem certificação CEFR.
- Leitura com palavras cadastradas interativas e salvamento idempotente para revisão. Abrir/salvar não gera tentativa nem domínio. Mapeamentos explícitos de formas russas (`опыта` → `опыт`, por exemplo), sem inferência morfológica. Texto e pontuação preservados.
- Diagnóstico do Learn com tamanho mínimo de 5 respostas por modalidade, pontos fortes (>=80%) e dificuldades (<60%), revisões de hoje e acesso ao próximo tema. Histórico/gráficos anteriores preservados.
- Player com pausa/continuação, além de reprodução, repetição, parada e velocidades existentes. Mantém voz compatível e bloqueio de conclusão sem áudio efetivamente terminado.
- Comparador CVM ampliado para até 4 seleções, deduplicando emissores. Rankings de ROE/margem em amostra explicitamente parcial, por setor, escopo e exercício. Ausências não são convertidas em zero.
- Simulador de aportes em ações com dois cenários, evolução mensal, valorização hipotética, dividendos separados e opção de reinvestimento. Sem previsão de preços ou alegação de retorno histórico.
- Renda Fixa: salvar/nomear/reabrir/duplicar/excluir com confirmação e comparar cenários locais. Taxa equivalente de CDB/LCI/LCA usa o mesmo motor de projeção líquida existente.
- Agenda unificada dos três times: próximos jogos, resultados, calendário mensal, filtro, links, escudos permitidos, Brasília, notas de cobertura e falhas independentes. Reutiliza o cache de consultas existente.

## Conteúdo e revisão editorial
Por idioma (Inglês e Russo possuem as mesmas contagens):

| Tipo | A1 | A2 | B1 | Total |
|---|---:|---:|---:|---:|
| Palavras | 132 | 18 | 12 | 162 |
| Frases | 13 | 37 | 12 | 62 |
| Leituras | 4 | 6 | 5 | 15 |
| Lições de gramática | 4 | 6 | 5 | 15 |
| Exercícios | 136 | 54 | 47 | 237 |

Modalidades: 30 listening, 30 ditados, 52 escrita, 45 compreensão de leitura, 45 gramática e 35 questões no banco de avaliação, por idioma.

Adição real: 12 palavras, 12 frases, 5 leituras, 5 lições e 47 exercícios B1 por idioma. Todos os objetos anteriores são comparados integralmente ao checkpoint por teste, não apenas seus IDs. Catálogos passam por validação de IDs, referências, duplicações, respostas, idioma e unidades. Gerador aditivo em `scripts/learn/v2-content.py`, chamado pelo gerador existente.

**Metas ainda não atingidas:** 400 entradas distintas (atual 224, somando palavras e frases), 100 frases, 30 leituras, 30 lições e 150 exercícios novos por idioma. A2 foi preservado, não ampliado nesta entrega. O conteúdo novo é um piloto autoral B1 e **não recebeu revisão linguística humana independente**. Exige conferência de naturalidade, variantes válidas, nível CEFR e construções russas antes de alegar essa revisão. Não produzir material repetitivo para preencher números.

## Dados de mercado
Reutiliza o snapshot CVM de 31/10/2026: ITUB4, PETR4, VALE3, WEGE3 e TOTS3, dados DFP/ITR/FCA sob a licença e metodologia já documentadas em `financial-pipeline.md`. Setores são editoriais. Referências e links dos documentos são expostos. Atualização depende do pipeline existente, não de um processo permanente no serverless.

Não foram validadas novas fontes redistribuíveis de preços, valor de mercado, P/L, P/VP, DY ou históricos de dividendos/JCP próprios. Esses dados não foram extraídos dos widgets e não foram inventados. Os widgets oficiais continuam independentes. Rankings não representam toda a B3 e podem ter apenas um emissor por setor na amostra atual. Não é uma cobertura fundamentalista completa.

## Matemática financeira
Nenhuma fórmula ou regra tributária anterior foi alterada. A taxa equivalente usa bisseção em [0,1000]% do CDI (60 iterações), igualando o patrimônio líquido calculado por `project`, com mesmo capital, CDI, início e vencimento. Usa os mesmos IR, IOF, capitalização, custos e arredondamentos (tolerância monetária de um centavo). Recusa hipóteses incompatíveis, CDI não positivo, solução fora do intervalo e extrapolação numérica. LCI/LCA mantêm restrições de prazo; não há equivalência isenta de curtíssimo prazo fictícia.

As convenções tributárias continuam com a referência existente de 31/10/2026, sem introdução de nova regra legal presumida. IPCA+ antecipado continua sem garantia de preço de venda. Liquidez contratual permanece distinta de projeção.

Aportes em ações: valorização mensal efetiva `(1+r_anual)^(1/12)-1`; dividendos mensais hipotéticos `DY_anual/12` sobre saldo anterior; pagamento antes do aporte do fim do mês. Sem reinvestimento, dividendos acumulam em caixa sem remuneração. Patrimônio inclui esse caixa. São resultados brutos, sem custos/impostos, com taxas informadas pelo usuário.

## Persistência e segurança
IndexedDB Learn v2, SRS, planos e backups v1/v2 mantidos. Não houve migração destrutiva nem mudança no backend/MySQL/Alembic. Palavras de leituras entram na store existente de cards, sem tentar sobrescrever cartões agendados. Cenários financeiros usam chave isolada `2t-fixed-income-scenarios-v1` no localStorage, até 50 registros validados; falhas/quota/corrupção não causam substituição silenciosa. Não são sincronizados nem incluídos no backup específico do Learn.

Sem login, novos provedores pagos, rastreadores ou novas credenciais. Não houve alteração de `.env`, requisitos de backend, CSP ou configurações Vercel. Testes usam contextos descartáveis, nunca o histórico pessoal do usuário.

## Testes e inspeção
- Typecheck e build aprovados.
- Pytest: 101 aprovados em 2,28s fora do sandbox. A execução restrita travou e foi interrompida; não foi considerada aprovada.
- Regressão completa: 189 cenários, inicialmente 175 aprovados, 13 falhas e 1 teste opcional de TradingView ao vivo ignorado. As falhas foram render da trilha (2), seletores `summary` ambíguos após introduzir Times (6) e testes de links esportivos antes de abrir o novo menu (5).
- Após correções: 26 testes Learn/ferramentas/calculadora e 5 testes esportivos aprovados; os 13 cenários falhos foram revalidados. Refinamento posterior: 13 testes de Learn/ferramentas e 2 testes de extremos/cenários aprovados; matriz de contraste: 5 testes aprovados nas cinco larguras e nos dois temas. Não apresentar o primeiro run com falhas como um run integral verde.
- Capturas em 1920/1366/768/390/320, claro/escuro, Inglês/Russo e demais módulos. Inspeção visual identificou overflow de trilha em 320px e contraste de botão, ambos corrigidos. Contraste final do botão é medido após a transição de tema, >=4,5:1. Não foi alegada validação auditiva humana: os testes de áudio usam vozes controladas.
- Testes adicionais: conteúdo antigo integralmente preservado, formas flexionadas/pontuação, seleção/isolamento/domínio, salvamento sem crédito, cenários, equivalência/tributação/IOF/extremos, aportes, agenda/fusos/falhas independentes e overflow.

## Performance
Antes: bundle principal 140877 bytes, Learn 84557, CSS 86159; catálogos EN 176464 / RU 196824. Depois: bundle 160114 bytes (+13,7%), Learn 94927 (+12,3%), CSS 89280 (+3,6%); catálogos EN 160532 / RU 183545. As novas funcionalidades aumentam JS; não há alegação de ganho global. Catálogos foram compactados e continuam separados, fora do bundle inicial. Nenhuma biblioteca nova.

Medição de fumaça (contextos limpos; rede pública antes versus localhost depois, **não um benchmark comparável**): início 960/434ms, EN 863/134ms, RU 169/36ms; 10 requests iniciais e 3 por navegação de idioma em ambos, nenhum erro ou overflow. Somente o catálogo do idioma visitado foi requisitado. Artefato local `.vercel/platform-v2-performance.json`.

## Esportes — verificação real anterior à integração
APIs de produção responderam HTTP 200 em 02/11/2026, sem leitura de chaves: 76ers 10 próximos/5 resultados (BALLDONTLIE); São Paulo 3/5 e Barcelona 7/5 (football-data.org). Quantidades dependem da cobertura e não são preenchidas artificialmente. Partidas SCHEDULED dependem de confirmação; registros sem horário utilizável são omitidos pelo adaptador existente, com essa limitação exposta.

## Publicação e rollback
Base/checkpoint remoto: `69e5534da6dd89140b1277d0ccf51a7bf0b57d82`, branch `checkpoint/2t-before-v2-20261101`. Trabalho isolado em `codex/2t-platform-v2`; primeiro commit de fundação `7651ed5`. Commits seguintes: `ba4375a` (Learn/conteúdo), `64bb5a4` (finanças), `dbf983a` (agenda). Integração via PR no projeto Vercel existente somente após preview validado; resultados finais do deployment e SHA de merge devem ser confirmados na entrega. Sem force push ou troca de domínio.

Rollback: reverter o PR em novo commit ou restaurar o deployment anterior no projeto existente. A branch de checkpoint não deve ser removida; não apagar dados locais. Antes de qualquer restauração manual de dados, exportar backup e exigir confirmação para substituição.

## Pendências reais
1. Atingir metas editoriais A2/B1 com material variado e revisão independente; ampliar trilhas com sequência editorial e avaliações específicas completas por unidade.
2. Áudios estáticos próprios/licenciados: nenhum foi incluído sem origem/licença comprovadas. A camada estática permanece pendente; SpeechSynthesis continua necessário e dependente das vozes do dispositivo. Não houve teste auditivo humano.
3. Diagnósticos por tema/unidade com amostras e instrumentos de avaliação mais amplos; seleção de avaliações ainda tem banco de apenas 35 questões por idioma.
4. Fonte permitida/rastreável para preços e proventos históricos (dividendos e JCP separados) antes de ampliar múltiplos e rankings além da amostra CVM.
5. O bundle principal cresceu; considerar separar as novas ferramentas sob demanda em uma entrega de performance, com medição comparável. Não anunciar esse trabalho como já concluído.

Essas pendências impedem declarar a V2 integralmente concluída. Funcionalidades independentes validadas podem ser publicadas progressivamente, conforme autorizado no pedido.

## Preview efetivamente validado
Deployment `dpl_6P7D9BFcEn7HGzzXomajey6eqAxE`, SHA `dbf983a78d2a1841a889ffc91c6c87466d0fcd8b`: https://matheus2t-bg1xg0uku-matheus2ts-projects.vercel.app . Build Ready, validação autenticada sem desativar proteção. HTML, JS, CSS, catálogos e marcas retornaram 200, com hashes iguais ao build local; health 200 e simulação real 1333,31. Foram abertas 41 rotas e exercitados os novos fluxos: trilhas/leituras de ambos os idiomas, rankings com 5 emissores, aportes, salvar/reabrir cenário, equivalência e calendário. Backup com 78 tentativas, 2 cartões e 4 registros de planejamento exportado/restaurado em contexto isolado. Sem exceções JS, requests falhas ou erros HTTP. Um aviso de console corresponde ao bloqueio intencional, pela CSP existente, do pixel de rastreamento do TradingView; a proteção foi mantida.

A produção permanece no mesmo projeto/domínio: https://matheus2t.com.br . O SHA do merge/deployment e os resultados da validação pública são informados no relatório da entrega; status Ready isoladamente não é critério de aprovação. O checkpoint remoto continua intacto.
