# Decisão preliminar de modelo

**Não há modelo selecionado para produção nesta fase.** O baseline teve avaliação completa apenas em 80 imagens sintéticas. O modelo avançado tem somente um smoke test sintético e foi muito lento em CPU. Faltam fotos autorizadas, benchmark pareado suficiente, inspeção humana e revisão de licença dos arquivos exatos.

**Atualização em 2026-11-17:** a Fase 4.1 não obteve fotos reais nem CUDA ativo no ambiente local. O U²-Net permanece somente baseline e BiRefNet permanece pendente; não há vencedor provisório ou definitivo novo. Ver [bloqueios e próxima execução](phase-4.1-homologacao.md).

Os checkpoints ONNX locais foram encontrados e os SHA-256 coincidem com o inventário versionado, mas a baixa RAM disponível e o histórico de pico de 6,55 GB do BiRefNet Lite desaconselharam repetir inferências nesta sessão. A ausência de dados fotográficos, e não a falta dos arquivos de pesos, é o bloqueio para uma seleção representativa.

## Shortlist para execução local

1. **U²-Net `u2net`** — baseline histórico, com ressalva sobre a proveniência do ONNX convertido.
2. **BiRefNet General Lite** — candidato avançado de menor porte, a comparar quanto a contorno/transparência.
3. **BiRefNet General** — candidato avançado de qualidade, com demanda esperada superior.
4. **BEN2 Base ONNX** — candidato adicional, desde que um adapter ONNX seja validado contra o script oficial.

BiRefNet HR/Matting e InSPyReNet permanecem na trilha investigativa. BRIA RMBG-2.0 está fora do uso potencial comercial sem contrato. FeyNobg permanece bloqueado por revisão da licença do checkpoint exato.

## Evidências exigidas para escolha

- Resultados de MAE, SAD, MSE, F1/IoU e boundary F1, sempre separados entre retratos P3M e cada categoria sintética.
- Latência de carga, warm-up, p50/p95 por tamanho da imagem, RSS de pico e provedor real.
- Comparação visual cega por pessoa revisora em cabelo, fios finos, transparência, baixo contraste, bordas e falsos positivos.
- Verificação das saídas transparentes sobre fundos claros, escuros e quadriculados.
- Hash/revisão do checkpoint, licença do wrapper, checkpoint, dados e conversões.
- Custos por operação calculados a partir de benchmark real e plano/infra escolhidos. Não presumir preço zero.

Sem um conjunto fotográfico e a revisão humana não há base para afirmar “melhor modelo”. Uma métrica média sintética ou de retratos não prediz desempenho em objetos/produtos.

## Atualização Fase 4.2 — 2026-11-17

O smoke U²-Net desta fase foi tentado no harness, mas terminou em erro de importação (`rembg` ausente) antes da inferência. Não há nova evidência de qualidade nem mudança na decisão: **nenhum modelo selecionado**. O runtime GPU não está disponível, não há fotos reais no dataset local e não ocorreu avaliação humana. Veja [relatório da Fase 4.2](phase-4.2-results.md).
