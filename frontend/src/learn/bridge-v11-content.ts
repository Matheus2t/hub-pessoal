/** V11 — owner-approved public formative practice, based on PR #116 source.
 * Approval: site owner, 2026-11-12. This is NOT independent teacher review.
 * Exactly 20 non-audio tasks are public; four listening scripts stay unassessable
 * until real recordings are licensed, listened to and approved.
 * No automatic scoring, CEFR certification, or progress-evidence writes.
 */
import type {Language} from './model';

export interface BridgeTaskV11 {
  draftId:string;language:Language;transition:'A1_to_A2'|'A2_to_B1';targetLevel:'A2'|'B1';
  skill:'grammar_bridge'|'guided_writing'|'reading_inference'|'listening_script'|'integrated_writing';
  objective:string;stimulusText:string;taskInstruction:string;
  illustrativeAnswer:string;successEvidence:string;rubricPolicy:string;audioStatus:string;
  teacherReviewNotes:string;workflowStatus:string;public:boolean;existingCatalogExercise:false;
  acceptedAnswerExamples:string[];reviewVersion:'v11';difficultyBand:string;
  scoringCriteria:string[];reviewStatus:string;
}
/** Preserved V10 draft IDs; the public flag is enabled only for formative non-audio tasks. */
export const bridgeV11Drafts:readonly BridgeTaskV11[]=[
  {
    "draftId": "en-bridge-v10-01",
    "language": "en",
    "transition": "A1_to_A2",
    "targetLevel": "A2",
    "skill": "grammar_bridge",
    "objective": "Formar pergunta com do/does.",
    "stimulusText": "She works here.",
    "taskInstruction": "Transforme a frase afirmativa em uma pergunta sobre o hábito dela, usando o presente simples.",
    "illustrativeAnswer": "Does she work here?",
    "successEvidence": "Usa Does + she + work (forma-base), preservando o sentido da frase.",
    "rubricPolicy": "deterministic_candidate_requires_teacher_check",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "Questão de transformação controlada; exigir que o aluno não mantenha works depois de does.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "Does she work here?"
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A1_plus_to_A2_entry",
    "scoringCriteria": [
      "Preserva o significado exigido pelo estímulo.",
      "Forma linguística-alvo correta ou equivalente explicitamente aceita.",
      "Não penalizar pontuação/capitalização irrelevantes ao objetivo."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "en-bridge-v10-02",
    "language": "en",
    "transition": "A1_to_A2",
    "targetLevel": "A2",
    "skill": "guided_writing",
    "objective": "Ligar pessoa, rotina e horário.",
    "stimulusText": "You start work at nine. Your sister starts work at ten.",
    "taskInstruction": "Escreva exatamente duas frases em Inglês: uma informando seu horário de início do trabalho e outra informando o horário da sua irmã.",
    "illustrativeAnswer": "I start work at nine. My sister starts work at ten.",
    "successEvidence": "Duas frases completas identificando início às nove e às dez; flexões de terceira pessoa adequadas.",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "V18: corrigida a fonte para distinguir horário de início de presença no trabalho; não aceitar apenas 'I work at nine' como prova de início às nove. Exigir duas frases e horários corretos.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "I start work at nine. My sister starts work at ten.",
      "I start at nine. My sister starts at ten.",
      "I begin work at nine. My sister begins work at ten."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A1_plus_to_A2_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "en-bridge-v10-03",
    "language": "en",
    "transition": "A1_to_A2",
    "targetLevel": "A2",
    "skill": "reading_inference",
    "objective": "Combinar eventos e motivo.",
    "stimulusText": "Maya goes to the library on Tuesday. She has her bag, but her notebook is still at home. She goes back home before the class.",
    "taskInstruction": "Com base apenas no texto, explique em Inglês por que Maya volta para casa antes da aula.",
    "illustrativeAnswer": "She goes back because she left her notebook at home.",
    "successEvidence": "Relaciona o retorno ao caderno esquecido; não inventa outros motivos.",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "A finalidade 'to get her notebook' é uma inferência razoável, mas o texto só afirma explicitamente que o caderno está em casa; aceitar ambas.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "Because her notebook is at home.",
      "She returns home to get her notebook."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A1_plus_to_A2_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "en-bridge-v10-04",
    "language": "en",
    "transition": "A1_to_A2",
    "targetLevel": "A2",
    "skill": "listening_script",
    "objective": "Ouvir troca curta sobre horário.",
    "stimulusText": "A: Excuse me, does the bus leave at six? B: No, it leaves at seven.",
    "taskInstruction": "Após escutar uma gravação revisada do diálogo (sem visualizar o roteiro), informe em Inglês a hora correta da saída do ônibus.",
    "illustrativeAnswer": "At seven.",
    "successEvidence": "Identifica seven, não six, após a correção do interlocutor.",
    "rubricPolicy": "not_assessable_until_audio_review",
    "audioStatus": "script_only_no_audio_licensed_or_assessed",
    "teacherReviewNotes": "Não aplicar como Listening sem gravação revisada; respostas podem ser orais ou escritas conforme rubrica específica do piloto.",
    "workflowStatus": "draft_requires_independent_review",
    "public": false,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "At seven.",
      "The bus leaves at seven.",
      "7 o'clock.",
      "7:00."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A1_plus_to_A2_entry",
    "scoringCriteria": [
      "Preserva o significado exigido pelo estímulo.",
      "Forma linguística-alvo correta ou equivalente explicitamente aceita.",
      "Não penalizar pontuação/capitalização irrelevantes ao objetivo."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "en-bridge-v10-05",
    "language": "en",
    "transition": "A1_to_A2",
    "targetLevel": "A2",
    "skill": "grammar_bridge",
    "objective": "Diferenciar rotina de ação atual.",
    "stimulusText": "I work every day. I am working now.",
    "taskInstruction": "Qual das duas frases descreve uma ação que acontece neste momento? Copie essa frase em Inglês.",
    "illustrativeAnswer": "I am working now.",
    "successEvidence": "Seleciona a frase no present continuous associada a now; diferencia rotina de ação atual.",
    "rubricPolicy": "deterministic_candidate_requires_teacher_check",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "Reduzida ambiguidade da instrução anterior, que solicitava explicação sem critério claro.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "I am working now."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A1_plus_to_A2_entry",
    "scoringCriteria": [
      "Preserva o significado exigido pelo estímulo.",
      "Forma linguística-alvo correta ou equivalente explicitamente aceita.",
      "Não penalizar pontuação/capitalização irrelevantes ao objetivo."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "en-bridge-v10-06",
    "language": "en",
    "transition": "A1_to_A2",
    "targetLevel": "A2",
    "skill": "guided_writing",
    "objective": "Organizar encontro por lugar e horário.",
    "stimulusText": "Your friend wants to meet at the library on Friday at six.",
    "taskInstruction": "Escreva uma mensagem curta em Inglês confirmando que você pode encontrar seu amigo na biblioteca na sexta-feira às seis horas.",
    "illustrativeAnswer": "Hi! Yes, I can meet you at the library on Friday at six.",
    "successEvidence": "Confirma o encontro e preserva local (library), dia (Friday) e horário (six).",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "Não exigir saudação ou frase idêntica ao modelo; pontuação e contrações não devem invalidar resposta compreensível.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "Sure! See you at the library on Friday at 6.",
      "Yes, let's meet at the library on Friday at six."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A1_plus_to_A2_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "en-bridge-v10-07",
    "language": "en",
    "transition": "A2_to_B1",
    "targetLevel": "B1",
    "skill": "grammar_bridge",
    "objective": "Contrastar evento datado e experiência.",
    "stimulusText": "I visited Paris in 2023. I have visited Paris.",
    "taskInstruction": "Qual frase informa o ano específico da visita? Copie-a e indique, em uma expressão curta, a informação temporal.",
    "illustrativeAnswer": "I visited Paris in 2023. The specific time is 2023.",
    "successEvidence": "Seleciona past simple datado, reconhecendo 'in 2023' e sem concluir que a outra frase é incorreta.",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "Não apresentar present perfect como sinônimo intercambiável de passado datado; ambas as frases podem ser gramaticais em contextos diferentes.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "I visited Paris in 2023 — in 2023."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A2_plus_to_B1_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "en-bridge-v10-08",
    "language": "en",
    "transition": "A2_to_B1",
    "targetLevel": "B1",
    "skill": "reading_inference",
    "objective": "Relacionar custo, tempo e escolha.",
    "stimulusText": "The train was cancelled. Flights were expensive. We chose a slower bus instead of flying. We arrived before the concert.",
    "taskInstruction": "Qual transporte escolheram, que desvantagem aceitaram e o que aconteceu na chegada? Responda em Inglês sem adicionar razões não declaradas.",
    "illustrativeAnswer": "They chose a slower bus instead of flying, but they arrived before the concert.",
    "successEvidence": "Identifica ônibus, desvantagem de ser mais lento e chegada antes do show; pode citar o custo dos voos como contexto, não como motivação mental comprovada.",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "V10 afirmava que escolheram ônibus para evitar voos caros sem a relação causal estar explícita. Texto V11 diz 'instead of flying', mas não obriga inferir intenção econômica.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "They took a slower bus, and they still arrived before the concert."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A2_plus_to_B1_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "en-bridge-v10-09",
    "language": "en",
    "transition": "A2_to_B1",
    "targetLevel": "B1",
    "skill": "listening_script",
    "objective": "Identificar justificativa em diálogo.",
    "stimulusText": "A: Why didn't you take the plane? B: Tickets were too expensive, so we took the bus and arrived just in time.",
    "taskInstruction": "Depois de escutar um áudio revisado, sem ler o roteiro, explique em Inglês o motivo declarado para não viajar de avião.",
    "illustrativeAnswer": "Plane tickets were too expensive.",
    "successEvidence": "Explicita 'tickets too expensive'; a escolha do ônibus pode ser citada como consequência.",
    "rubricPolicy": "not_assessable_until_audio_review",
    "audioStatus": "script_only_no_audio_licensed_or_assessed",
    "teacherReviewNotes": "Roteiro sem áudio; não usar avaliação auditiva até produção e validação humana da gravação.",
    "workflowStatus": "draft_requires_independent_review",
    "public": false,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "They took the bus because plane tickets were too expensive.",
      "Because the flight tickets cost too much."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A2_plus_to_B1_entry",
    "scoringCriteria": [
      "Preserva o significado exigido pelo estímulo.",
      "Forma linguística-alvo correta ou equivalente explicitamente aceita.",
      "Não penalizar pontuação/capitalização irrelevantes ao objetivo."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "en-bridge-v10-10",
    "language": "en",
    "transition": "A2_to_B1",
    "targetLevel": "B1",
    "skill": "integrated_writing",
    "objective": "Justificar recomendação em mensagem original.",
    "stimulusText": "A friend asks whether to join a reading group. The friend feels nervous about speaking.",
    "taskInstruction": "Responda em Inglês ao amigo em 2 a 4 frases. Recomende participar ou não do grupo de leitura e apresente uma razão concreta relacionada ao receio de falar.",
    "illustrativeAnswer": "I think you should try the group. You can listen first and speak when you feel ready. That may help you feel more confident.",
    "successEvidence": "Toma posição clara, apresenta benefício ou dificuldade concreta, relaciona ao nervosismo e conecta ideias de modo compreensível.",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "Não impor a recomendação positiva; aceitar recomendação negativa fundamentada. Não afirmar que o grupo garante ambiente sem interrupções.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "I would join because practising with others could help you feel less nervous."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A2_plus_to_B1_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "en-bridge-v10-11",
    "language": "en",
    "transition": "A2_to_B1",
    "targetLevel": "B1",
    "skill": "grammar_bridge",
    "objective": "Expressar condição futura realista.",
    "stimulusText": "It might rain tomorrow. We can stay home.",
    "taskInstruction": "Una as duas ideias em uma única frase condicional sobre amanhã, usando if e will. Preserve o sentido de que ficar em casa depende da chuva.",
    "illustrativeAnswer": "If it rains tomorrow, we will stay home.",
    "successEvidence": "If + presente simples; oração principal com will; relação condicional preservada.",
    "rubricPolicy": "deterministic_candidate_requires_teacher_check",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "V18: hipótese meteorológica naturalizada para 'might rain'; a saída deve construir condicional se chover, não afirmar previsão certa.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "We will stay home if it rains tomorrow.",
      "If it rains tomorrow, we'll stay home."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A2_plus_to_B1_entry",
    "scoringCriteria": [
      "Preserva o significado exigido pelo estímulo.",
      "Forma linguística-alvo correta ou equivalente explicitamente aceita.",
      "Não penalizar pontuação/capitalização irrelevantes ao objetivo."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "en-bridge-v10-12",
    "language": "en",
    "transition": "A2_to_B1",
    "targetLevel": "B1",
    "skill": "integrated_writing",
    "objective": "Conectar ação de fundo e evento pontual.",
    "stimulusText": "You were studying at eight. Your friend called then.",
    "taskInstruction": "Em uma frase em Inglês, descreva a ação em andamento às oito e a ligação que ocorreu naquele momento, usando Past Continuous e when.",
    "illustrativeAnswer": "I was studying when my friend called.",
    "successEvidence": "Usa was studying para ação em andamento e called para evento pontual; referência temporal preservada.",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "A ligação coincide com o estudo, mas não se deve exigir inferência de interrupção efetiva da atividade.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "When my friend called, I was studying."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A2_plus_to_B1_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "ru-bridge-v10-01",
    "language": "ru",
    "transition": "A1_to_A2",
    "targetLevel": "A2",
    "skill": "grammar_bridge",
    "objective": "Introduzir presente verbal após pronomes A1.",
    "stimulusText": "Я ___ книгу. (читать)",
    "taskInstruction": "Complete apenas a lacuna em «Я ___ книгу» com a forma do presente de читать para я.",
    "illustrativeAnswer": "читаю",
    "successEvidence": "Conjugação de primeira pessoa singular читаю, sem manter infinitivo.",
    "rubricPolicy": "deterministic_candidate_requires_teacher_check",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "Forma isolada esperada na lacuna; se o produto aceitar frase completa, «Я читаю книгу» também deve ser considerada.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "читаю"
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A1_plus_to_A2_entry",
    "scoringCriteria": [
      "Preserva o significado exigido pelo estímulo.",
      "Forma linguística-alvo correta ou equivalente explicitamente aceita.",
      "Não penalizar pontuação/capitalização irrelevantes ao objetivo."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "ru-bridge-v10-02",
    "language": "ru",
    "transition": "A1_to_A2",
    "targetLevel": "A2",
    "skill": "grammar_bridge",
    "objective": "Negar a ação no presente.",
    "stimulusText": "Я читаю дома.",
    "taskInstruction": "Reescreva «Я читаю дома» em Russo, negando a ação com не e mantendo as demais informações.",
    "illustrativeAnswer": "Я не читаю дома.",
    "successEvidence": "Negação не imediatamente antes de читаю; sujeito e local preservados.",
    "rubricPolicy": "deterministic_candidate_requires_teacher_check",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "Não aceitar «нет» isolado como transformação equivalente da frase.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "Я не читаю дома."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A1_plus_to_A2_entry",
    "scoringCriteria": [
      "Preserva o significado exigido pelo estímulo.",
      "Forma linguística-alvo correta ou equivalente explicitamente aceita.",
      "Não penalizar pontuação/capitalização irrelevantes ao objetivo."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "ru-bridge-v10-03",
    "language": "ru",
    "transition": "A1_to_A2",
    "targetLevel": "A2",
    "skill": "reading_inference",
    "objective": "Encontrar local e rotina em texto curto.",
    "stimulusText": "Это Анна. Она студентка. Каждый день она читает дома после занятий.",
    "taskInstruction": "Um colega afirma: «Анна читает только в библиотеке» (Anna lê apenas na biblioteca). O texto sustenta essa afirmação? Responda em russo, justificando com uma informação do texto.",
    "illustrativeAnswer": "Нет. Анна читает дома после занятий.",
    "successEvidence": "Rejeita a afirmação de que Anna lê apenas na biblioteca, mostrando a evidência de leitura em casa; não concluir que ela nunca frequenta uma biblioteca.",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "V18: atividade antes cobrava apenas localizar 'дома', embora se chamasse reading_inference. Agora exige julgar uma afirmação incompatível com o texto e justificar com evidência; manter inferência limitada à afirmação 'apenas na biblioteca'.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "Нет, она читает дома.",
      "Нет. Анна каждый день читает дома после занятий.",
      "Нет, она читает дома после занятий."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A1_plus_to_A2_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "ru-bridge-v10-04",
    "language": "ru",
    "transition": "A1_to_A2",
    "targetLevel": "A2",
    "skill": "listening_script",
    "objective": "Entender pergunta de localização.",
    "stimulusText": "A: Где библиотека? B: Она рядом с парком. A: Спасибо!",
    "taskInstruction": "Após escutar a gravação revisada (sem ler o roteiro), diga em Russo onde fica a biblioteca.",
    "illustrativeAnswer": "Рядом с парком.",
    "successEvidence": "Localização ao lado/perto do parque, sem substituí-la por localização não mencionada.",
    "rubricPolicy": "not_assessable_until_audio_review",
    "audioStatus": "script_only_no_audio_licensed_or_assessed",
    "teacherReviewNotes": "Sem áudio aprovado, somente roteiro; «рядом с» rege instrumental e merece suporte prévio se ainda não ensinado.",
    "workflowStatus": "draft_requires_independent_review",
    "public": false,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "Рядом с парком.",
      "Библиотека рядом с парком.",
      "Она рядом с парком."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A1_plus_to_A2_entry",
    "scoringCriteria": [
      "Preserva o significado exigido pelo estímulo.",
      "Forma linguística-alvo correta ou equivalente explicitamente aceita.",
      "Não penalizar pontuação/capitalização irrelevantes ao objetivo."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "ru-bridge-v10-05",
    "language": "ru",
    "transition": "A1_to_A2",
    "targetLevel": "A2",
    "skill": "grammar_bridge",
    "objective": "Concordar possessivo com gênero do objeto.",
    "stimulusText": "___ стол, ___ сумка, ___ окно (meu/minha)",
    "taskInstruction": "Complete com o possessivo de primeira pessoa singular que concorda com cada substantivo: ___ стол, ___ сумка, ___ окно. Escreva as três expressões completas na ordem.",
    "illustrativeAnswer": "мой стол, моя сумка, моё окно",
    "successEvidence": "Concordância masculino мой, feminino моя, neutro моё/мое, na ordem solicitada.",
    "rubricPolicy": "deterministic_candidate_requires_teacher_check",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "Aceitar «мое» sem trema em escrita comum; preservar «моё» como forma recomendada, sem tornar ё obrigatória na avaliação.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "мой стол, моя сумка, мое окно"
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A1_plus_to_A2_entry",
    "scoringCriteria": [
      "Preserva o significado exigido pelo estímulo.",
      "Forma linguística-alvo correta ou equivalente explicitamente aceita.",
      "Não penalizar pontuação/capitalização irrelevantes ao objetivo."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "ru-bridge-v10-06",
    "language": "ru",
    "transition": "A1_to_A2",
    "targetLevel": "A2",
    "skill": "guided_writing",
    "objective": "Combinar apresentação e pergunta cotidiana.",
    "stimulusText": "Вы хотите узнать, где находится школа. Представьтесь, используя вымышленное имя.",
    "taskInstruction": "Escreva em russo uma saudação educada, uma apresentação com um nome fictício de sua escolha e uma pergunta natural sobre a localização da escola.",
    "illustrativeAnswer": "Здравствуйте! Меня зовут Анна. Где находится школа?",
    "successEvidence": "Contém saudação adequada, apresentação com nome fictício livre e pergunta compreensível sobre a escola; não coletar nome real.",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "V18: atividade não deve exigir nome real nem incentivar coleta de dados pessoais. Aceitar nomes fictícios quaisquer, com saudação educada e pergunta compreensível.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "Здравствуйте! Меня зовут Иван. Где школа?",
      "Добрый день! Я Мария. Где находится школа?"
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A1_plus_to_A2_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "ru-bridge-v10-07",
    "language": "ru",
    "transition": "A2_to_B1",
    "targetLevel": "B1",
    "skill": "grammar_bridge",
    "objective": "Introduzir ausência com genitivo após нет.",
    "stimulusText": "У меня нет ___ . (время)",
    "taskInstruction": "Complete somente a lacuna em «У меня нет ___» com a forma correta de время.",
    "illustrativeAnswer": "времени",
    "successEvidence": "Genitivo времени após нет, sem exigir conhecimento de todos os paradigmas de -мя.",
    "rubricPolicy": "deterministic_candidate_requires_teacher_check",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "Caso específico introduzido com apoio; não transformar item isolado em prova de domínio integral do genitivo.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "времени"
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A2_plus_to_B1_entry",
    "scoringCriteria": [
      "Preserva o significado exigido pelo estímulo.",
      "Forma linguística-alvo correta ou equivalente explicitamente aceita.",
      "Não penalizar pontuação/capitalização irrelevantes ao objetivo."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "ru-bridge-v10-08",
    "language": "ru",
    "transition": "A2_to_B1",
    "targetLevel": "B1",
    "skill": "grammar_bridge",
    "objective": "Reconhecer destinatário no dativo.",
    "stimulusText": "Я звоню другу. Мне холодно.",
    "taskInstruction": "Nas frases «Я звоню другу. Мне холодно.», explique em português para quem ocorre a ligação e quem sente frio.",
    "illustrativeAnswer": "Eu ligo para um amigo; eu sinto frio.",
    "successEvidence": "Reconhece другу como pessoa a quem se telefona e мне como experienciador da sensação de frio.",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "Evitar interpretar звоню como ligação recebida pelo amigo já concluída; não exigir acentos marcados nem identificar gênero do interlocutor com precisão maior do que o enunciado permite.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "A ligação é para o amigo, e quem sente frio sou eu.",
      "Eu telefono para um amigo e estou com frio."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A2_plus_to_B1_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "ru-bridge-v10-09",
    "language": "ru",
    "transition": "A2_to_B1",
    "targetLevel": "B1",
    "skill": "grammar_bridge",
    "objective": "Reconhecer instrumental com companhia e função.",
    "stimulusText": "Она работает врачом. Я иду с сестрой.",
    "taskInstruction": "Nas frases «Она работает врачом. Я иду с сестрой.», identifique em português a profissão da primeira pessoa mencionada e quem acompanha o falante na segunda frase.",
    "illustrativeAnswer": "Ela trabalha como médica; eu vou com uma irmã.",
    "successEvidence": "Identifica врачом como profissão e с сестрой como companhia, sem assumir de quem é a irmã.",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "«С сестрой» não define a relação de posse; a resposta-modelo V10 sugeria 'a irmã' sem precisar posse. Aceitar médica como tradução contextual de врач.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "Ela é médica e eu vou com a irmã.",
      "Ela trabalha como médica e vou acompanhado de uma irmã."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A2_plus_to_B1_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "ru-bridge-v10-10",
    "language": "ru",
    "transition": "A2_to_B1",
    "targetLevel": "B1",
    "skill": "reading_inference",
    "objective": "Diferenciar processo e resultado no passado.",
    "stimulusText": "Вчера я читал книгу весь вечер. Потом я её прочитал.",
    "taskInstruction": "A partir das duas frases, explique em Russo qual ação se prolongou durante a noite e qual foi concluída depois. Não indique horário exato.",
    "illustrativeAnswer": "Сначала я читал книгу весь вечер, а потом прочитал её.",
    "successEvidence": "Distingue читал (processo/duração) de прочитал (resultado/conclusão), mantendo ordem temporal.",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "É interpretação contextual do aspecto com marcador de duração e потом; evitar simplificação de que todo imperfeito significa 'não concluído'.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "Я читал книгу, потом прочитал её.",
      "Я читал весь вечер, а потом закончил читать книгу."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A2_plus_to_B1_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "ru-bridge-v10-11",
    "language": "ru",
    "transition": "A2_to_B1",
    "targetLevel": "B1",
    "skill": "listening_script",
    "objective": "Distinguir deslocamento agora e habitual.",
    "stimulusText": "A: Куда ты идёшь сейчас? B: Сейчас я иду домой, но каждый день хожу в школу.",
    "taskInstruction": "Após ouvir uma gravação revisada sem visualizar o diálogo, responda em Russo: aonde o falante está indo agora e qual deslocamento faz habitualmente?",
    "illustrativeAnswer": "Сейчас говорящий идёт домой, а каждый день ходит в школу.",
    "successEvidence": "Distingue deslocamento atual para casa e trajeto habitual à escola; flexão e referência ao falante coerentes.",
    "rubricPolicy": "not_assessable_until_audio_review",
    "audioStatus": "script_only_no_audio_licensed_or_assessed",
    "teacherReviewNotes": "Diálogo original não revela gênero de B: não impor он; aceitar ela, ele ou primeira pessoa com concordância. Somente roteiro até validação de áudio.",
    "workflowStatus": "draft_requires_independent_review",
    "public": false,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "Сейчас он идёт домой, а каждый день ходит в школу.",
      "Сейчас она идёт домой, а каждый день ходит в школу.",
      "Сейчас я иду домой, а каждый день хожу в школу."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A2_plus_to_B1_entry",
    "scoringCriteria": [
      "Preserva o significado exigido pelo estímulo.",
      "Forma linguística-alvo correta ou equivalente explicitamente aceita.",
      "Não penalizar pontuação/capitalização irrelevantes ao objetivo."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  },
  {
    "draftId": "ru-bridge-v10-12",
    "language": "ru",
    "transition": "A2_to_B1",
    "targetLevel": "B1",
    "skill": "integrated_writing",
    "objective": "Justificar mudança de viagem com texto ligado.",
    "stimulusText": "Поезд отменили. Билеты на самолёт дорогие. Автобус отправляется сегодня, и на нём можно приехать до начала встречи.",
    "taskInstruction": "Escreva em Russo uma mensagem de 2 a 4 frases a um amigo: explique por que o plano de trem mudou, proponha o ônibus e mencione a possibilidade de chegar antes do encontro. Não apresente a chegada como garantida.",
    "illustrativeAnswer": "Наш поезд отменили. Предлагаю поехать на автобусе, потому что билеты на самолёт дорогие. На автобусе можно приехать до начала встречи.",
    "successEvidence": "Menciona cancelamento do trem, plano de ônibus, custos dos voos e possibilidade de chegada; mensagem conectada e inteligível.",
    "rubricPolicy": "human_scored_or_uncertain",
    "audioStatus": "not_applicable",
    "teacherReviewNotes": "V10 exigia chegar a tempo sem qualquer informação que sustentasse a possibilidade. Estímulo ajustado para declarar essa possibilidade; não exigir certeza de chegada.",
    "workflowStatus": "draft_requires_independent_review",
    "public": true,
    "existingCatalogExercise": false,
    "acceptedAnswerExamples": [
      "Поезд отменили, поэтому предлагаю автобус. Билеты на самолёт дорогие, а на автобусе можно успеть к встрече."
    ],
    "reviewVersion": "v11",
    "difficultyBand": "A2_plus_to_B1_entry",
    "scoringCriteria": [
      "Responde à tarefa sem inventar fatos.",
      "Preserva as informações centrais do estímulo.",
      "Produção compreensível e adequada ao nível; aceitar variantes equivalentes."
    ],
    "reviewStatus": "editorial_reviewed_requires_independent_teacher_validation"
  }
] as BridgeTaskV11[];

export function bridgeDraftsForLanguage(language:Language):readonly BridgeTaskV11[]{
  return bridgeV11Drafts.filter(task=>task.language===language);
}
