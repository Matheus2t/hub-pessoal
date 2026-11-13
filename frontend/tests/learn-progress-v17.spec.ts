import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {Attempt} from '../src/learn/model';
import {v17Scenarios,v17ScenariosFor,v17Checkpoints,v17CheckpointsFor,v17Competencies} from '../src/learn/progression-v17-content';
import {evaluateV17EvidencePolicy,studySnapshotV17,recommendNextStageV17,isScenarioAlignedV17} from '../src/learn/progression-v17-policy';
import {isLearnAssessmentV17PreviewEnabled} from '../src/learn/pilot-preview';
import {serveBuiltSite} from './helpers/serve-built-site';

const cases=[
  {
    "id": "v17-case-01",
    "labelPt": "Acerto em exercício legado não é domínio",
    "facts": {
      "sourceType": "legacy_attempt",
      "correct": true,
      "distinctItemIds": 6,
      "allStageQuestionsAnswered": true
    },
    "expected": {
      "study": "activities_answered",
      "performance": "not_assessed",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-02",
    "labelPt": "Repetições não multiplicam conclusão",
    "facts": {
      "sourceType": "legacy_attempt",
      "sameItemIdRepeated": 7,
      "distinctItemIds": 1,
      "stageQuestionCount": 6
    },
    "expected": {
      "study": "in_progress",
      "performance": "not_assessed",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-03",
    "labelPt": "Tentativa incerta conta como estudo",
    "facts": {
      "sourceType": "legacy_attempt",
      "outcome": "uncertain",
      "sixDistinctItemsAnswered": true
    },
    "expected": {
      "study": "activities_answered",
      "performance": "not_assessed",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-04",
    "labelPt": "Outro idioma não conta para trilha atual",
    "facts": {
      "targetLanguage": "ru",
      "sourceLanguage": "en",
      "sourceType": "legacy_attempt",
      "distinctItemIds": 6
    },
    "expected": {
      "study": "not_started",
      "performance": "not_assessed",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-05",
    "labelPt": "Browser TTS não é avaliação de listening",
    "facts": {
      "sourceType": "approved_recorded_listening",
      "recordingValidated": false,
      "source": "browser-synthesis",
      "transcriptViewedBeforeAttempt": false
    },
    "expected": {
      "study": "not_started",
      "performance": "not_assessed",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-06",
    "labelPt": "Transcrição antecipada contamina escuta",
    "facts": {
      "sourceType": "approved_recorded_listening",
      "recordingValidated": true,
      "transcriptViewedBeforeAttempt": true
    },
    "expected": {
      "study": "not_started",
      "performance": "not_assessed",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-07",
    "labelPt": "Resposta aberta plausível não reconhecida",
    "facts": {
      "sourceType": "approved_new_checkpoint",
      "reviewStatus": "pending",
      "outcome": "uncertain",
      "independentContext": true
    },
    "expected": {
      "study": "not_started",
      "performance": "awaiting_review",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-08",
    "labelPt": "Tarefa revisada sem ajuda é evidência local",
    "facts": {
      "sourceType": "approved_new_checkpoint",
      "teacherApproved": true,
      "reviewStatus": "reviewed",
      "outcome": "supported",
      "independentContext": true,
      "assistanceShown": false
    },
    "expected": {
      "study": "not_started",
      "performance": "supported_for_observed_task",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-09",
    "labelPt": "Modelo mostrado antes tira independência",
    "facts": {
      "sourceType": "approved_new_checkpoint",
      "teacherApproved": true,
      "reviewStatus": "reviewed",
      "outcome": "supported",
      "independentContext": true,
      "assistanceShown": true
    },
    "expected": {
      "study": "not_started",
      "performance": "not_assessed",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-10",
    "labelPt": "Rascunho sem aprovação não pode aprovar aluno",
    "facts": {
      "sourceType": "approved_new_checkpoint",
      "teacherApproved": false,
      "reviewStatus": "reviewed",
      "outcome": "supported",
      "independentContext": true,
      "assistanceShown": false
    },
    "expected": {
      "study": "not_started",
      "performance": "not_assessed",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-11",
    "labelPt": "Revisores discordam",
    "facts": {
      "sourceType": "approved_new_checkpoint",
      "teacherApproved": true,
      "reviewStatus": "disagreement",
      "ratings": [
        3,
        1
      ],
      "independentContext": true,
      "assistanceShown": false
    },
    "expected": {
      "study": "not_started",
      "performance": "awaiting_review",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-12",
    "labelPt": "Novo snapshot invalida aprovação antiga",
    "facts": {
      "sourceType": "approved_new_checkpoint",
      "teacherApproved": true,
      "reviewStatus": "reviewed",
      "outcome": "supported",
      "sourceVersion": "old",
      "currentVersion": "new",
      "independentContext": true
    },
    "expected": {
      "study": "not_started",
      "performance": "not_assessed",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-13",
    "labelPt": "Repetir mesmo enunciado não mede transferência",
    "facts": {
      "sourceType": "approved_new_checkpoint",
      "teacherApproved": true,
      "reviewStatus": "reviewed",
      "outcome": "supported",
      "independentContext": false,
      "assistanceShown": false
    },
    "expected": {
      "study": "not_started",
      "performance": "not_assessed",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-14",
    "labelPt": "Falta fala espontânea mesmo com B1 escrito",
    "facts": {
      "sourceType": "approved_new_checkpoint",
      "teacherApproved": true,
      "reviewStatus": "reviewed",
      "outcome": "supported",
      "independentContext": true,
      "assistanceShown": false,
      "spokenProduction": "not_assessed"
    },
    "expected": {
      "study": "not_started",
      "performance": "supported_for_observed_task",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-15",
    "labelPt": "Resposta revisada insuficiente pede revisão sem bloquear",
    "facts": {
      "sourceType": "approved_new_checkpoint",
      "teacherApproved": true,
      "reviewStatus": "reviewed",
      "outcome": "needs_practice",
      "independentContext": true,
      "assistanceShown": false
    },
    "expected": {
      "study": "not_started",
      "performance": "needs_practice",
      "recommendation": "review_recommended",
      "claim": "no_level_claim"
    }
  },
  {
    "id": "v17-case-16",
    "labelPt": "Qualquer competência faltante permanece não avaliada",
    "facts": {
      "sourceType": "approved_new_checkpoint",
      "teacherApproved": true,
      "reviewStatus": "reviewed",
      "outcome": "supported",
      "independentContext": true,
      "assistanceShown": false,
      "spokenReception": "not_assessed"
    },
    "expected": {
      "study": "not_started",
      "performance": "supported_for_observed_task",
      "claim": "no_level_claim"
    }
  }
] as const;
const progression=JSON.parse(readFileSync('frontend/public/learn/progression-v12.json','utf8'));

test('V17 importa 30 cenários e 6 checkpoints distintos, sem colisão com catálogo e sem liberação',()=>{
 expect(v17Scenarios).toHaveLength(30);
 expect(v17Checkpoints).toHaveLength(6);
 expect(v17Competencies).toHaveLength(7);
 expect(v17ScenariosFor('en')).toHaveLength(15);
 expect(v17ScenariosFor('ru')).toHaveLength(15);
 expect(v17CheckpointsFor('en').map(c=>c.level)).toEqual(['A1','A2','B1']);
 expect(v17CheckpointsFor('ru').map(c=>c.level)).toEqual(['A1','A2','B1']);
 const ids=[...v17Scenarios.map(x=>x.id),...v17Checkpoints.map(x=>x.id)];
 expect(new Set(ids).size).toBe(36);
 for(const lang of ['en','ru'] as const){
  const catalog=JSON.parse(readFileSync(`frontend/public/learn/${lang}.json`,'utf8'));
  const oldIds=new Set(catalog.exercises.map((x:{id:string})=>x.id));
  expect(catalog.exercises).toHaveLength(237);
  const track=progression.languageTracks[lang];
  expect(track.stages).toHaveLength(15);
  for(const proposal of v17ScenariosFor(lang)){
   const stage=track.stages.find((s:{nodeId:string})=>s.nodeId===proposal.nodeId);
   expect(stage).toBeDefined();
   expect(isScenarioAlignedV17(stage,proposal)).toBe(true);
   expect(proposal.public).toBe(false);
   expect(proposal.essentialCriteriaPt).toHaveLength(2);
   expect(proposal.legacyStudyQuestionIds).toHaveLength(6);
   expect(proposal.legacyStudyQuestionIds.every(id=>oldIds.has(id))).toBe(true);
   expect(oldIds.has(proposal.id)).toBe(false);
  }
  for(const checkpoint of v17CheckpointsFor(lang)){
   expect(checkpoint.public).toBe(false);
   expect(checkpoint.tasks).toHaveLength(3);
   expect(checkpoint.spokenReceptionStatus).toContain('not_assessed');
   expect(checkpoint.spokenProductionStatus).toContain('not_assessed');
   expect(checkpoint.interactionStatus).toContain('not_assessed');
  }
 }
});

test('V17 aplica os 16 casos editoriais sintéticos sem certificação e sem falsos acertos',()=>{
 expect(cases).toHaveLength(16);
 for(const tc of cases){
  const result=evaluateV17EvidencePolicy(tc.facts);
  expect(result.study,tc.id).toBe(tc.expected.study);
  expect(result.performance,tc.id).toBe(tc.expected.performance);
  expect(result.claim,tc.id).toBe('no_level_claim');
  if('recommendation' in tc.expected)expect(result.recommendation,tc.id).toBe(tc.expected.recommendation);
 }
});

test('V17 mantém cobertura por IDs distintos inclusive incertos e sem travar etapas',()=>{
 const track=progression.languageTracks.en,stage=track.stages[0];
 const make=(id:string,language:'en'|'ru',index:number):Attempt=>({
  id:`attempt-${index}`,language,itemId:id,skill:'grammar',topic:'teste',answer:'',expected:'',
  correct:false,assessmentOutcome:'uncertain',at:1700000000000+index,seconds:1
 });
 const wrongLang=stage.grammarQuestionIds.map((id:string,i:number)=>make(id,'ru',i));
 expect(studySnapshotV17(stage,wrongLang,'en').studyState).toBe('not_started');
 const one=make(stage.grammarQuestionIds[0],'en',10);
 const repetitions=[one,...Array.from({length:7},(_,i)=>make(one.itemId,'en',i+11))];
 const partly=studySnapshotV17(stage,repetitions,'en');
 expect(partly.answered).toBe(1);
 expect(partly.studyState).toBe('in_progress');
 expect(partly.performance).toBe('not_assessed');
 const six=stage.grammarQuestionIds.concat(stage.readingQuestionIds).map((id:string,i:number)=>make(id,'en',i+20));
 const full=studySnapshotV17(stage,six,'en');
 expect(full.answered).toBe(6);
 expect(full.studyState).toBe('activities_answered');
 expect(full.performance).toBe('not_assessed');
 expect(recommendNextStageV17(track.stages,six,'en')?.nodeId).toBe(track.stages[1].nodeId);
 expect(track.stages).toHaveLength(15);
});

test('V17 exige opt-in loopback e mostra rota bloqueada ao público',async({page})=>{
 expect(isLearnAssessmentV17PreviewEnabled('matheus2t.com.br','?learn-preview=progress-v17')).toBe(false);
 expect(isLearnAssessmentV17PreviewEnabled('localhost','')).toBe(false);
 expect(isLearnAssessmentV17PreviewEnabled('localhost','?learn-preview=progress-v17')).toBe(true);
 expect(isLearnAssessmentV17PreviewEnabled('127.0.0.1','?learn-preview=progress-v17')).toBe(true);
 await serveBuiltSite(page);
 await page.goto('/#/learn/en/progress-v17');
 await expect(page.getByRole('heading',{name:'Prévia indisponível'})).toBeVisible();
 await expect(page.locator('learn-progression-v17')).toHaveCount(0);
 await page.goto('/#/learn/ru/progress-v17');
 await expect(page.getByRole('heading',{name:'Prévia indisponível'})).toBeVisible();
});

test('V17 inglês mostra separadamente estudo, competência não avaliada e cenário sem notas',async({page})=>{
 await serveBuiltSite(page);
 await page.goto('/?learn-preview=progress-v17#/learn/en');
 await page.getByRole('link',{name:/Progressão V17/}).click();
 const panel=page.locator('learn-progression-v17');
 await expect(panel.getByRole('heading',{name:'Progressão A1–B1'})).toBeVisible();
 await expect(panel.getByText('Competência comprovada')).toBeVisible();
 await expect(panel.getByText('Não avaliada',{exact:true}).first()).toBeVisible();
 await expect(panel.getByRole('heading',{name:'Verb to be'})).toBeVisible();
 await expect(panel.getByText('Apresente três dados de uma pessoa fictícia: identidade, local e estado.')).toBeVisible();
 const answer=panel.getByRole('textbox',{name:/Resposta para autoestudo/});
 await answer.fill('She is a student, she is in São Paulo, and she is happy.');
 await panel.getByRole('button',{name:'Consultar critérios sugeridos'}).click();
 await expect(panel.locator('.learn-v17__criteria li')).toHaveCount(2);
 await panel.getByRole('button',{name:/A2 Comunicação cotidiana/}).click();
 await expect(panel.getByRole('heading',{name:'Perguntas e negativas'})).toBeVisible();
 await expect(answer).toBeEmpty();
 await expect(panel.getByText('CHECKPOINT A2')).toBeVisible();
 await panel.getByRole('button',{name:/B1 Contexto e interpretação/}).click();
 await expect(panel.getByRole('heading',{name:'Present Perfect'})).toBeVisible();
 await expect(panel.getByText('CHECKPOINT B1')).toBeVisible();
 await page.reload();
 await expect(panel.getByRole('heading',{name:'Verb to be'})).toBeVisible();
 await expect(answer).toBeEmpty();
 await expect(panel.getByText('Certificado CEFR')).toHaveCount(0);
});

test('V17 russo usa cenário próprio e preserva os 15 estágios',async({page})=>{
 await serveBuiltSite(page);
 await page.goto('/?learn-preview=progress-v17#/learn/ru/progress-v17');
 const panel=page.locator('learn-progression-v17');
 await expect(panel.getByRole('heading',{name:'Progressão A1–B1'})).toBeVisible();
 await expect(panel.locator('.learn-v17__competencies li')).toHaveCount(7);
 await expect(panel.getByText('Estudo por idioma: Russo.')).toBeVisible();
 await panel.getByRole('button',{name:/B1 Contexto e interpretação/}).click();
 const selector=panel.getByLabel('Etapa de estudo');
 await expect(selector.locator('option')).toHaveCount(5);
 await selector.selectOption('ru-path-15');
 await expect(panel.getByText('Compare deslocamento habitual por transporte e deslocamento atual.')).toBeVisible();
 await expect(panel.getByText('Compreensão auditiva: não avaliada')).toBeVisible();
});

test('V17 sem overflow horizontal em celular, tablet e desktop nos dois temas',async({page})=>{
 await serveBuiltSite(page);
 for(const width of [320,390,768,1366]){
  await page.setViewportSize({width,height:900});
  await page.goto('/?learn-preview=progress-v17#/learn/en/progress-v17');
  await expect(page.locator('learn-progression-v17').getByRole('heading',{name:'Progressão A1–B1'})).toBeVisible();
  for(const theme of ['dark','light']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   const dims=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
   expect(dims.actual,`${width}px ${theme}`).toBeLessThanOrEqual(dims.viewport);
  }
 }
});
