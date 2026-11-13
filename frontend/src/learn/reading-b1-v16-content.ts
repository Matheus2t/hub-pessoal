/** V16 — 10 editorial B1 reading units from PR #121. NOT publicly released.
 * This data is used only by the opt-in local UI preview. No student answers
 * are scored, persisted or treated as proof of CEFR B1 reading proficiency.
 */
import type {Language} from './model';

export interface ReadingQuestionV16 {
 id:string;kind:'single_choice'|'open_response';
 competency:'main_idea'|'evidence_based_inference'|'constraint_or_detail'|'synthesis';
 promptPt:string;optionsPt:{id:string;label:string}[];
 correctOptionId:string|null;illustrativeAnswerPt:string|null;illustrativeAnswerExamplesPt:string[];
 evidenceSpans:string[];explanationPt:string;scoringPolicy:string;
}
export interface ReadingUnitV16 {
 id:string;language:Language;level:'B1';legacyReadingId:string;linkedStageNodeId:string;
 genre:string;topic:string;title:string;text:string;questions:ReadingQuestionV16[];
 transferTask:{id:string;prompt:string;scoringCriteriaPt:string[];useForReadingMastery:false};
 public:false;reviewStatus:string;
}
export const readingB1V16Units:readonly ReadingUnitV16[]=[
  {
    "id": "en-reading-b1-v16-01",
    "language": "en",
    "level": "B1",
    "legacyReadingId": "en-v2-reading-001",
    "linkedStageNodeId": "en-path-11",
    "genre": "community_email",
    "topic": "Projetos",
    "title": "A workshop that changed its plan",
    "text": "Our neighbourhood group has organised repair workshops for the past three months. At first, we invited everyone to bring broken household objects on the same Saturday morning. The room became crowded, and several visitors left before anyone could help them. We received positive comments about the volunteers, but complaints about the long wait.\n\nFor next month, we have decided to offer two shorter sessions. People who need help with bicycles should book the early session; the later one will focus on small electrical items. Both sessions will remain free. Volunteers have also asked visitors to describe the problem when booking, so they can prepare suitable tools. We cannot promise that every object will be repaired, but we hope fewer people will leave without receiving advice.",
    "questions": [
      {
        "id": "en-reading-b1-v16-01-q1",
        "kind": "single_choice",
        "competency": "main_idea",
        "promptPt": "Qual é a principal mudança anunciada pelo grupo?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Passar a cobrar pelas oficinas."
          },
          {
            "id": "b",
            "label": "Deixar de aceitar objetos para conserto."
          },
          {
            "id": "c",
            "label": "Separar a oficina em duas sessões com focos diferentes."
          }
        ],
        "correctOptionId": "c",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "For next month, we have decided to offer two shorter sessions.",
          "the later one will focus on small electrical items."
        ],
        "explanationPt": "Dividir a atividade e organizar os tipos de atendimento.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "en-reading-b1-v16-01-q2",
        "kind": "open_response",
        "competency": "evidence_based_inference",
        "promptPt": "Por que solicitar a descrição do problema antes da visita pode melhorar a oficina?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Permite preparar ferramentas adequadas e organizar melhor o atendimento, respondendo à espera longa anterior.",
        "illustrativeAnswerExamplesPt": [
          "Preparar ferramentas antes da sessão.",
          "Reduzir improvisos na hora do atendimento."
        ],
        "evidenceSpans": [
          "Volunteers have also asked visitors to describe the problem when booking, so they can prepare suitable tools.",
          "complaints about the long wait."
        ],
        "explanationPt": "A resposta deve conectar a preparação de ferramentas à dificuldade anterior, sem prometer que todo reparo dará certo.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      },
      {
        "id": "en-reading-b1-v16-01-q3",
        "kind": "single_choice",
        "competency": "constraint_or_detail",
        "promptPt": "Que limite os organizadores deixam explícito?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Nem todos os objetos poderão ser consertados."
          },
          {
            "id": "b",
            "label": "Todas as bicicletas serão atendidas com prioridade absoluta."
          },
          {
            "id": "c",
            "label": "A sessão posterior será paga."
          }
        ],
        "correctOptionId": "a",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "We cannot promise that every object will be repaired"
        ],
        "explanationPt": "Não é possível garantir o conserto de todos os objetos.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "en-reading-b1-v16-01-q4",
        "kind": "open_response",
        "competency": "synthesis",
        "promptPt": "Resuma o problema anterior e duas medidas anunciadas para enfrentá-lo.",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "A oficina estava lotada e havia longas esperas; foram criadas duas sessões especializadas e pedidos prévios de descrição do problema.",
        "illustrativeAnswerExamplesPt": [
          "Muita gente esperava; agora haverá sessões separadas e preparo antecipado de ferramentas."
        ],
        "evidenceSpans": [
          "The room became crowded",
          "offer two shorter sessions",
          "describe the problem when booking"
        ],
        "explanationPt": "Mencionar o problema e duas medidas, distinguindo plano de resultado comprovado.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      }
    ],
    "transferTask": {
      "id": "en-reading-b1-v16-01-transfer",
      "prompt": "Write a short message to neighbours inviting them to a new repair workshop. Explain how visitors should prepare and mention one limitation of the event.",
      "scoringCriteriaPt": [
        "Convite com horário ou orientação de participação coerente com situação proposta.",
        "Instrução concreta de preparo.",
        "Uma limitação comunicada sem prometer sucesso garantido."
      ],
      "useForReadingMastery": false
    },
    "public": false,
    "reviewStatus": "draft_requires_independent_language_and_pedagogical_review"
  },
  {
    "id": "en-reading-b1-v16-02",
    "language": "en",
    "level": "B1",
    "legacyReadingId": "en-v2-reading-002",
    "linkedStageNodeId": "en-path-12",
    "genre": "public_notice",
    "topic": "Informação",
    "title": "A library tries a new schedule",
    "text": "The town library usually closes at six, but many people who work during the day have asked for later opening hours. The library cannot afford to keep every room open in the evening, so it will test a smaller service on Thursdays for six weeks. Visitors will be able to collect reserved books and use the reading area until eight. The computer room will still close at six.\n\nIf enough people use the evening service, the library will consider continuing it after the trial. Staff will count visits and collect short comments, but a decision has not been made. Some visitors have already asked whether the library will open later on other weekdays. The manager says the first priority is to find out whether Thursday evenings are useful before making a wider promise.",
    "questions": [
      {
        "id": "en-reading-b1-v16-02-q1",
        "kind": "single_choice",
        "competency": "main_idea",
        "promptPt": "Qual é a finalidade do novo horário de quinta-feira?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Testar um atendimento noturno limitado antes de decidir se vale ampliá-lo."
          },
          {
            "id": "b",
            "label": "Abrir todas as salas até as oito todos os dias."
          },
          {
            "id": "c",
            "label": "Fechar permanentemente a sala de computadores."
          }
        ],
        "correctOptionId": "a",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "it will test a smaller service on Thursdays for six weeks",
          "a decision has not been made"
        ],
        "explanationPt": "Experimento limitado, sem garantia de permanência.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "en-reading-b1-v16-02-q2",
        "kind": "open_response",
        "competency": "evidence_based_inference",
        "promptPt": "Por que a biblioteca não anunciou horários estendidos para toda a semana?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Porque tem recursos limitados e quer avaliar a procura nas quintas antes de assumir um compromisso maior.",
        "illustrativeAnswerExamplesPt": [
          "O orçamento não permite manter tudo aberto.",
          "Primeiro vão medir a utilidade do serviço de quinta-feira."
        ],
        "evidenceSpans": [
          "The library cannot afford to keep every room open in the evening",
          "before making a wider promise"
        ],
        "explanationPt": "É preciso relacionar limitação de recursos e decisão baseada em teste.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      },
      {
        "id": "en-reading-b1-v16-02-q3",
        "kind": "single_choice",
        "competency": "constraint_or_detail",
        "promptPt": "Qual serviço continuará encerrando às seis horas?",
        "optionsPt": [
          {
            "id": "a",
            "label": "A retirada de livros reservados."
          },
          {
            "id": "b",
            "label": "A sala de computadores."
          },
          {
            "id": "c",
            "label": "A área de leitura."
          }
        ],
        "correctOptionId": "b",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "The computer room will still close at six."
        ],
        "explanationPt": "A sala de computadores continua fechando às seis.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "en-reading-b1-v16-02-q4",
        "kind": "open_response",
        "competency": "synthesis",
        "promptPt": "Quais evidências serão consideradas para decidir se o serviço de quinta continua?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "O número de visitantes e os comentários coletados durante seis semanas.",
        "illustrativeAnswerExamplesPt": [
          "Contagem de visitas e opiniões do público ao longo do teste."
        ],
        "evidenceSpans": [
          "for six weeks",
          "Staff will count visits and collect short comments"
        ],
        "explanationPt": "Não afirmar que a decisão de continuar já foi tomada.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      }
    ],
    "transferTask": {
      "id": "en-reading-b1-v16-02-transfer",
      "prompt": "Write to the library manager suggesting one way to evaluate the Thursday trial. Explain what information your suggestion would provide.",
      "scoringCriteriaPt": [
        "Proposta de avaliação viável.",
        "Informação que seria coletada.",
        "Ligação explícita entre dados e decisão."
      ],
      "useForReadingMastery": false
    },
    "public": false,
    "reviewStatus": "draft_requires_independent_language_and_pedagogical_review"
  },
  {
    "id": "en-reading-b1-v16-03",
    "language": "en",
    "level": "B1",
    "legacyReadingId": "en-v2-reading-003",
    "linkedStageNodeId": "en-path-13",
    "genre": "news_report",
    "topic": "Tecnologia",
    "title": "Computers for another school",
    "text": "At the end of the school year, twelve computers were collected from a local office. They still worked, but they were too slow for some of the office's new programs. A volunteer team checked the machines and replaced parts where necessary. The computers were then prepared for a nearby school that needed equipment for basic writing and research tasks.\n\nBefore delivery, the office asked a technician to remove its private files. The volunteers explained that the machines would not be suitable for demanding design software, even after repairs. The school accepted this limitation because its immediate need was to give more pupils access to simple digital lessons. A teacher said the donation would be useful, but added that the school still needed enough time and staff to introduce the computers into classes.",
    "questions": [
      {
        "id": "en-reading-b1-v16-03-q1",
        "kind": "single_choice",
        "competency": "main_idea",
        "promptPt": "O que melhor resume a iniciativa descrita?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Instalar programas avançados de design na escola."
          },
          {
            "id": "b",
            "label": "Adaptar computadores usados para tarefas básicas em outra escola."
          },
          {
            "id": "c",
            "label": "Comprar computadores novos para o escritório."
          }
        ],
        "correctOptionId": "b",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "The computers were then prepared for a nearby school",
          "basic writing and research tasks"
        ],
        "explanationPt": "Reaproveitamento de máquinas para uso básico, não compra de novas.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "en-reading-b1-v16-03-q2",
        "kind": "open_response",
        "competency": "evidence_based_inference",
        "promptPt": "Por que a escola aceitou computadores que ainda tinham limitações?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Porque serviam para escrita e pesquisa básicas, a necessidade imediata da escola, apesar de não executarem softwares exigentes.",
        "illustrativeAnswerExamplesPt": [
          "Para tarefas básicas, os equipamentos eram suficientes.",
          "O limite de desempenho não impedia o uso pretendido."
        ],
        "evidenceSpans": [
          "would not be suitable for demanding design software",
          "its immediate need was to give more pupils access to simple digital lessons"
        ],
        "explanationPt": "A resposta deve relacionar limitação técnica e finalidade da escola.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      },
      {
        "id": "en-reading-b1-v16-03-q3",
        "kind": "single_choice",
        "competency": "constraint_or_detail",
        "promptPt": "Qual medida foi tomada antes da entrega para proteger informações do escritório?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Os alunos receberam as senhas do escritório."
          },
          {
            "id": "b",
            "label": "Os voluntários prometeram não abrir os arquivos."
          },
          {
            "id": "c",
            "label": "Um técnico removeu arquivos privados."
          }
        ],
        "correctOptionId": "c",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "a technician to remove its private files"
        ],
        "explanationPt": "Remoção de arquivos privados, sem alegar auditoria de segurança completa.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "en-reading-b1-v16-03-q4",
        "kind": "open_response",
        "competency": "synthesis",
        "promptPt": "Além dos equipamentos, qual condição o professor considera necessária para que a doação seja útil?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Tempo e pessoal para introduzir os computadores nas aulas.",
        "illustrativeAnswerExamplesPt": [
          "Ter tempo e equipe para incorporar as máquinas ao ensino."
        ],
        "evidenceSpans": [
          "the school still needed enough time and staff to introduce the computers into classes"
        ],
        "explanationPt": "O texto não afirma que a adoção já foi concluída.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      }
    ],
    "transferTask": {
      "id": "en-reading-b1-v16-03-transfer",
      "prompt": "Write a note to a school explaining one useful purpose for donated computers and one limitation that teachers should plan for.",
      "scoringCriteriaPt": [
        "Uso plausível e específico.",
        "Limitação informada com clareza.",
        "Recomendação de planejamento relacionada ao uso."
      ],
      "useForReadingMastery": false
    },
    "public": false,
    "reviewStatus": "draft_requires_independent_language_and_pedagogical_review"
  },
  {
    "id": "en-reading-b1-v16-04",
    "language": "en",
    "level": "B1",
    "legacyReadingId": "en-v2-reading-004",
    "linkedStageNodeId": "en-path-14",
    "genre": "personal_email",
    "topic": "Estudo",
    "title": "A reading partner who listens",
    "text": "When I joined the language exchange group, I hoped to improve my speaking, but I often stayed quiet. I could understand short articles, yet I became nervous when someone asked me to explain my opinion. The group leader introduced me to Clara, a student who had joined a year earlier and remembered having the same problem.\n\nClara suggested that we read a short news story before each meeting and each prepare two questions. During our first sessions, she let me finish my answers before giving feedback. She also asked me to explain why I agreed or disagreed with the writer, rather than repeat sentences from the article. I still make mistakes, and I sometimes need extra time, but now I speak more often. I have learned that preparing ideas is useful, while listening patiently can make practice less frightening.",
    "questions": [
      {
        "id": "en-reading-b1-v16-04-q1",
        "kind": "single_choice",
        "competency": "main_idea",
        "promptPt": "Qual foi a mudança mais importante na participação da pessoa que narra durante as discussões?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Começou a decorar os textos sem conversar."
          },
          {
            "id": "b",
            "label": "Deixou de ler artigos antes das reuniões."
          },
          {
            "id": "c",
            "label": "Passou a discutir opiniões e justificativas com uma parceira que lhe dá tempo para responder."
          }
        ],
        "correctOptionId": "c",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "she let me finish my answers before giving feedback",
          "explain why I agreed or disagreed with the writer"
        ],
        "explanationPt": "A prática passou a envolver explicação de ideias e apoio paciente.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "en-reading-b1-v16-04-q2",
        "kind": "open_response",
        "competency": "evidence_based_inference",
        "promptPt": "Por que preparar duas perguntas antes de cada encontro provavelmente ajuda a pessoa que narra a participar?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Porque oferece ideias para discutir e reduz a necessidade de improvisar quando se sente nervosa ou nervoso.",
        "illustrativeAnswerExamplesPt": [
          "Chegar com perguntas preparadas facilita a conversa.",
          "Preparar perguntas ajuda a organizar ideias antes de falar."
        ],
        "evidenceSpans": [
          "each prepare two questions",
          "I became nervous when someone asked me to explain my opinion"
        ],
        "explanationPt": "É inferência plausível; não afirmar cura total da ansiedade.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      },
      {
        "id": "en-reading-b1-v16-04-q3",
        "kind": "single_choice",
        "competency": "constraint_or_detail",
        "promptPt": "O que Clara evita fazer enquanto a outra pessoa responde?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Interromper antes de ela terminar."
          },
          {
            "id": "b",
            "label": "Pedir justificativas."
          },
          {
            "id": "c",
            "label": "Ler notícias antes dos encontros."
          }
        ],
        "correctOptionId": "a",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "she let me finish my answers before giving feedback"
        ],
        "explanationPt": "A parceira espera a resposta terminar antes de dar feedback.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "en-reading-b1-v16-04-q4",
        "kind": "open_response",
        "competency": "synthesis",
        "promptPt": "O texto afirma que a pessoa que narra já fala sem erros? Justifique com dois elementos.",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Não. A pessoa ainda comete erros e às vezes precisa de tempo, mas participa mais das conversas.",
        "illustrativeAnswerExamplesPt": [
          "Ainda comete erros, mas passou a falar mais vezes.",
          "O progresso aparece na participação maior, mesmo sem domínio perfeito."
        ],
        "evidenceSpans": [
          "I still make mistakes",
          "I sometimes need extra time",
          "now I speak more often"
        ],
        "explanationPt": "Diferenciar progresso de domínio perfeito.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      }
    ],
    "transferTask": {
      "id": "en-reading-b1-v16-04-transfer",
      "prompt": "Invite a shy classmate to a reading discussion. Suggest one preparation step and one respectful way the group can give feedback.",
      "scoringCriteriaPt": [
        "Convite adequado.",
        "Etapa concreta de preparação.",
        "Prática respeitosa de feedback."
      ],
      "useForReadingMastery": false
    },
    "public": false,
    "reviewStatus": "draft_requires_independent_language_and_pedagogical_review"
  },
  {
    "id": "en-reading-b1-v16-05",
    "language": "en",
    "level": "B1",
    "legacyReadingId": "en-v2-reading-005",
    "linkedStageNodeId": "en-path-15",
    "genre": "narrative_report",
    "topic": "Ambiente",
    "title": "The lights during the meeting",
    "text": "Last Wednesday, the residents of our building were discussing the new corridor lights when the electricity went off for a few minutes. Some people wondered whether the new system had caused the problem. However, a technician later explained that several buildings on the street had lost power at the same time. The residents agreed that this information did not support blaming the new lights.\n\nThe meeting continued after the power returned. A few neighbours said they liked the lights turning on automatically when someone entered, while others wanted clearer signs showing how to report a fault. The building manager promised to place instructions near the lifts and to record any complaints during the next month. Nobody presented figures showing how much energy the system had saved, so the group decided not to make a public claim about savings yet.",
    "questions": [
      {
        "id": "en-reading-b1-v16-05-q1",
        "kind": "single_choice",
        "competency": "main_idea",
        "promptPt": "Qual é a postura final dos moradores sobre o sistema de iluminação?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Acompanhar possíveis problemas e evitar afirmar economia ainda não medida."
          },
          {
            "id": "b",
            "label": "Concluir que as lâmpadas causaram a queda de energia."
          },
          {
            "id": "c",
            "label": "Divulgar imediatamente uma porcentagem de economia."
          }
        ],
        "correctOptionId": "a",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "to record any complaints during the next month",
          "not to make a public claim about savings yet"
        ],
        "explanationPt": "Monitoramento e prudência, sem concluir eficácia numérica.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "en-reading-b1-v16-05-q2",
        "kind": "open_response",
        "competency": "evidence_based_inference",
        "promptPt": "Por que a queda de energia não foi tomada como prova de defeito nas luzes novas?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Porque vários prédios perderam energia ao mesmo tempo; isso enfraquece a hipótese de uma causa exclusiva no sistema do edifício.",
        "illustrativeAnswerExamplesPt": [
          "A interrupção afetou outros edifícios.",
          "O problema não ocorreu apenas onde as novas lâmpadas foram instaladas."
        ],
        "evidenceSpans": [
          "several buildings on the street had lost power at the same time",
          "did not support blaming the new lights"
        ],
        "explanationPt": "Não afirmar a causa exata da queda, que não é dada.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      },
      {
        "id": "en-reading-b1-v16-05-q3",
        "kind": "single_choice",
        "competency": "constraint_or_detail",
        "promptPt": "Que melhoria prática a administração prometeu implementar?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Anunciar economia sem medições."
          },
          {
            "id": "b",
            "label": "Colocar instruções perto dos elevadores para relatar falhas."
          },
          {
            "id": "c",
            "label": "Retirar todas as lâmpadas no mesmo dia."
          }
        ],
        "correctOptionId": "b",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "promised to place instructions near the lifts"
        ],
        "explanationPt": "O plano é colocar instruções; não confundir promessa com conclusão.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "en-reading-b1-v16-05-q4",
        "kind": "open_response",
        "competency": "synthesis",
        "promptPt": "Que duas informações ainda seriam necessárias para uma avaliação mais completa do sistema?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Registros de eventuais reclamações e medições reais de economia de energia.",
        "illustrativeAnswerExamplesPt": [
          "Queixas coletadas ao longo do mês e números sobre consumo."
        ],
        "evidenceSpans": [
          "record any complaints during the next month",
          "Nobody presented figures showing how much energy the system had saved"
        ],
        "explanationPt": "Relacionar dados de usabilidade com dados de consumo, sem inventar economia.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      }
    ],
    "transferTask": {
      "id": "en-reading-b1-v16-05-transfer",
      "prompt": "Write a brief message to residents explaining why it is too early to claim success and what evidence should be collected next.",
      "scoringCriteriaPt": [
        "Explicita incerteza quanto aos resultados.",
        "Propõe coleta de evidência adequada.",
        "Tom respeitoso para os moradores."
      ],
      "useForReadingMastery": false
    },
    "public": false,
    "reviewStatus": "draft_requires_independent_language_and_pedagogical_review"
  },
  {
    "id": "ru-reading-b1-v16-01",
    "language": "ru",
    "level": "B1",
    "legacyReadingId": "ru-v2-reading-001",
    "linkedStageNodeId": "ru-path-11",
    "genre": "community_notice",
    "topic": "Projetos",
    "title": "Книги для соседей",
    "text": "После ремонта районной библиотеки у нас осталось много книг, которые больше не помещались на старых полках. Несколько жителей предложили открыть небольшой пункт обмена книгами в общественном центре. Волонтёры уже разобрали книги по темам, но оказалось, что некоторые издания повреждены. Такие книги решили пока не выдавать, чтобы читатели не получили их случайно.\n\nСначала организаторы хотели открыть пункт только по субботам. Однако люди, работающие в выходные, попросили добавить вечерний день. Теперь центр будет принимать посетителей по средам после шести и по субботам утром. Через месяц организаторы соберут отзывы и решат, стоит ли менять расписание. Они напоминают, что обмен бесплатный, но выбор книг пока ограничен.",
    "questions": [
      {
        "id": "ru-reading-b1-v16-01-q1",
        "kind": "single_choice",
        "competency": "main_idea",
        "promptPt": "Qual é o objetivo principal do projeto descrito?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Vender todos os livros antigos da biblioteca."
          },
          {
            "id": "b",
            "label": "Fechar a biblioteca às quartas-feiras."
          },
          {
            "id": "c",
            "label": "Permitir a troca gratuita de livros da comunidade."
          }
        ],
        "correctOptionId": "c",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "пункт обмена книгами",
          "обмен бесплатный"
        ],
        "explanationPt": "Troca comunitária, não venda.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "ru-reading-b1-v16-01-q2",
        "kind": "open_response",
        "competency": "evidence_based_inference",
        "promptPt": "Por que acrescentaram atendimento nas noites de quarta-feira?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Porque algumas pessoas trabalham nos fins de semana e não conseguiriam aproveitar apenas o sábado.",
        "illustrativeAnswerExamplesPt": [
          "O novo horário atende pessoas que trabalham no sábado.",
          "A mudança amplia o acesso para quem está ocupado no fim de semana."
        ],
        "evidenceSpans": [
          "люди, работающие в выходные, попросили добавить вечерний день",
          "по средам после шести"
        ],
        "explanationPt": "Ligar pedido de acessibilidade ao horário adicional, sem alegar dados de público.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      },
      {
        "id": "ru-reading-b1-v16-01-q3",
        "kind": "single_choice",
        "competency": "constraint_or_detail",
        "promptPt": "O que acontecerá com os exemplares danificados?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Não serão disponibilizados por enquanto."
          },
          {
            "id": "b",
            "label": "Serão vendidos imediatamente."
          },
          {
            "id": "c",
            "label": "Serão entregues sem separação."
          }
        ],
        "correctOptionId": "a",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "Такие книги решили пока не выдавать"
        ],
        "explanationPt": "Não afirmar descarte dos exemplares.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "ru-reading-b1-v16-01-q4",
        "kind": "open_response",
        "competency": "synthesis",
        "promptPt": "Que decisão ainda depende de informações coletadas no mês seguinte?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Se o horário do ponto de troca deve ser modificado após a coleta de opiniões.",
        "illustrativeAnswerExamplesPt": [
          "Reavaliar os dias e horários com base nos comentários dos visitantes."
        ],
        "evidenceSpans": [
          "Через месяц организаторы соберут отзывы и решат, стоит ли менять расписание"
        ],
        "explanationPt": "Não confundir teste com decisão já tomada.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      }
    ],
    "transferTask": {
      "id": "ru-reading-b1-v16-01-transfer",
      "prompt": "Напишите короткое приглашение соседям на бесплатный обмен книгами. Укажите удобное время, одно правило и попросите оставить отзыв.",
      "scoringCriteriaPt": [
        "Convite com horário concreto.",
        "Regra prática explícita.",
        "Pedido de feedback compreensível em russo."
      ],
      "useForReadingMastery": false
    },
    "public": false,
    "reviewStatus": "draft_requires_independent_language_and_pedagogical_review"
  },
  {
    "id": "ru-reading-b1-v16-02",
    "language": "ru",
    "level": "B1",
    "legacyReadingId": "ru-v2-reading-002",
    "linkedStageNodeId": "ru-path-12",
    "genre": "public_notice",
    "topic": "Informação",
    "title": "Изменения на автобусном маршруте",
    "text": "Из-за ремонта моста автобус номер семь на следующей неделе будет ходить по временному маршруту. Раньше он останавливался у спортивного центра, но теперь ближайшая остановка будет у городского музея. Пассажиры смогут дойти от музея до спортивного центра примерно за десять минут. Представители транспортной компании объясняют, что это временное решение и после ремонта автобус должен вернуться на старую дорогу.\n\nНекоторые жители спрашивают, будут ли автобусы приходить по обычному расписанию. Компания пока не обещает точного времени, потому что на новой дороге часто бывают пробки. В течение первой недели сотрудники будут записывать опоздания и публиковать обновления на сайте. Пассажирам советуют проверять информацию перед поездкой, особенно если у них назначена важная встреча.",
    "questions": [
      {
        "id": "ru-reading-b1-v16-02-q1",
        "kind": "single_choice",
        "competency": "main_idea",
        "promptPt": "O que o aviso informa principalmente?",
        "optionsPt": [
          {
            "id": "a",
            "label": "O ônibus 7 terá percurso temporário por causa de obras."
          },
          {
            "id": "b",
            "label": "O ônibus 7 deixará de circular definitivamente."
          },
          {
            "id": "c",
            "label": "O centro esportivo mudará de endereço."
          }
        ],
        "correctOptionId": "a",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "Из-за ремонта моста автобус номер семь на следующей неделе будет ходить по временному маршруту"
        ],
        "explanationPt": "Desvio temporário, não cancelamento definitivo.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "ru-reading-b1-v16-02-q2",
        "kind": "open_response",
        "competency": "evidence_based_inference",
        "promptPt": "Por que a empresa recomenda conferir o site antes da viagem?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Porque há risco de atrasos devido ao trânsito no novo percurso e o horário exato ainda é incerto.",
        "illustrativeAnswerExamplesPt": [
          "A nova via pode ter congestionamentos.",
          "A empresa acompanhará atrasos e divulgará atualizações."
        ],
        "evidenceSpans": [
          "на новой дороге часто бывают пробки",
          "записывать опоздания и публиковать обновления на сайте"
        ],
        "explanationPt": "Conectar incerteza de horário e atualizações.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      },
      {
        "id": "ru-reading-b1-v16-02-q3",
        "kind": "single_choice",
        "competency": "constraint_or_detail",
        "promptPt": "Onde ficará a parada mais próxima do centro esportivo durante as obras?",
        "optionsPt": [
          {
            "id": "a",
            "label": "No próprio canteiro da ponte."
          },
          {
            "id": "b",
            "label": "Perto do museu municipal."
          },
          {
            "id": "c",
            "label": "Na entrada do centro esportivo."
          }
        ],
        "correctOptionId": "b",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "ближайшая остановка будет у городского музея"
        ],
        "explanationPt": "A parada será junto ao museu.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "ru-reading-b1-v16-02-q4",
        "kind": "open_response",
        "competency": "synthesis",
        "promptPt": "O que já é certo e o que ainda é incerto sobre a mudança?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "É certo que haverá desvio temporário e parada perto do museu; o cumprimento exato dos horários ainda não está garantido.",
        "illustrativeAnswerExamplesPt": [
          "Percurso alterado confirmado, mas horários sujeitos a atrasos."
        ],
        "evidenceSpans": [
          "будет ходить по временному маршруту",
          "пока не обещает точного времени"
        ],
        "explanationPt": "Distinguir mudança confirmada de promessa não feita.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      }
    ],
    "transferTask": {
      "id": "ru-reading-b1-v16-02-transfer",
      "prompt": "Напишите сообщение другу, которому нужно приехать в спортивный центр. Объясните временное изменение маршрута и предложите, где проверить время автобуса.",
      "scoringCriteriaPt": [
        "Explica o desvio e a parada.",
        "Sugere consulta a atualizações.",
        "Não promete pontualidade não comprovada."
      ],
      "useForReadingMastery": false
    },
    "public": false,
    "reviewStatus": "draft_requires_independent_language_and_pedagogical_review"
  },
  {
    "id": "ru-reading-b1-v16-03",
    "language": "ru",
    "level": "B1",
    "legacyReadingId": "ru-v2-reading-003",
    "linkedStageNodeId": "ru-path-13",
    "genre": "report",
    "topic": "Viagens",
    "title": "Велосипеды для школьников",
    "text": "Весной в нашем городе собрали старые велосипеды, которыми семьи больше не пользовались. Волонтёры проверили тормоза и колёса, а необходимые детали заменили. После проверки часть велосипедов передали школьному клубу. Там дети учатся правилам безопасной езды и могут тренироваться во дворе под наблюдением взрослых.\n\nОрганизаторы подчёркивают, что не все подаренные велосипеды удалось подготовить к использованию. Некоторые потребовали слишком сложного ремонта, поэтому их пока оставили в мастерской. Руководитель клуба также попросил родителей не считать занятия заменой самостоятельной проверки велосипеда перед поездкой. Проект помог начать тренировки, но для регулярных занятий нужны взрослые помощники и место, где можно безопасно хранить оборудование. Городская администрация обещала обсудить это с клубом в конце месяца.",
    "questions": [
      {
        "id": "ru-reading-b1-v16-03-q1",
        "kind": "single_choice",
        "competency": "main_idea",
        "promptPt": "O que melhor resume a iniciativa?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Abrir uma oficina de carros para crianças."
          },
          {
            "id": "b",
            "label": "Preparar bicicletas usadas para atividades supervisionadas de um clube escolar."
          },
          {
            "id": "c",
            "label": "Doar bicicletas novas a todos os moradores."
          }
        ],
        "correctOptionId": "b",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "часть велосипедов передали школьному клубу",
          "могут тренироваться во дворе под наблюдением взрослых"
        ],
        "explanationPt": "Reuso condicionado à revisão e supervisão.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "ru-reading-b1-v16-03-q2",
        "kind": "open_response",
        "competency": "evidence_based_inference",
        "promptPt": "Por que nem todas as bicicletas foram entregues ao clube?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Porque algumas precisavam de reparos complexos e ainda não estavam prontas para uso.",
        "illustrativeAnswerExamplesPt": [
          "Nem todos os consertos estavam concluídos.",
          "Algumas bicicletas exigiam manutenção difícil."
        ],
        "evidenceSpans": [
          "Некоторые потребовали слишком сложного ремонта, поэтому их пока оставили в мастерской"
        ],
        "explanationPt": "Não supor que todas serão consertadas depois.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      },
      {
        "id": "ru-reading-b1-v16-03-q3",
        "kind": "single_choice",
        "competency": "constraint_or_detail",
        "promptPt": "Onde as crianças treinam?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Em estradas movimentadas sozinhas."
          },
          {
            "id": "b",
            "label": "No depósito da prefeitura."
          },
          {
            "id": "c",
            "label": "No pátio, com supervisão adulta."
          }
        ],
        "correctOptionId": "c",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "могут тренироваться во дворе под наблюдением взрослых"
        ],
        "explanationPt": "Treinamento supervisionado no pátio.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "ru-reading-b1-v16-03-q4",
        "kind": "open_response",
        "competency": "synthesis",
        "promptPt": "Que duas condições ainda são necessárias para manter as atividades regularmente?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Adultos para ajudar e um local seguro para guardar os equipamentos.",
        "illustrativeAnswerExamplesPt": [
          "Mais supervisores e espaço seguro para armazenamento."
        ],
        "evidenceSpans": [
          "нужны взрослые помощники и место, где можно безопасно хранить оборудование"
        ],
        "explanationPt": "A entrega de bicicletas não garante continuidade.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      }
    ],
    "transferTask": {
      "id": "ru-reading-b1-v16-03-transfer",
      "prompt": "Напишите короткое объявление школьному клубу о занятии на велосипедах. Назовите правило безопасности и одну практическую потребность.",
      "scoringCriteriaPt": [
        "Anúncio adequado a crianças/famílias.",
        "Regra de segurança clara.",
        "Necessidade prática realista."
      ],
      "useForReadingMastery": false
    },
    "public": false,
    "reviewStatus": "draft_requires_independent_language_and_pedagogical_review"
  },
  {
    "id": "ru-reading-b1-v16-04",
    "language": "ru",
    "level": "B1",
    "legacyReadingId": "ru-v2-reading-004",
    "linkedStageNodeId": "ru-path-14",
    "genre": "personal_blog",
    "topic": "Estudo",
    "title": "Разговорный клуб по средам",
    "text": "Когда я впервые пришёл в разговорный клуб, мне казалось, что остальные участники говорят намного лучше меня. Поэтому на первых встречах я почти не задавал вопросов. Ведущая клуба заметила это и предложила каждому заранее выбрать короткую статью и подготовить два вопроса к ней. Она сказала, что важно не только правильно произносить слова, но и уметь объяснять своё мнение.\n\nНа прошлой неделе мы обсуждали статью о городском транспорте. Я не знал одного нужного слова, но смог объяснить мысль другими словами. Участники выслушали меня, а потом предложили более точное выражение. Теперь я чаще участвую в обсуждениях, хотя всё ещё делаю ошибки. Для меня самое полезное — возможность попробовать, получить спокойный отзыв и снова высказаться.",
    "questions": [
      {
        "id": "ru-reading-b1-v16-04-q1",
        "kind": "single_choice",
        "competency": "main_idea",
        "promptPt": "Qual mudança na dinâmica do clube ajudou o narrador a participar?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Impedir perguntas dos participantes iniciantes."
          },
          {
            "id": "b",
            "label": "Exigir pronunciamento sem nenhum erro."
          },
          {
            "id": "c",
            "label": "Preparar perguntas e receber retorno respeitoso após falar."
          }
        ],
        "correctOptionId": "c",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "подготовить два вопроса",
          "Участники выслушали меня, а потом предложили более точное выражение"
        ],
        "explanationPt": "Preparação e feedback sem interrupção.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "ru-reading-b1-v16-04-q2",
        "kind": "open_response",
        "competency": "evidence_based_inference",
        "promptPt": "O que o episódio da palavra desconhecida mostra sobre a comunicação do narrador?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Mesmo sem conhecer uma palavra exata, ele conseguiu transmitir a ideia e receber ajuda para aprimorá-la.",
        "illustrativeAnswerExamplesPt": [
          "Conseguiu explicar com outras palavras.",
          "O grupo compreendeu e sugeriu formulação mais precisa."
        ],
        "evidenceSpans": [
          "не знал одного нужного слова, но смог объяснить мысль другими словами",
          "предложили более точное выражение"
        ],
        "explanationPt": "Não afirmar que aprendeu todo o vocabulário.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      },
      {
        "id": "ru-reading-b1-v16-04-q3",
        "kind": "single_choice",
        "competency": "constraint_or_detail",
        "promptPt": "Sobre qual tema era o artigo discutido na semana anterior?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Transporte urbano."
          },
          {
            "id": "b",
            "label": "Cultivo de plantas."
          },
          {
            "id": "c",
            "label": "História do esporte."
          }
        ],
        "correctOptionId": "a",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "статью о городском транспорте"
        ],
        "explanationPt": "Tema explícito: transporte urbano.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "ru-reading-b1-v16-04-q4",
        "kind": "open_response",
        "competency": "synthesis",
        "promptPt": "O narrador afirma ter eliminado todos os erros? Explique o progresso relatado.",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Não. Continua cometendo erros, mas participa mais e recebe feedback para reformular as ideias.",
        "illustrativeAnswerExamplesPt": [
          "Ainda erra, porém fala mais e recebe sugestões úteis."
        ],
        "evidenceSpans": [
          "Теперь я чаще участвую в обсуждениях, хотя всё ещё делаю ошибки"
        ],
        "explanationPt": "Distinguir maior participação de ausência de erros.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      }
    ],
    "transferTask": {
      "id": "ru-reading-b1-v16-04-transfer",
      "prompt": "Пригласите нового участника в разговорный клуб. Объясните, как подготовиться к встрече и как группа помогает человеку, который не знает нужного слова.",
      "scoringCriteriaPt": [
        "Convite claro.",
        "Orientação de preparação.",
        "Mecanismo concreto de ajuda em caso de dificuldade lexical."
      ],
      "useForReadingMastery": false
    },
    "public": false,
    "reviewStatus": "draft_requires_independent_language_and_pedagogical_review"
  },
  {
    "id": "ru-reading-b1-v16-05",
    "language": "ru",
    "level": "B1",
    "legacyReadingId": "ru-v2-reading-005",
    "linkedStageNodeId": "ru-path-15",
    "genre": "meeting_summary",
    "topic": "Ambiente",
    "title": "Свет во дворе",
    "text": "На собрании жильцов обсуждали освещение во дворе. В прошлом месяце возле дорожки установили новые лампы, которые включаются, когда кто-то проходит рядом. Часть соседей заметила, что теперь вечером легче видеть ступеньки. Другие спросили, сколько электричества действительно удалось сэкономить. Управляющий признал, что пока таких данных нет: счёт за месяц ещё не пришёл.\n\nВо время обсуждения одна жительница сообщила, что в дождливый вечер одна лампа не включилась сразу. Управляющий пообещал вызвать специалиста и записывать подобные случаи. Участники решили сначала проверить работу ламп и сравнить счета за несколько месяцев. Только после этого они собираются обсуждать, стоит ли ставить такие же лампы у второго входа. Пока решение о расширении проекта не принято.",
    "questions": [
      {
        "id": "ru-reading-b1-v16-05-q1",
        "kind": "single_choice",
        "competency": "main_idea",
        "promptPt": "Qual é a decisão dos moradores em relação à ampliação da iluminação?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Avaliar o funcionamento e as contas antes de decidir."
          },
          {
            "id": "b",
            "label": "Instalar imediatamente o sistema na segunda entrada."
          },
          {
            "id": "c",
            "label": "Retirar todas as lâmpadas antes de inspecioná-las."
          }
        ],
        "correctOptionId": "a",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "Участники решили сначала проверить работу ламп и сравнить счета за несколько месяцев",
          "Пока решение о расширении проекта не принято"
        ],
        "explanationPt": "A ampliação foi adiada, aguardando evidências.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "ru-reading-b1-v16-05-q2",
        "kind": "open_response",
        "competency": "evidence_based_inference",
        "promptPt": "Por que a opinião de que houve economia de eletricidade ainda não pode ser confirmada?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Porque ainda não chegaram contas suficientes para comparar o consumo.",
        "illustrativeAnswerExamplesPt": [
          "Não há medições/contas disponíveis para comparar.",
          "Os dados de consumo ainda não foram reunidos."
        ],
        "evidenceSpans": [
          "пока таких данных нет: счёт за месяц ещё не пришёл",
          "сравнить счета за несколько месяцев"
        ],
        "explanationPt": "O texto não fornece valor economizado.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      },
      {
        "id": "ru-reading-b1-v16-05-q3",
        "kind": "single_choice",
        "competency": "constraint_or_detail",
        "promptPt": "Qual problema concreto foi relatado sobre uma das lâmpadas?",
        "optionsPt": [
          {
            "id": "a",
            "label": "Foi removida antes da reunião."
          },
          {
            "id": "b",
            "label": "Ela não acendeu imediatamente numa noite chuvosa."
          },
          {
            "id": "c",
            "label": "Ela permaneceu sempre ligada durante o dia."
          }
        ],
        "correctOptionId": "b",
        "illustrativeAnswerPt": null,
        "illustrativeAnswerExamplesPt": [],
        "evidenceSpans": [
          "в дождливый вечер одна лампа не включилась сразу"
        ],
        "explanationPt": "Falha de acionamento relatada numa noite chuvosa.",
        "scoringPolicy": "approved_options_only_after_teacher_review"
      },
      {
        "id": "ru-reading-b1-v16-05-q4",
        "kind": "open_response",
        "competency": "synthesis",
        "promptPt": "Que dois tipos de evidência os moradores querem obter antes de decidir expandir o sistema?",
        "optionsPt": [],
        "correctOptionId": null,
        "illustrativeAnswerPt": "Registros de funcionamento/falhas e comparação das contas de energia de vários meses.",
        "illustrativeAnswerExamplesPt": [
          "Funcionamento das lâmpadas e dados reais de consumo."
        ],
        "evidenceSpans": [
          "проверить работу ламп",
          "сравнить счета за несколько месяцев"
        ],
        "explanationPt": "Distinguir funcionamento de comprovação de economia.",
        "scoringPolicy": "human_review_or_uncertain_no_automatic_literal_match"
      }
    ],
    "transferTask": {
      "id": "ru-reading-b1-v16-05-transfer",
      "prompt": "Напишите сообщение жильцам с просьбой сообщать о неполадках освещения. Объясните, почему пока нельзя уверенно говорить об экономии энергии.",
      "scoringCriteriaPt": [
        "Solicita registro de falhas.",
        "Explica ausência de dados de consumo.",
        "Não inventa resultados medidos."
      ],
      "useForReadingMastery": false
    },
    "public": false,
    "reviewStatus": "draft_requires_independent_language_and_pedagogical_review"
  }
] as ReadingUnitV16[];
export const readingB1V16For=(language:Language):readonly ReadingUnitV16[]=>readingB1V16Units.filter(unit=>unit.language===language);
