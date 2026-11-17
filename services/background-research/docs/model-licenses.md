# Matriz preliminar de licenças e dados

Revisão técnica de alto nível em 2026-11-17. Não substitui revisão jurídica. Nenhuma licença é inferida da licença do wrapper.

| Ativo | Código | Pesos/artefato | Dataset/uso | Ação |
|---|---|---|---|---|
| BiRefNet | MIT | Autores confirmaram MIT para weights; fixar revision e SHA-256 do arquivo usado | Revisar dados e avisos da versão exata | Pode entrar no comparativo; não incluir peso no Git. |
| BEN2 Base | Model card declara MIT | Fixar hash do ONNX/safetensors e usar apenas Base aberta | Cartão declara dataset proprietário adicional no treino; isso não transfere imagens ao 2T | Pode entrar em pesquisa; diferenciar Base de modelo/API comercial. |
| U²-Net | Licença do projeto original deve ser lida no release escolhido | ONNX convertido do rembg é derivado/convertido; hash e proveniência independentes | Dado de treino e redistribuição do convertido precisam de revisão | Usar como baseline temporário, sem decidir produto. |
| rembg | MIT | Nenhuma licença automática dos modelos | Wrapper faz downloads no primeiro uso | Código isolado em ambiente local; não é dependência da aplicação. |
| InSPyReNet | MIT | Termos do checkpoint/mirror exato ainda não confirmados | Não presumir que licença do código cobre pesos/dados | Pesquisa documental, bloqueado para produto. |
| BRIA RMBG-2.0 | Código e pesos com termos BRIA | CC BY-NC 4.0 para self-host; comercial exige contrato | Nenhuma autorização comercial fornecida | Não baixar para benchmark com objetivo de produto; excluído até autorização. |
| FeyNobg | Repo nobg Apache-2.0 no código observado | Divergência em fontes secundárias; pin exato precisa auditoria | Confirmar termos específicos da revisão dos pesos | Não recomendar ou redistribuir até esclarecer. |
| P3M-500-P | — | Máscaras alpha liberadas no acordo do dataset | Acordo MIT; imagens de origem continuam sob copyright dos autores originais. Split P é face-blurred. Mirror não apresenta URL de licença individual por linha. | Uso local de avaliação após aceite explícito do acordo; não comitar nem redistribuir fotos/máscaras. |
| Amostras sintéticas 2T | Gerador no repo | PNG gerados localmente | CC0-1.0 indicado para as amostras geradas | Podem ser regeneradas; não misturar seu resultado com score de foto real. |
| Open Images V7 | Anotações Google CC BY 4.0 | Fotos listadas como CC BY 2.0, com autor e URL por item | A página oficial não garante a licença de cada fotografia; é necessária revisão manual da página de origem antes de manter o item. A máscara é instância binária. | Importador Fase 4.1 exige planilha local de revisão, conserva atribuição e rejeita licença/URL divergentes. Nenhuma foto foi importada nesta execução. |

## P3M: condição para baixar

Antes de executar `scripts/fetch_p3m.py`, leia o [acordo oficial](https://jizhizili.github.io/files/p3m_dataset_agreement/P3M-10k_Dataset_Release_Agreement.pdf). O script exige `--accept-p3m-terms`, limita a split face-blurred `P3M_500_P` e não escreve URLs temporárias assinadas em logs ou manifestos. O manifest local registra origem, IDs, dimensões e SHA-256; o repositório inclui apenas a estrutura de esquema, nunca as imagens.

Fontes: [P3M-10K oficial](https://github.com/JizhiziLi/P3M), [acordo de liberação](https://jizhizili.github.io/files/p3m_dataset_agreement/P3M-10k_Dataset_Release_Agreement.pdf), [espelho que documenta os campos e split](https://huggingface.co/datasets/nobg/P3M-10K).

## Atualização Fase 4.2 — 2026-11-17

Nenhuma imagem ou peso foi importado/republicado nesta fase. A página oficial Open Images V7 declara anotações sob CC BY 4.0 e fotos listadas como CC BY 2.0, mas ressalva que não garante a licença de cada foto; conferir a página de origem e atribuição para cada item continua obrigatório. Consulte [descrição oficial/licenças](https://storage.googleapis.com/openimages/web/factsfigures_v7.html). Os hashes locais continuam sendo metadados do inventário Fase 4.1; a revisão de proveniência dos checkpoints convertidos não foi concluída nesta fase. Detalhes: [resultados Fase 4.2](phase-4.2-results.md).
