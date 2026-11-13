/** V17 – internal, non-certifying, proposal from PR #122 (owner approval pending).
 * 30 stage scenarios, 6 level checkpoints, 7 competencies. The 474 legacy
 * exercise IDs remain unchanged. Do NOT assign CEFR levels using this data.
 * No draft item is publicly released, assessed or persisted.
 */
import type {Language} from './model';
export type CurriculumLevelV17='A1'|'A2'|'B1';
export type CompetencyV17='written_reception'|'written_production'|'spoken_reception'|'spoken_production'|'interaction'|'contextual_recognition'|'retention_transfer';
export interface StageScenarioV17 {
 id:string;nodeId:string;language:Language;sequence:number;level:CurriculumLevelV17;
 canDoTarget:string;legacyStudyQuestionIds:string[];independentScenarioPt:string;
 essentialCriteriaPt:string[];evidenceCategory:CompetencyV17;public:false;
}
export interface LevelCheckpointV17 {
 id:string;language:Language;level:CurriculumLevelV17;afterStageNodeId:string;objectivePt:string;
 tasks:{kind:CompetencyV17;promptPt:string}[];
 spokenReceptionStatus:string;spokenProductionStatus:string;interactionStatus:string;public:false;
}
export interface CompetencyGuideV17 {
 id:CompetencyV17;source:string;invalidIf:string;
}
export const v17Scenarios:readonly StageScenarioV17[]=[
  {
    "id": "en-progress-v17-01",
    "nodeId": "en-path-01",
    "language": "en",
    "sequence": 1,
    "level": "A1",
    "canDoTarget": "Apresentar-se com am/is/are.",
    "legacyStudyQuestionIds": [
      "en-grammar-01-q1",
      "en-grammar-01-q2",
      "en-grammar-01-q3",
      "en-reading-01-q1",
      "en-reading-01-q2",
      "en-reading-01-q3"
    ],
    "independentScenarioPt": "Apresente três dados de uma pessoa fictícia: identidade, local e estado.",
    "essentialCriteriaPt": [
      "Usa am/is/are apropriadamente.",
      "Informações coerentes em cenário novo."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-02",
    "nodeId": "en-path-02",
    "language": "en",
    "sequence": 2,
    "level": "A1",
    "canDoTarget": "Retomar pessoas e objetos com pronomes de sujeito.",
    "legacyStudyQuestionIds": [
      "en-grammar-02-q1",
      "en-grammar-02-q2",
      "en-grammar-02-q3",
      "en-reading-02-q1",
      "en-reading-02-q2",
      "en-reading-02-q3"
    ],
    "independentScenarioPt": "Reescreva um diálogo novo substituindo dois referentes por pronomes de sujeito.",
    "essentialCriteriaPt": [
      "Pronomes combinam com os referentes.",
      "Referências permanecem claras."
    ],
    "evidenceCategory": "contextual_recognition",
    "public": false
  },
  {
    "id": "en-progress-v17-03",
    "nodeId": "en-path-03",
    "language": "en",
    "sequence": 3,
    "level": "A1",
    "canDoTarget": "Usar a/an e the com referência clara.",
    "legacyStudyQuestionIds": [
      "en-grammar-03-q1",
      "en-grammar-03-q2",
      "en-grammar-03-q3",
      "en-reading-03-q1",
      "en-reading-03-q2",
      "en-reading-03-q3"
    ],
    "independentScenarioPt": "Apresente um objeto novo e retome-o em outra frase usando artigos.",
    "essentialCriteriaPt": [
      "Distingue primeira menção e retomada.",
      "Usa a/an e the quando cabíveis."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-04",
    "nodeId": "en-path-04",
    "language": "en",
    "sequence": 4,
    "level": "A1",
    "canDoTarget": "Falar sobre rotina e terceiro sujeito no presente simples.",
    "legacyStudyQuestionIds": [
      "en-grammar-04-q1",
      "en-grammar-04-q2",
      "en-grammar-04-q3",
      "en-reading-04-q1",
      "en-reading-04-q2",
      "en-reading-04-q3"
    ],
    "independentScenarioPt": "Descreva sua rotina e a rotina de um colega fictício.",
    "essentialCriteriaPt": [
      "Presente simples para hábitos.",
      "Terceira pessoa corretamente expressa."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-05",
    "nodeId": "en-path-05",
    "language": "en",
    "sequence": 5,
    "level": "A2",
    "canDoTarget": "Perguntar e negar hábitos com do/does.",
    "legacyStudyQuestionIds": [
      "en-grammar-05-q1",
      "en-grammar-05-q2",
      "en-grammar-05-q3",
      "en-reading-05-q1",
      "en-reading-05-q2",
      "en-reading-05-q3"
    ],
    "independentScenarioPt": "Pergunte sobre hábito de uma personagem e dê resposta negativa.",
    "essentialCriteriaPt": [
      "Usa do/does com forma base.",
      "Negação preserva o sentido e a pessoa."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-06",
    "nodeId": "en-path-06",
    "language": "en",
    "sequence": 6,
    "level": "A2",
    "canDoTarget": "Expressar posse em contexto familiar.",
    "legacyStudyQuestionIds": [
      "en-grammar-06-q1",
      "en-grammar-06-q2",
      "en-grammar-06-q3",
      "en-reading-06-q1",
      "en-reading-06-q2",
      "en-reading-06-q3"
    ],
    "independentScenarioPt": "Explique a quem pertencem três objetos em cenário novo.",
    "essentialCriteriaPt": [
      "Possessivos coerentes com o possuidor.",
      "Objetos e pessoas não se confundem."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-07",
    "nodeId": "en-path-07",
    "language": "en",
    "sequence": 7,
    "level": "A2",
    "canDoTarget": "Informar localização, dia e horário de encontro.",
    "legacyStudyQuestionIds": [
      "en-grammar-07-q1",
      "en-grammar-07-q2",
      "en-grammar-07-q3",
      "en-reading-07-q1",
      "en-reading-07-q2",
      "en-reading-07-q3"
    ],
    "independentScenarioPt": "Envie convite com dia, horário e localização inéditos.",
    "essentialCriteriaPt": [
      "Dia e horário claros.",
      "Preposições de tempo e lugar adequadas."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-08",
    "nodeId": "en-path-08",
    "language": "en",
    "sequence": 8,
    "level": "A2",
    "canDoTarget": "Descrever existência e quantidade de itens.",
    "legacyStudyQuestionIds": [
      "en-grammar-08-q1",
      "en-grammar-08-q2",
      "en-grammar-08-q3",
      "en-reading-08-q1",
      "en-reading-08-q2",
      "en-reading-08-q3"
    ],
    "independentScenarioPt": "Descreva uma sala fictícia com quantidades diferentes.",
    "essentialCriteriaPt": [
      "Distingue there is/there are.",
      "Quantidade de itens preservada."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-09",
    "nodeId": "en-path-09",
    "language": "en",
    "sequence": 9,
    "level": "A2",
    "canDoTarget": "Distinguir rotina e ação em andamento.",
    "legacyStudyQuestionIds": [
      "en-grammar-09-q1",
      "en-grammar-09-q2",
      "en-grammar-09-q3",
      "en-reading-09-q1",
      "en-reading-09-q2",
      "en-reading-09-q3"
    ],
    "independentScenarioPt": "Compare o que alguém faz normalmente com o que faz agora.",
    "essentialCriteriaPt": [
      "Hábito expresso no presente simples.",
      "Ação atual no present continuous."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-10",
    "nodeId": "en-path-10",
    "language": "en",
    "sequence": 10,
    "level": "A2",
    "canDoTarget": "Relatar uma ação encerrada e negativa no passado.",
    "legacyStudyQuestionIds": [
      "en-grammar-10-q1",
      "en-grammar-10-q2",
      "en-grammar-10-q3",
      "en-reading-10-q1",
      "en-reading-10-q2",
      "en-reading-10-q3"
    ],
    "independentScenarioPt": "Conte o que aconteceu ontem e o que não aconteceu.",
    "essentialCriteriaPt": [
      "Passado simples para ação fechada.",
      "Did not com verbo base."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-11",
    "nodeId": "en-path-11",
    "language": "en",
    "sequence": 11,
    "level": "B1",
    "canDoTarget": "Distinguir experiência de evento datado.",
    "legacyStudyQuestionIds": [
      "en-v2-grammar-001-q1",
      "en-v2-grammar-001-q2",
      "en-v2-grammar-001-q3",
      "en-v2-reading-001-q1",
      "en-v2-reading-001-q2",
      "en-v2-reading-001-q3"
    ],
    "independentScenarioPt": "Relate experiência de viagem e outro evento com data específica.",
    "essentialCriteriaPt": [
      "Present perfect para experiência.",
      "Past simple para evento datado."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-12",
    "nodeId": "en-path-12",
    "language": "en",
    "sequence": 12,
    "level": "B1",
    "canDoTarget": "Expressar condição futura plausível.",
    "legacyStudyQuestionIds": [
      "en-v2-grammar-002-q1",
      "en-v2-grammar-002-q2",
      "en-v2-grammar-002-q3",
      "en-v2-reading-002-q1",
      "en-v2-reading-002-q2",
      "en-v2-reading-002-q3"
    ],
    "independentScenarioPt": "Diante de previsão de chuva, proponha plano com condição e resultado.",
    "essentialCriteriaPt": [
      "Condição plausível com if.",
      "Resultado sem garantir ocorrência da condição."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-13",
    "nodeId": "en-path-13",
    "language": "en",
    "sequence": 13,
    "level": "B1",
    "canDoTarget": "Focalizar resultado por voz passiva.",
    "legacyStudyQuestionIds": [
      "en-v2-grammar-003-q1",
      "en-v2-grammar-003-q2",
      "en-v2-grammar-003-q3",
      "en-v2-reading-003-q1",
      "en-v2-reading-003-q2",
      "en-v2-reading-003-q3"
    ],
    "independentScenarioPt": "Explique o resultado de um reparo usando voz passiva.",
    "essentialCriteriaPt": [
      "Voz passiva com tempo coerente.",
      "Foco no resultado sem alterar evento."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-14",
    "nodeId": "en-path-14",
    "language": "en",
    "sequence": 14,
    "level": "B1",
    "canDoTarget": "Conectar informações usando relativas.",
    "legacyStudyQuestionIds": [
      "en-v2-grammar-004-q1",
      "en-v2-grammar-004-q2",
      "en-v2-grammar-004-q3",
      "en-v2-reading-004-q1",
      "en-v2-reading-004-q2",
      "en-v2-reading-004-q3"
    ],
    "independentScenarioPt": "Identifique uma pessoa e uma ferramenta em duas orações relativas.",
    "essentialCriteriaPt": [
      "Relativas conectam informações.",
      "Referentes inequívocos."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "en-progress-v17-15",
    "nodeId": "en-path-15",
    "language": "en",
    "sequence": 15,
    "level": "B1",
    "canDoTarget": "Relatar evento no passado com ação de fundo.",
    "legacyStudyQuestionIds": [
      "en-v2-grammar-005-q1",
      "en-v2-grammar-005-q2",
      "en-v2-grammar-005-q3",
      "en-v2-reading-005-q1",
      "en-v2-reading-005-q2",
      "en-v2-reading-005-q3"
    ],
    "independentScenarioPt": "Conte uma ação em curso interrompida por outra e sua consequência.",
    "essentialCriteriaPt": [
      "Past continuous para cenário em curso.",
      "Past simple para evento pontual."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-01",
    "nodeId": "ru-path-01",
    "language": "ru",
    "sequence": 1,
    "level": "A1",
    "canDoTarget": "Ler cirílico, incluindo pares visuais e ё.",
    "legacyStudyQuestionIds": [
      "ru-grammar-01-q1",
      "ru-grammar-01-q2",
      "ru-grammar-01-q3",
      "ru-reading-01-q1",
      "ru-reading-01-q2",
      "ru-reading-01-q3"
    ],
    "independentScenarioPt": "Leia bilhete curto em cirílico e transcreva duas palavras com letras distintas.",
    "essentialCriteriaPt": [
      "Reconhece grafia cirílica no contexto.",
      "Não confunde ё e е na cópia apresentada."
    ],
    "evidenceCategory": "written_reception",
    "public": false
  },
  {
    "id": "ru-progress-v17-02",
    "nodeId": "ru-path-02",
    "language": "ru",
    "sequence": 2,
    "level": "A1",
    "canDoTarget": "Apresentar-se com pronomes em frases simples.",
    "legacyStudyQuestionIds": [
      "ru-grammar-02-q1",
      "ru-grammar-02-q2",
      "ru-grammar-02-q3",
      "ru-reading-02-q1",
      "ru-reading-02-q2",
      "ru-reading-02-q3"
    ],
    "independentScenarioPt": "Apresente duas pessoas fictícias em frases nominais simples.",
    "essentialCriteriaPt": [
      "Pronomes e referentes adequados.",
      "Não exige cópula presente indevida."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-03",
    "nodeId": "ru-path-03",
    "language": "ru",
    "sequence": 3,
    "level": "A1",
    "canDoTarget": "Reconhecer gênero de substantivos e exceções.",
    "legacyStudyQuestionIds": [
      "ru-grammar-03-q1",
      "ru-grammar-03-q2",
      "ru-grammar-03-q3",
      "ru-reading-03-q1",
      "ru-reading-03-q2",
      "ru-reading-03-q3"
    ],
    "independentScenarioPt": "Classifique o gênero de objetos incluindo palavra terminada em -ь.",
    "essentialCriteriaPt": [
      "Gênero dos termos propostos correto.",
      "Não assume gênero universal em -ь."
    ],
    "evidenceCategory": "contextual_recognition",
    "public": false
  },
  {
    "id": "ru-progress-v17-04",
    "nodeId": "ru-path-04",
    "language": "ru",
    "sequence": 4,
    "level": "A1",
    "canDoTarget": "Formar plurais frequentes.",
    "legacyStudyQuestionIds": [
      "ru-grammar-04-q1",
      "ru-grammar-04-q2",
      "ru-grammar-04-q3",
      "ru-reading-04-q1",
      "ru-reading-04-q2",
      "ru-reading-04-q3"
    ],
    "independentScenarioPt": "Transforme nomes comuns de materiais escolares em plural.",
    "essentialCriteriaPt": [
      "Plurais frequentes corretos.",
      "Respeita exceções ensinadas."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-05",
    "nodeId": "ru-path-05",
    "language": "ru",
    "sequence": 5,
    "level": "A2",
    "canDoTarget": "Concordar possessivos com o objeto.",
    "legacyStudyQuestionIds": [
      "ru-grammar-05-q1",
      "ru-grammar-05-q2",
      "ru-grammar-05-q3",
      "ru-reading-05-q1",
      "ru-reading-05-q2",
      "ru-reading-05-q3"
    ],
    "independentScenarioPt": "Escreva três avisos de pertences usando formas de мой.",
    "essentialCriteriaPt": [
      "Concordância de possessivo e substantivo.",
      "Referência a cada objeto clara."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-06",
    "nodeId": "ru-path-06",
    "language": "ru",
    "sequence": 6,
    "level": "A2",
    "canDoTarget": "Conjugar verbo de ação no presente.",
    "legacyStudyQuestionIds": [
      "ru-grammar-06-q1",
      "ru-grammar-06-q2",
      "ru-grammar-06-q3",
      "ru-reading-06-q1",
      "ru-reading-06-q2",
      "ru-reading-06-q3"
    ],
    "independentScenarioPt": "Descreva ações atuais de três pessoas fictícias.",
    "essentialCriteriaPt": [
      "Conjugação de presente adequada.",
      "Ações associadas aos sujeitos certos."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-07",
    "nodeId": "ru-path-07",
    "language": "ru",
    "sequence": 7,
    "level": "A2",
    "canDoTarget": "Negar ação e responder não.",
    "legacyStudyQuestionIds": [
      "ru-grammar-07-q1",
      "ru-grammar-07-q2",
      "ru-grammar-07-q3",
      "ru-reading-07-q1",
      "ru-reading-07-q2",
      "ru-reading-07-q3"
    ],
    "independentScenarioPt": "Responda negativamente a duas perguntas de rotina.",
    "essentialCriteriaPt": [
      "Distingue не com verbo e нет na resposta.",
      "Não exige genitivo B1 como condição."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-08",
    "nodeId": "ru-path-08",
    "language": "ru",
    "sequence": 8,
    "level": "A2",
    "canDoTarget": "Fazer perguntas simples de pessoas, lugar e tempo.",
    "legacyStudyQuestionIds": [
      "ru-grammar-08-q1",
      "ru-grammar-08-q2",
      "ru-grammar-08-q3",
      "ru-reading-08-q1",
      "ru-reading-08-q2",
      "ru-reading-08-q3"
    ],
    "independentScenarioPt": "Pergunte quem vem, onde será a reunião e quando começa.",
    "essentialCriteriaPt": [
      "Perguntas de pessoa/lugar/tempo distintas.",
      "Formulação inteligível em cirílico."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-09",
    "nodeId": "ru-path-09",
    "language": "ru",
    "sequence": 9,
    "level": "A2",
    "canDoTarget": "Distinguir sujeito de objeto no acusativo inicial.",
    "legacyStudyQuestionIds": [
      "ru-grammar-09-q1",
      "ru-grammar-09-q2",
      "ru-grammar-09-q3",
      "ru-reading-09-q1",
      "ru-reading-09-q2",
      "ru-reading-09-q3"
    ],
    "independentScenarioPt": "Diga quem compra e o que compra numa loja fictícia.",
    "essentialCriteriaPt": [
      "Distingue sujeito de objeto.",
      "Acusativo inicial adequado nos substantivos selecionados."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-10",
    "nodeId": "ru-path-10",
    "language": "ru",
    "sequence": 10,
    "level": "A2",
    "canDoTarget": "Concordar números um, dois e cinco com nomes.",
    "legacyStudyQuestionIds": [
      "ru-grammar-10-q1",
      "ru-grammar-10-q2",
      "ru-grammar-10-q3",
      "ru-reading-10-q1",
      "ru-reading-10-q2",
      "ru-reading-10-q3"
    ],
    "independentScenarioPt": "Peça uma, duas e cinco unidades de objetos com numeral.",
    "essentialCriteriaPt": [
      "Quantidades expressas corretamente.",
      "Concordância dos substantivos no contexto."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-11",
    "nodeId": "ru-path-11",
    "language": "ru",
    "sequence": 11,
    "level": "B1",
    "canDoTarget": "Contrastar processo e resultado por aspecto.",
    "legacyStudyQuestionIds": [
      "ru-v2-grammar-001-q1",
      "ru-v2-grammar-001-q2",
      "ru-v2-grammar-001-q3",
      "ru-v2-reading-001-q1",
      "ru-v2-reading-001-q2",
      "ru-v2-reading-001-q3"
    ],
    "independentScenarioPt": "Relate o processo e a conclusão de uma tarefa.",
    "essentialCriteriaPt": [
      "Aspecto imperfectivo para processo.",
      "Perfectivo para conclusão pertinente."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-12",
    "nodeId": "ru-path-12",
    "language": "ru",
    "sequence": 12,
    "level": "B1",
    "canDoTarget": "Usar genitivo após нет e para indicar posse.",
    "legacyStudyQuestionIds": [
      "ru-v2-grammar-002-q1",
      "ru-v2-grammar-002-q2",
      "ru-v2-grammar-002-q3",
      "ru-v2-reading-002-q1",
      "ru-v2-reading-002-q2",
      "ru-v2-reading-002-q3"
    ],
    "independentScenarioPt": "Diga que não há um objeto e a quem pertence outro.",
    "essentialCriteriaPt": [
      "Genitivo após ausência onde exigido.",
      "Sentido de posse não confundido."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-13",
    "nodeId": "ru-path-13",
    "language": "ru",
    "sequence": 13,
    "level": "B1",
    "canDoTarget": "Marcar destinatário e sensação no dativo.",
    "legacyStudyQuestionIds": [
      "ru-v2-grammar-003-q1",
      "ru-v2-grammar-003-q2",
      "ru-v2-grammar-003-q3",
      "ru-v2-reading-003-q1",
      "ru-v2-reading-003-q2",
      "ru-v2-reading-003-q3"
    ],
    "independentScenarioPt": "Envie mensagem a um conhecido mencionando destinatário e sensação.",
    "essentialCriteriaPt": [
      "Dativo do destinatário adequado.",
      "Expressão de sensação clara."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-14",
    "nodeId": "ru-path-14",
    "language": "ru",
    "sequence": 14,
    "level": "B1",
    "canDoTarget": "Usar instrumental para companhia e função.",
    "legacyStudyQuestionIds": [
      "ru-v2-grammar-004-q1",
      "ru-v2-grammar-004-q2",
      "ru-v2-grammar-004-q3",
      "ru-v2-reading-004-q1",
      "ru-v2-reading-004-q2",
      "ru-v2-reading-004-q3"
    ],
    "independentScenarioPt": "Descreva profissão de uma pessoa e companhia em atividade.",
    "essentialCriteriaPt": [
      "Instrumental para profissão.",
      "С com forma de companhia apropriada."
    ],
    "evidenceCategory": "written_production",
    "public": false
  },
  {
    "id": "ru-progress-v17-15",
    "nodeId": "ru-path-15",
    "language": "ru",
    "sequence": 15,
    "level": "B1",
    "canDoTarget": "Contrastar caminho atual, habitual e por transporte.",
    "legacyStudyQuestionIds": [
      "ru-v2-grammar-005-q1",
      "ru-v2-grammar-005-q2",
      "ru-v2-grammar-005-q3",
      "ru-v2-reading-005-q1",
      "ru-v2-reading-005-q2",
      "ru-v2-reading-005-q3"
    ],
    "independentScenarioPt": "Compare deslocamento habitual por transporte e deslocamento atual.",
    "essentialCriteriaPt": [
      "Movimento habitual e atual diferenciados.",
      "Meio e contexto coerentes."
    ],
    "evidenceCategory": "written_production",
    "public": false
  }
] as StageScenarioV17[];
export const v17Checkpoints:readonly LevelCheckpointV17[]=[
  {
    "id": "en-checkpoint-v17-a1",
    "language": "en",
    "level": "A1",
    "afterStageNodeId": "en-path-04",
    "objectivePt": "Compreender informação imediata em bilhete curto; produzir apresentação e rotina muito simples.",
    "tasks": [
      {
        "kind": "written_reception",
        "promptPt": "Ler texto inédito e localizar pessoa, lugar e ação."
      },
      {
        "kind": "written_production",
        "promptPt": "Escrever 3 frases sobre pessoa e rotina fictícia sem modelo."
      },
      {
        "kind": "retention_transfer",
        "promptPt": "Aplicar mesmas estruturas em situação com referentes trocados."
      }
    ],
    "spokenReceptionStatus": "not_assessed_until_validated_recording",
    "spokenProductionStatus": "not_assessed_in_current_product",
    "interactionStatus": "not_assessed_in_current_product",
    "public": false
  },
  {
    "id": "en-checkpoint-v17-a2",
    "language": "en",
    "level": "A2",
    "afterStageNodeId": "en-path-10",
    "objectivePt": "Compreender mensagens práticas e comunicar planos com local, horário e razão simples.",
    "tasks": [
      {
        "kind": "written_reception",
        "promptPt": "Interpretar atualização de horário/local e motivo num diálogo escrito inédito."
      },
      {
        "kind": "written_production",
        "promptPt": "Escrever recado de 3–5 frases, com resposta a mudança de plano."
      },
      {
        "kind": "retention_transfer",
        "promptPt": "Resolver nova situação cotidiana sem copiar texto anterior."
      }
    ],
    "spokenReceptionStatus": "not_assessed_until_validated_recording",
    "spokenProductionStatus": "not_assessed_in_current_product",
    "interactionStatus": "not_assessed_in_current_product",
    "public": false
  },
  {
    "id": "en-checkpoint-v17-b1",
    "language": "en",
    "level": "B1",
    "afterStageNodeId": "en-path-15",
    "objectivePt": "Relacionar ideias principais e ressalvas em texto familiar; justificar decisão em escrita conectada.",
    "tasks": [
      {
        "kind": "written_reception",
        "promptPt": "Interpretar texto inédito: intenção, decisão, evidência e limite factual."
      },
      {
        "kind": "written_production",
        "promptPt": "Escrever mensagem conectada com problema, opção, justificativa e consequência."
      },
      {
        "kind": "retention_transfer",
        "promptPt": "Transferir solução a cenário diferente com incerteza explícita."
      }
    ],
    "spokenReceptionStatus": "not_assessed_until_validated_recording",
    "spokenProductionStatus": "not_assessed_in_current_product",
    "interactionStatus": "not_assessed_in_current_product",
    "public": false
  },
  {
    "id": "ru-checkpoint-v17-a1",
    "language": "ru",
    "level": "A1",
    "afterStageNodeId": "ru-path-04",
    "objectivePt": "Reconhecer cirílico básico e mensagens imediatas; produzir frases nominais inteligíveis.",
    "tasks": [
      {
        "kind": "written_reception",
        "promptPt": "Ler bilhete inédito em cirílico e identificar pessoa, local e objeto."
      },
      {
        "kind": "written_production",
        "promptPt": "Apresentar 2 pessoas e objetos em frases simples, sem cópula artificial."
      },
      {
        "kind": "retention_transfer",
        "promptPt": "Aplicar gênero e plural a objetos inéditos do mesmo repertório."
      }
    ],
    "spokenReceptionStatus": "not_assessed_until_validated_recording",
    "spokenProductionStatus": "not_assessed_in_current_product",
    "interactionStatus": "not_assessed_in_current_product",
    "public": false
  },
  {
    "id": "ru-checkpoint-v17-a2",
    "language": "ru",
    "level": "A2",
    "afterStageNodeId": "ru-path-10",
    "objectivePt": "Entender e produzir mensagens curtas sobre rotina, perguntas, hora e objetos.",
    "tasks": [
      {
        "kind": "written_reception",
        "promptPt": "Interpretar aviso novo de localização/horário, sem exigir casos B1."
      },
      {
        "kind": "written_production",
        "promptPt": "Escrever mensagem em cirílico pedindo local e hora, indicando quantidades."
      },
      {
        "kind": "retention_transfer",
        "promptPt": "Adaptar a mensagem após mudança simples no plano sem modelo."
      }
    ],
    "spokenReceptionStatus": "not_assessed_until_validated_recording",
    "spokenProductionStatus": "not_assessed_in_current_product",
    "interactionStatus": "not_assessed_in_current_product",
    "public": false
  },
  {
    "id": "ru-checkpoint-v17-b1",
    "language": "ru",
    "level": "B1",
    "afterStageNodeId": "ru-path-15",
    "objectivePt": "Relacionar causas e limitações de texto novo e justificar decisão com estruturas contextualizadas.",
    "tasks": [
      {
        "kind": "written_reception",
        "promptPt": "Interpretar texto inédito separando razão, decisão e ressalva."
      },
      {
        "kind": "written_production",
        "promptPt": "Escrever relato breve e conectado, com aspecto/caso/movimento pertinentes."
      },
      {
        "kind": "retention_transfer",
        "promptPt": "Transferir decisão para situação nova sem inventar desfecho ou garantia."
      }
    ],
    "spokenReceptionStatus": "not_assessed_until_validated_recording",
    "spokenProductionStatus": "not_assessed_in_current_product",
    "interactionStatus": "not_assessed_in_current_product",
    "public": false
  }
] as LevelCheckpointV17[];
export const v17Competencies:readonly CompetencyGuideV17[]=[
  {
    "id": "written_reception",
    "source": "new unseen text, meaningful comprehension or inference",
    "invalidIf": "answer-only drill or translation revealed"
  },
  {
    "id": "written_production",
    "source": "original message in target language reviewed with task-specific rubric",
    "invalidIf": "model answer seen before attempt, no qualified review"
  },
  {
    "id": "spoken_reception",
    "source": "approved recording listened to with transcript hidden, relevant comprehension",
    "invalidIf": "browser TTS, missing approved recording, transcript shown"
  },
  {
    "id": "spoken_production",
    "source": "spoken response recorded/observed and assessed by qualified human",
    "invalidIf": "no spoken output"
  },
  {
    "id": "interaction",
    "source": "responsive interaction with person, evidence of contingency",
    "invalidIf": "static scripted answers only"
  },
  {
    "id": "contextual_recognition",
    "source": "approved meaningful contextual grammar and vocabulary tasks",
    "invalidIf": "only repeatedly memorised isolated items"
  },
  {
    "id": "retention_transfer",
    "source": "meaningful change of context and later unaided opportunity",
    "invalidIf": "same memorised exercise repeated"
  }
] as CompetencyGuideV17[];
export const v17ScenariosFor=(lang:Language)=>v17Scenarios.filter(s=>s.language===lang);
export const v17CheckpointsFor=(lang:Language)=>v17Checkpoints.filter(c=>c.language===lang);
