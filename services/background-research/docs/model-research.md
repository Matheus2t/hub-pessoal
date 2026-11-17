# Pesquisa de modelos — Removedor de fundo 2T

**Escopo:** comparação offline, sem endpoint, dependência de produção, serviço pago ou ativação de produto. Revisão de fontes em 2026-11-17; revalidar antes de qualquer escolha/redistribuição.

## Famílias e candidatos

| Candidato | Uso na pesquisa | Licença/proveniência observada | Parecer preliminar |
|---|---|---|---|
| U²-Net (`u2net`) | Baseline clássico via ONNX/rembg | Código/modelo upstream declarado Apache-2.0 pelo projeto original; o ONNX convertido distribuído pelo rembg tem artefato e hash próprios | Baseline técnico, não presumir que licença upstream resolve a cadeia de conversão; registrar hash e revisar antes de distribuição. |
| BiRefNet general-lite | Candidato avançado leve via ONNX/rembg | Autores dizem código e pesos MIT; o conversor rembg mantém licença MIT separada e alerta que pesos têm licença própria | Candidato principal para medir em hardware modesto; a alegação de “lite” não equivale a qualidade igual. |
| BiRefNet general | Candidato avançado de qualidade | Autores confirmaram MIT para código e pesos; artefato ONNX e hash devem ser identificados separadamente | Candidato comparável; custo de memória/latência deve ser medido no dispositivo e no worker. |
| BiRefNet HR / HR-matting / general-2K | Alta resolução/matting | Família de variantes oficiais; checkpoints pesados e diferentes resoluções/tarefas | Pesquisa documental. Só executar após orçamento de VRAM/RAM e uma etapa de smoke test. |
| BEN2 Base | Alternativa matting, ONNX disponível | Cartão oficial HF declara MIT para o modelo aberto; o cartão distingue o modelo Base aberto do produto/API comercial e informa treino com conjunto proprietário adicional | Elegível para avaliação Base; não confundir com serviço comercial nem assumir que treinamento proprietário concede direitos sobre suas imagens. Adapter/pipeline ainda precisa ser homologado. |
| InSPyReNet | Alta resolução / salient-object detection | Código oficial MIT; distribuição/licença exata de checkpoints e artefatos precisa ser verificada por revisão | Candidato de pesquisa, não recomendado para produto até comprovar checkpoint, uso comercial e tarefa de matting. Saliency não é sinônimo de recorte de produto. |
| rembg | Wrapper/adapters, não um único modelo | Código do wrapper MIT; pesos independentes e próprios termos | Utilizado somente como interface de execução para comparar checkpoints. |
| BRIA RMBG-2.0 | Referência documental; execução condicionada | Pesos CC BY-NC 4.0; comercial exige acordo BRIA | Não baixar nem usar no produto sem licença comercial. Pode ser testado apenas se a finalidade e o acesso respeitarem integralmente os termos não comerciais. |
| FeyNobg | Candidato recente investigado | Encontramos declarações divergentes entre páginas secundárias e distribuição/model-card de pesos; licença varia por artefato/revisão | Bloqueado até inspecionar e fixar revisão canônica e termos do checkpoint exato. Não inferir licença dos pesos pela licença do pacote Python. |
| SAM3 / CineMatte / SDMatte | Fora do comparativo automático base | SAM3 tem acesso/licença próprios; CineMatte supõe fundo capturado; SDMatte demanda interação/prompts | Não são substitutos diretos de remover fundo automático sem prompt. Registrar como fora do escopo funcional atual. |

## Evidência e limites

- Os relatos de FPS/VRAM dos autores são mantidos como declarações dos autores, não como nossas medições. O runner mede carga, warm-up, latência por arquivo, RSS de processo e provedor efetivamente ativado.
- `CPUExecutionProvider` é a configuração reprodutível padrão. `nvidia-smi` registra uso global do GPU, não uso atribuível ao processo; não apresentar como VRAM por imagem.
- Licença de software, checkpoint, dados de treinamento, conversão/quantização e dataset de avaliação são camadas distintas. Esta análise técnica não é parecer jurídico.
- Benchmark só é comparável entre saídas que usam a mesma política de resize, a mesma amostra e a mesma máscara ground truth. Segmentação binária e alpha matte serão reportadas separadamente por categoria.

## Fontes primárias

- [BiRefNet: repositório oficial](https://github.com/ZhengPeng7/BiRefNet), [licença](https://github.com/ZhengPeng7/BiRefNet/blob/main/LICENSE), [confirmação dos autores sobre pesos MIT](https://github.com/ZhengPeng7/BiRefNet/issues/316).
- [BEN2: cartão e artefatos oficiais](https://huggingface.co/PramaLLC/BEN2), [artigo](https://arxiv.org/abs/2501.06230).
- [rembg: documentação oficial](https://github.com/danielgatis/rembg), que distingue licença do código e licenças dos pesos.
- [InSPyReNet: repositório oficial](https://github.com/plemeri/InSPyReNet).
- [BRIA RMBG-2.0: cartão oficial e licença](https://huggingface.co/briaai/RMBG-2.0).
- [Feyn NoBg: repositório oficial](https://github.com/feyninc/nobg) e [modelo no Hugging Face](https://huggingface.co/feyninc/FeyNobg); validar revisão e licença exatas antes de uso.

## Atualização de homologação — 2026-11-17

A Fase 4.1 ampliou o harness para pareamento por IDs comuns, tipos distintos de referência e registro de provider por evento ONNX, mas não gerou novos resultados de modelo. Há 80 amostras sintéticas, zero fotos reais e dois pesos ONNX locais ignorados pelo Git, com hashes compatíveis com o inventário. A rede do ambiente não resolveu o host oficial consultado para Open Images; CUDA não está disponível no ONNX Runtime instalado. Não há ranking fotográfico, avaliação humana cega válida ou vencedor. O estado completo, inclusive limites de licença e custo, está em [phase-4.1-homologacao.md](phase-4.1-homologacao.md).
