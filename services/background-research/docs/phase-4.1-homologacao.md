# Fase 4.1 — Homologação fotográfica e seleção de modelo

**Status: parcialmente concluída — sem modelo selecionado.**

Data da verificação: 2026-11-17. Esta etapa não altera o produto, as flags, a Vercel ou o Render. Pesos, imagens, predições e saídas locais permanecem ignorados pelo Git.

## Resumo e evidência disponível

| Requisito | Evidência nesta etapa | Resultado |
|---|---|---|
| Dataset fotográfico | 80 amostras sintéticas locais; 0 fotos reais; 0 amostras Open Images/P3M importadas | Não atende ao conjunto de 60–100 fotos |
| Modelos | Dois ONNX locais ignorados pelo Git, SHA-256 conferidos com `config/model-artifacts.json` | Arquivos presentes; sem nova inferência nesta fase |
| Benchmark pareado | Função/testes usam apenas IDs comuns e análise bootstrap descritiva | Harness pronto; comparação fotográfica não executada |
| GPU | RTX 4050 detectada, mas ONNX Runtime só oferece Azure e CPU | Execução CUDA não validada |
| Inspeção visual | Galeria cega e chave separada exercitadas com fixture/smoke sintético; sem avaliação humana fotográfica | Não homologada |
| Modelo de produção | Sem evidências fotográficas, GPU, licença final e revisão humana | Nenhum vencedor ou recomendação provisória nova |

Os 80 sintéticos têm 16 casos em cada categoria: clutter, fine edges, low contrast, thin geometry e translucency. Servem para validar o pipeline e exercitar padrões controlados; não substituem pessoas, animais, produtos, transparências ou fotografias de uso real.

## Dataset, proveniência e licenças

Não foram baixadas nem adicionadas fotografias nesta etapa. A tentativa de consultar o CSV oficial de metadados do Open Images falhou por resolução DNS (`host not known`) neste ambiente. O P3M-500-P continua sem download: seu acordo exige leitura/aceite e suas imagens não seriam redistribuídas; nenhum aceite foi feito em nome do usuário.

Foi preparado `scripts/import_openimages.py` para importar **arquivos já obtidos localmente**, mediante revisão humana por imagem. Ele exige correspondência do ID, URL original e licença CC BY 2.0 registrada, guarda atribuição (autor, título, perfil e landing page), rejeita divergências e registra a data/escopo da checagem. Isso não é parecer jurídico nem prova automatizada dos direitos: a planilha local representa uma revisão humana ainda a ser feita para cada item. Nenhuma linha foi importada.

As máscaras fornecidas pelo Open Images são `binary_instance_mask`: representam uma instância de objeto, não uma matte alpha contínua nem a referência completa para remoção do fundo da cena. Se usadas, devem ser reportadas como grupo de referência separado, sem misturar suas métricas a alpha mattes. O importador escolhe uma única instância por imagem (maior `PredictedIoU`); isso não transforma a máscara em referência de remoção completa.

Fontes oficiais consultadas: [instruções de download Open Images V7](https://storage.googleapis.com/openimages/web/download_v7.html), [notas oficiais de licença e atribuição](https://storage.googleapis.com/openimages/web/factsfigures_v7.html) e [significado oficial da coluna Rotation (graus anti-horários)](https://storage.googleapis.com/openimages/web/2018-05-17-rotation-information.html). A página do dataset ressalva que a licença listada para as fotos não substitui a verificação individual da origem; por isso o importador exige a checagem da landing page e preserva atribuição.

## Candidatos e comparação honesta

Resultados abaixo são apenas os registros históricos da Fase 4. Nesta Fase 4.1 **não houve reexecução de pesos**. A comparação histórica U²-Net (80 sintéticos) versus BiRefNet Lite (um único smoke sintético) não é pareada em lote e não permite ranking. O smoke/gallery não é revisão humana nem avaliação fotográfica.

| Modelo | Qualidade observada | Cabelos/pelos e transparência | GPU / memória | Custo | Licença e decisão |
|---|---|---|---|---|---|
| U²-Net `u2net.onnx` | Histórico: 80/80 sintéticos; MAE 0,04149, SAD/1000 12,1839, F1 0,90536, Boundary F1 0,78148; 0,655 s média CPU; RSS 1,05 GB | No contact sheet sintético, perdeu/suavizou alguns traços finos; classe de translucency teve MAE 0,18294. Não inferir comportamento em fotos/cabelos reais | Só CPU observado; memória é RSS histórica do processo, não VRAM | Não estimado por imagem; energia local não medida | Conversão/artefato exato requer revisão de proveniência/licença. Baseline; **não selecionado** |
| BiRefNet General Lite `birefnet-general-lite.onnx` | Histórico: apenas 1/1 sintético; MAE 0,00515, SAD/1000 1,3487, F1 0,99189, Boundary F1 0,92792; inferência CPU 54,59 s, warm-up 109,63 s, RSS de pico 6,55 GB | Recuperou mais traços no único exemplo, mas também deixou passar marcas finas do fundo. Evidência n=1 artificial | Só CPU observado; não repetido porque o pico histórico excede a RAM disponível nesta verificação (~2,85 GB) | Não estimado | Autores declaram MIT para código/pesos; hash/conversão do artefato deve ser revisado para release. **Pendente** |
| BiRefNet General, HR, HR-Matting, general-2K | Nenhuma execução nova ou métrica fotográfica | Não avaliado | CUDA ausente; requisitos do checkpoint exato não medidos | Não estimado | Revisar checkpoint/termos e medir antes de decidir. **Pendente** |
| BEN2 Base ONNX | Não executado | Não avaliado | Provider/custo não medidos; contrato oficial de pré/pós-processamento ainda não validado no adaptador | Não estimado | Model card declara MIT para Base aberta; validar artefato exato. **Pendente** |
| InSPyReNet / FeyNobg | Não executados | Não avaliados | Não medido | Não estimado | Checkpoint/licença exatos pendentes; **pesquisa somente** |
| BRIA RMBG 2.0 | Não executado | Não avaliado | Não medido | Não estimado | Termos observados CC BY-NC 4.0 para pesos self-hosted; excluído para uso comercial sem autorização/licença apropriada |

Nenhum candidato cumpre os requisitos para seleção definitiva. Não há benchmark por foto/categoria, teste de alta resolução nem score de qualidade fotográfica.

## Hardware e GPU

Relatório local não sensível salvo em `results/phase-4.1/hardware-report.json` (artefato ignorado pelo Git):

- Windows 11 build 26200; Python 3.13.9; CPU AMD64, 16 CPUs lógicas.
- RAM total 16,44 GB; disponível no registro: 2,85 GB.
- NVIDIA GeForce RTX 4050 Laptop, VRAM total 6141 MiB, uso de sistema 692 MiB, 56 °C; driver 596.21.
- `nvidia-smi` anuncia compatibilidade do driver CUDA 13.2; isso **não** significa CUDA Toolkit/cuDNN instalados. `nvcc` indisponível; `CUDA_PATH` e `CUDNN_HOME` ausentes.
- ONNX Runtime 1.32.0: `AzureExecutionProvider` e `CPUExecutionProvider`; pacote `onnxruntime-gpu` e wheels CUDA/cuDNN/cuBLAS ausentes.

Nenhum ambiente GPU foi instalado ou alterado globalmente. Nenhuma inferência GPU foi declarada. O runner agora exige provider ativo e, em modo CUDA, pré-carrega DLLs, gera profiling ONNX por nó e registra quantos nós cada provider executou. A telemetria do `nvidia-smi` é explicitamente marcada como global e não atribuível ao processo. Uma fração de nós em CUDA não significa execução integral na GPU.

Os arquivos ONNX locais foram conferidos pelos hashes registrados no inventário: U²-Net `8d10d2f3bb75ae3b6d527c77944fc5e7dcd94b29809d47a739a7a728a912b491`; BiRefNet Lite `5600024376f572a557870a5eb0afb1e5961636bef4e1e22132025467d0f03333`. Esses pesos não estão versionados.

## Custos e privacidade

Não foram criados recursos, contas, cartões, créditos ou workloads pagos; nenhuma cobrança foi gerada. Também não houve envio de fotografias a serviços externos. A máquina local não tem custo literalmente zero demonstrado: consumo elétrico não foi medido.

Referências de preço oficiais consultadas em 2026-11-17: [Modal](https://modal.com/pricing) listava L40S a US$ 0,000542 por GPU-segundo, com CPU/memória/egress separados; a documentação da [Modal sobre GPU](https://modal.com/docs/guide/gpu) exige forma de pagamento cadastrada. [RunPod](https://www.runpod.io/pricing) listava Pod L40S a US$ 1,09/h. São tarifas variáveis, não orçamento do produto. Sem medir o modelo na GPU e conhecer duração, CPU/RAM, cold start, disco, egress, retentativas e utilização não há custo por imagem nem projeção confiável para 100–50.000 imagens/mês.

## Harness e verificações

Implementado ou ampliado, isolado em `services/background-research/`:

- Dataset schema v1/v2, com ground truth opcional, tipo explícito, hashes, validação de dimensão/rotação e caminhos confinados ao diretório de dados.
- Execução com IDs explícitos pareados, hash do manifesto, dimensões/shape de entrada, artefato e proveniência nas saídas; amostras sem referência não recebem métricas.
- Hash e tamanho esperados do checkpoint são comparados com o arquivo local; nome igual sozinho não é tratado como verificação.
- Métricas não são agregadas entre grupos sintéticos e fotográficos; cada grupo contém sua própria quebra por categoria e tipo de referência.
- Agregação separada por categoria e tipo de referência; análise pareada usa apenas IDs comuns, bootstrap determinístico de 95% e declara interpretação descritiva (sem alegar significância).
- Galeria cega com ordem reproduzível, chave de modelos em arquivo separado e planilha humana sem nomes; validada por fixture sintética, sem classificação humana registrada.
- Importador Open Images com revisão individual, atribuição e máscara de instância explicitada.
- Relatório não sensível do hardware/provider.

Resultados desta branch:

- `python -m pytest tests -q` (harness isolado): **22 aprovados**, 2,04 s.
- `python -m compileall -q evaluation scripts tests`: aprovado.
- `git diff --check`: aprovado antes da revisão final; repetir após os últimos docs.
- Typecheck/build local e 9 testes contratuais direcionados foram aprovados anteriormente nesta mesma execução, antes desta atualização documental; nenhum arquivo de produto/frontend foi alterado depois. O bundle de Learn continua sem diff normalizado contra o `HEAD`.
- A suíte Python completa do backend havia ficado sem progresso observável numa tentativa anterior e foi interrompida. Não a declarei aprovada nem a repeti, pois este PR altera apenas harness/docs e o backend de produto não mudou. Os 9 testes contratuais direcionados passaram; a suíte completa permanece pendente.

O ambiente de shell não resolveu `storage.googleapis.com` (`host not known`) ao tentar acessar o CSV oficial, e nenhum arquivo de fotos/máscaras foi importado. Portanto, não foi possível gerar resultados por foto/categoria, comparação fotográfica pareada nem uma galeria fotográfica de avaliação nesta sessão.

## Pendências mínimas para terminar a homologação

1. Disponibilizar conectividade de rede autorizada ao host oficial **ou** fornecer localmente metadados/arquivos obtidos de fonte permitida. Baixar apenas fontes oficiais e manter tudo sob `data/` ignorado.
2. Revisar manualmente a página/licença de cada foto selecionada, preencher a planilha local e verificar atribuição. Reunir 60–100 imagens representativas quando os direitos permitirem; buscar alpha mattes licenciadas para métricas de matting. Tratar máscaras binárias do Open Images somente como instâncias.
3. Obter autorização antes de aceitar o acordo P3M, ou continuar sem P3M. Não usar mirrors para contornar o acordo.
4. Preparar venv GPU isolado com combinação documentada e compatível de Python/ORT/CUDA/cuDNN, sem atualizar driver globalmente; ou autorizar recurso externo com custo. Validar primeiro um smoke pequeno e o profiling por nó.
5. Rodar ao menos dois modelos na mesma lista fixa; revisar cegamente os resultados em fundos preto, branco, cinza e quadriculado; registrar defeitos e ratings humanos; medir alta resolução, RSS/VRAM e latência.
6. Revisar licenças dos checkpoints convertidos/hashes exatos e estimar operação somente com medições e infraestrutura escolhida.

Até essas pendências serem concluídas, o modelo permanece **não selecionado** e a Fase 5 não está pronta para uma implementação de produção baseada num vencedor.
