# Acoes V3 — fontes

Verificacao: 2026-11-02. Nao constitui autorizacao para outras bases do mesmo site.

| Fonte oficial | Informacao/formato | Atualizacao | Permissao e metodo | Limites |
|---|---|---|---|---|
| https://dados.cvm.gov.br/dataset/cia_aberta-doc-dfp | Demonstracoes anuais CSV/ZIP | Semanal, inclusive reapresentacoes | ODbL declarada; download oficial com timeout/CRC/hash no pipeline | Contas e escopos exigem reconciliacao; nao inclui precos |
| https://dados.cvm.gov.br/dataset/cia_aberta-doc-itr | Demonstracoes intermediarias CSV/ZIP | Semanal | ODbL declarada; mesmo pipeline | Fluxos acumulados nao equivalem a trimestre isolado |
| https://dados.cvm.gov.br/dataset/cia_aberta-cad | Cadastro CSV | Ultimo dia util, diaria | ODbL declarada; download oficial | Cadastro nao prova vinculo de ticker |
| https://dados.cvm.gov.br/dataset/cia_aberta-doc-fca | Identidade e valores mobiliarios CSV/ZIP | Semanal | ODbL declarada; documento mais recente e CAD ativo | Ausencia de vinculo nao autoriza inferencia por nome |
| https://dados.cvm.gov.br/dataset/cia_aberta-doc-ipe | Documentos nao estruturados, indice ZIP | Ano atual/anterior semanal | Metadados ODbL declarada; sem ingestao nesta entrega | Nao e tabela de proventos; direitos dos documentos vinculados exigem revisao especifica |
| https://www.b3.com.br/pt_br/dados/hub-de-dados-publicos/ | Referencia de consulta | Conforme produto | Nao ingerido: permissao de coleta/redistribuicao nao confirmada | Acesso publico nao autoriza redistribuicao |
| https://sistemaswebb3-listados.b3.com.br/dividensOtherCorpActPage/ | Consulta de eventos | Conforme publicacao | Nao ingerido; nenhum endpoint interno utilizado | Sem autorizacao verificada para ingestao |

Termos B3 consultados: https://www.b3.com.br/pt_br/termos-de-uso-e-protecao-de-dados/ .
O conteudo extraido nao foi suficiente para confirmar uma licenca de ingestao;
logo a fonte permanece bloqueada, sem alegar autorizacao.

Base derivada CVM mantem ODbL e atribuicao. Hashes das fontes efetivamente
usadas constam no registro de emissores. Precos, proventos, licencas de RI e
provedores alternativos ainda precisam de investigacao especifica. Nao foi
comprovada indisponibilidade universal de fonte gratuita: pesquisa incompleta.

## Extração factual de avisos IPE — 2026-11-02

Foram consultados os ZIPs IPE 2025 e 2026 e os avisos oficiais vinculados para
PETR4, VALE3, ITUB4, ABEV3 e WEGE3. Os metadados não traziam valores unitários.
Cinco PDFs foram obtidos pelas URLs públicas Link_Download, sem autenticação,
headers de disfarce ou acesso a endpoint privado. O cliente urllib recebeu
transferências incompletas; o cliente HTTP Playwright recebeu os arquivos
completos (assinatura PDF e EOF, leitura e renderização validadas).

A curação em scripts/data/ipe-reviewed-distributions.json contém APENAS fatos:
valor bruto, tipo, classe, datas e identificadores. Cada registro aponta para a
página 1, SHA-256 do PDF e linha original IPE. Textos completos, diagramação,
logotipos e PDFs não são redistribuídos. Não foi concedida nem presumida licença
aberta sobre documentos de terceiros. A base de metadados CVM permanece sob
ODbL; a seleção/estrutura factual produzida pela 2T é disponibilizada com a mesma
licença, preservando os direitos sobre os documentos de origem. A decisão de
extrair fatos isolados (não expressão protegida ou cópia de tabela de RI) é
fundamentada na distinção do art. 7º, §2º e art. 8º da Lei 9.610/98:
https://www2.camara.leg.br/legin/fed/lei/1998/lei-9610-19-fevereiro-1998-365399-normaatualizada-pl.html
Isto não é uma autorização geral para copiar materiais do RI ou da B3.

O dividendo VALE de R$2,141847479 anunciado no mesmo aviso foi excluído desta
primeira curação: o documento ressalva possível ajuste até a data-com e o valor
final ainda não foi reconciliado. Apenas o JCP de R$0,520530743 entrou. Os três
componentes de PETR4 são parcelas distintas: JCP em novembro, dividendo e JCP em
dezembro, sem somar novamente o total de R$1,34814262. WEG inclui data de pagamento
prevista em 10/03/2027, com aprovação ad referendum. Nenhuma passagem de tempo
transforma os avisos programados em pagamentos liquidados. Valores líquidos
citados pelos avisos não são aplicados universalmente pelo sistema.


## Ampliação IPE — 2026-11-02

26 registros unitários, 22 emissores. Curação em
`scripts/data/ipe-reviewed-distributions.json`: URL/protocolo/versão CVM, página,
SHA-256 do PDF e fatos extraídos. Abrange os avisos anteriores e novos de TOTVS,
B3, Renner, Suzano, Engie, Telefônica, Vibra, Copel, Cemig, Gerdau, Magazine Luiza,
Fleury, Hypera, Rede D’Or, CSN Mineração, Grendene e CPFL. Fatos numéricos/datas,
sem republicação de texto, arranjo, logotipos ou PDFs. ODbL refere-se à base de
metadados CVM e à base derivada, não concede licença aos documentos integrais.

Qualificadores não removidos: prazos máximos/inícios não são dias exatos;
retificações de valores B3/Vibra e antecipação Fleury preservadas nos fatos brutos.
Quatro documentos recentes excluídos têm metadados e razões na curação; CPFL
foi incluída por aviso anterior com valor unitário, sem transformar parcela total
em valor por ação. Proventos programados não são liquidações comprovadas.
Nenhuma fonte de preço/licença privada foi habilitada. DY permanece manual.
