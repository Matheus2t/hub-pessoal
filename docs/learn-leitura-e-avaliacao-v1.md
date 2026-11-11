# 2T Learn — Leitura contextual e avaliação independente (v1)

**Cronograma:** etapa 2.5 (revisão de unidades), etapa 3.2 (integridade do diagnóstico), preparação da etapa 4 (experiência didática) e da etapa 6 (validação). Esta entrega é **editorial e estrutural**: nenhuma aula ou diagnóstico foi ativado.

## 1. Descoberta da revisão

As aulas e os diagnósticos estavam preparados, mas existia risco de **contaminação de avaliação**: o estudante poderia receber praticamente a mesma situação no treinamento e no diagnóstico, demonstrando apenas familiaridade com o exercício.

Na preparação, separamos melhor os contextos:

| Idioma | Contexto do piloto | Contexto diagnóstico agora |
|---|---|---|
| Inglês | Apresentação em curso; aplicação em reunião de projeto online | Apresentação e pergunta num clube de fotografia |
| Russo | Perguntar pela estação; transferência para biblioteca | Perguntar por parque no diagnóstico de produção; farmácia em outro desafio |

**Limite:** mudar o cenário reduz repetição literal, mas não garante independência estatística, dificuldade equivalente ou um instrumento diagnóstico validado. O aluno ainda pode reutilizar uma estrutura aprendida — o que é desejável — sem que isso, sozinho, prove um nível de proficiência.

Os diagnósticos continuam marcados `editorial-review`, `runtimeEnabled:false`, e dependem de revisão com aprendizes reais.

## 2. Dois guias de leitura com apoio contextual

| Guia | Texto legado vinculado | Objetivo comunicativo |
|---|---|---|
| `en-reading-guide.json` | `en-reading-01` | Entender horários, transporte, contraste e finalidade numa rotina |
| `ru-reading-guide.json` | `ru-reading-01` | Compreender uma rotina, quem usa ônibus e por quê uma ação ocorre |

Os textos originais não foram reescritos, movidos nem renomeados. Cada guia usa três **trechos citados literalmente dos próprios arquivos do projeto**, oferece explicação em português, ajuda de vocabulário sob demanda e um cenário novo para verificar compreensão sem repetir as mesmas perguntas.

### Inglês — pontos trabalhados

- `so`: relaciona o início do trabalho à possibilidade de tomar café da manhã.
- `but`: contrasta o irmão que usa ônibus com Lena, que vai a pé.
- `to keep them dry`: indica o propósito de guardar os livros na bolsa.
- Aplicação: novo personagem e outro horário; redação curta original com rubrica de significado e revisão.

### Russo — pontos trabalhados

- `по понедельникам`: expressão habitual de dia da semana.
- `поэтому`: relação de consequência.
- `едет на автобусе` versus `идёт пешком`: contraste de transporte.
- `чтобы они не промокли`: finalidade e forma verbal que não deve ser exigida como pré-requisito inicial.
- Aplicação: outro personagem e outro trajeto; escrita curta em russo com auxílio fonético opcional.

**Atenção ao rótulo A1:** o texto russo contém formas e estruturas que podem exigir apoio expressivo para iniciantes. Portanto, a etiqueta herdada do catálogo **não será tratada como uma dificuldade já homologada**. O guia oferece ajuda; a classificação e adequação reais precisam de validação linguística e de aprendizagem.

## 3. Como o futuro motor deverá usar esses arquivos

1. Apresentar o objetivo de leitura sem revelar a tradução integral.
2. Expor o texto original. O estudante pode solicitar ajuda em pontos específicos.
3. Verificar compreensão no material original, distinguindo quem fez o quê e a relação entre eventos.
4. Só então apresentar um **novo texto**, com mudança de personagens e detalhes.
5. Após a compreensão do texto novo, convidar uma produção curta e própria com rubrica.
6. Registrar a ajuda utilizada; não chamar de independente uma resposta produzida vendo um modelo.
7. Manter a avaliação aberta como `rubricWithReview` até existir mecanismo de revisão linguística validado.
8. Não apresentar êxito na leitura escrita como prova de listening, produção oral ou nível CEFR.

A experiência final poderá variar a ordem didática quando isso ajudar o aprendiz. Estes guias são **contratos de conteúdo**, não uma interface já implementada.

## 4. Checagens automatizadas adicionadas

`npm run learn:validate-reading` verifica:

- ID do texto original e objetivo curricular existente, sem renomeações;
- trechos citados realmente presentes no material antigo;
- pistas e explicações por trecho;
- preservação dos IDs das perguntas legadas;
- tarefa de compreensão com novo contexto e resposta verificável;
- aplicação aberta com rubrica, respostas alternativas e modelo oculto até a tentativa;
- distinção editorial entre cenário do diagnóstico e da aula-piloto;
- **proibição de ativar os novos guias enquanto ainda estão em revisão**.

O validador consegue comprovar a integridade dos dados, **não** que o texto esteja no nível correto, que a pergunta seja boa ou que o aluno aprenda com ela.

## 5. Portões de revisão antes de ativar

- [x] Contextos de diagnóstico diferenciados dos pilotos.
- [x] Guias de leitura em Inglês e Russo com explicações sobre significado e aplicação.
- [x] Verificação automática de vínculos, trechos e contratos de avaliação.
- [ ] Revisão linguística independente de naturalidade, flexões e vocabulário.
- [ ] Teste com aprendiz para verificar compreensão da instrução, carga de ajuda e dificuldade.
- [ ] Validação de respostas alternativas livres e qualidade do feedback.
- [ ] Motor de unidades capaz de apresentar ajuda gradualmente e armazenar evidência.
- [ ] Integração de revisão/retomada e confirmação de funcionamento com backup.
- [ ] Comparação com tarefas antigas em avaliação equivalente, incluindo retenção posterior.

## 6. Fontes pedagógicas de referência

- Conselho da Europa — descritores e atividades comunicativas do CEFR: https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors
- British Council — ensino por tarefas e organização por metas comunicativas: https://www.teachingenglish.org.uk/professional-development/teachers/teaching-knowledge-database/t-w/task-based-syllabus
- British Council — feedback em tarefas: https://www.teachingenglish.org.uk/professional-development/teachers/managing-lesson/conducting-feedback-exercises-and-tasks

As fontes oferecem princípios gerais de planejamento, mas **não homologam** nossos materiais ou promessas de velocidade de aprendizagem.

**Próxima dependência real:** aproveitar essas especificações em um motor interativo que preserve progresso e possibilite produção com rubrica e revisão adequada. Até lá, os arquivos novos são preparação versionada, não parte da experiência de estudo publicada.
