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
