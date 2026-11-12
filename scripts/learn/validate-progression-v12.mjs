import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const source = read('docs/learn-progressao-a1-b1-v10.json');
const runtime = read('frontend/public/learn/progression-v12.json');
const projectedTracks = Object.fromEntries(['en', 'ru'].map(language => {
  const track = source.languageTracks[language];
  return [language, {
    language,
    stageGuides: track.stageGuides,
    stages: track.units.map(unit => ({
      nodeId: unit.nodeId, sequence: unit.sequence, level: unit.level,
      existingLessonId: unit.existingLessonId, existingLessonTitle: unit.existingLessonTitle,
      existingObjective: unit.existingObjective, canDoTarget: unit.canDoTarget,
      checkpointDraft: unit.checkpointDraft, prerequisiteNodeIds: unit.prerequisiteNodeIds,
      pairedReadingId: unit.pairedReadingId, readingQuestionIds: unit.readingQuestionIds,
      grammarQuestionIds: unit.grammarQuestionIds, linkingCaveat: unit.linkingCaveat, status: unit.status,
    })),
  }];
}));
assert.deepEqual(runtime, { schemaVersion: 1, source: 'docs/learn-progressao-a1-b1-v10.json', publicRelease: false, cefrCertified: false, languageTracks: projectedTracks });
assert.equal(source.publicRelease, false);
assert.equal(source.cefrCertified, false);
assert.equal(runtime.publicRelease, false);
assert.equal(runtime.cefrCertified, false);

for (const language of ['en', 'ru']) {
  const track = source.languageTracks[language];
  const published = runtime.languageTracks[language];
  const catalog = read(`frontend/public/learn/${language}.json`);
  assert.equal(track.existingExercises, 237, `${language}: catálogo V10`);
  assert.equal(catalog.exercises.length, 237, `${language}: catálogo atual`);
  assert.equal(new Set(catalog.exercises.map(item => item.id)).size, 237, `${language}: IDs únicos`);
  assert.deepEqual(published.stages.map(({ nodeId, sequence, level }) => ({ nodeId, sequence, level })),
    track.units.map(({ nodeId, sequence, level }) => ({ nodeId, sequence, level })));
  assert.deepEqual(published.stageGuides, track.stageGuides);
  assert.deepEqual(published.stages.map(({ nodeId, sequence, level, existingLessonId, existingLessonTitle, existingObjective, canDoTarget, checkpointDraft, prerequisiteNodeIds, pairedReadingId, readingQuestionIds, grammarQuestionIds, linkingCaveat, status }) => ({ nodeId, sequence, level, existingLessonId, existingLessonTitle, existingObjective, canDoTarget, checkpointDraft, prerequisiteNodeIds, pairedReadingId, readingQuestionIds, grammarQuestionIds, linkingCaveat, status })),
    track.units.map(({ nodeId, sequence, level, existingLessonId, existingLessonTitle, existingObjective, canDoTarget, checkpointDraft, prerequisiteNodeIds, pairedReadingId, readingQuestionIds, grammarQuestionIds, linkingCaveat, status }) => ({ nodeId, sequence, level, existingLessonId, existingLessonTitle, existingObjective, canDoTarget, checkpointDraft, prerequisiteNodeIds, pairedReadingId, readingQuestionIds, grammarQuestionIds, linkingCaveat, status })));
  assert.equal(published.stages.length, 15);
  assert.deepEqual(['A1', 'A2', 'B1'].map(level => published.stages.filter(stage => stage.level === level).length), [4, 6, 5]);
  const lessons = new Map(catalog.lessons.map(item => [item.id, item]));
  const readings = new Map(catalog.readings.map(item => [item.id, item]));
  const exercises = new Map(catalog.exercises.map(item => [item.id, item]));
  const questionIds = [];
  for (const [index, stage] of published.stages.entries()) {
    assert.equal(stage.sequence, index + 1);
    assert.equal(stage.status, 'draft_mapping_not_published');
    assert.equal(lessons.get(stage.existingLessonId)?.title, stage.existingLessonTitle);
    assert.equal(readings.has(stage.pairedReadingId), true);
    assert.equal(stage.prerequisiteNodeIds.every(id => published.stages.findIndex(x => x.nodeId === id) < index), true);
    assert.equal(stage.grammarQuestionIds.length, 3);
    assert.equal(stage.readingQuestionIds.length, 3);
    for (const id of stage.grammarQuestionIds) assert.equal(exercises.get(id)?.skill === 'grammar', true, `${language}:${id}`);
    for (const id of stage.readingQuestionIds) assert.equal(exercises.get(id)?.skill === 'reading', true, `${language}:${id}`);
    questionIds.push(...stage.grammarQuestionIds, ...stage.readingQuestionIds);
  }
  assert.equal(new Set(questionIds).size, 90, `${language}: mapping sem colisões`);
}
assert.equal(runtime.languageTracks.en.stages.length + runtime.languageTracks.ru.stages.length, 30);
assert.equal(read('frontend/public/learn/en.json').exercises.length + read('frontend/public/learn/ru.json').exercises.length, 474);

const bridge = read('docs/learn-atividades-ponte-v11-archive.json');
assert.equal(bridge.status, 'editorial_review_complete_independent_review_required');
assert.equal(bridge.audioValidation, 'no_audio_created_or_validated');
assert.equal(execFileSync('git', ['hash-object', 'docs/learn-atividades-ponte-v11-archive.json'], { encoding: 'utf8' }).trim(), 'a798803152de2ce793be2169d38faa7173d51e92');
assert.equal(bridge.tasks.length, 24);
assert.deepEqual(['en', 'ru'].map(language => bridge.tasks.filter(task => task.language === language).length), [12, 12]);
for (const language of ['en', 'ru']) {
  assert.deepEqual(bridge.tasks.filter(task => task.language === language).map(task => task.draftId), Array.from({ length: 12 }, (_, index) => `${language}-bridge-v10-${String(index + 1).padStart(2, '0')}`));
  assert.deepEqual(['A1_to_A2', 'A2_to_B1'].map(transition => bridge.tasks.filter(task => task.language === language && task.transition === transition).length), [6, 6]);
}
for (const task of bridge.tasks) {
  assert.equal(task.public, false);
  assert.equal(task.existingCatalogExercise, false);
  assert.equal(task.workflowStatus, 'draft_requires_independent_review');
  assert.equal(task.reviewStatus, 'editorial_reviewed_requires_independent_teacher_validation');
  assert.ok(Array.isArray(task.acceptedAnswerExamples) && task.acceptedAnswerExamples.length);
  assert.ok(Array.isArray(task.scoringCriteria) && task.scoringCriteria.length);
  if (task.audioStatus === 'script_only_no_audio_licensed_or_assessed') assert.equal(task.rubricPolicy, 'not_assessable_until_audio_review');
}

function listFiles(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const full = join(path, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}
const publicFiles = listFiles('frontend/public/learn');
for (const task of bridge.tasks) {
  assert.equal(publicFiles.some(path => readFileSync(path, 'utf8').includes(task.draftId)), false, `atividade ponte exposta: ${task.draftId}`);
}
assert.equal('bridgeTasks' in runtime, false);
console.log('Progressão V12 válida: 30 etapas; 474 exercícios preservados; 24 pontes V11 arquivadas e fora dos assets públicos.');
