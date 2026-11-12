import { readFileSync, writeFileSync } from 'node:fs';

const sourcePath = 'docs/learn-progressao-a1-b1-v10.json';
const outputPath = 'frontend/public/learn/progression-v12.json';
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
if (source.publicRelease !== false || source.cefrCertified !== false) {
  throw new Error('O contrato V10 deve permanecer não certificado e sem liberação pública.');
}

const languageTracks = {};
for (const language of ['en', 'ru']) {
  const track = source.languageTracks?.[language];
  if (!track || track.units?.length !== 15) throw new Error(`Trilha incompleta: ${language}`);
  languageTracks[language] = {
    language,
    stageGuides: track.stageGuides,
    stages: track.units.map(unit => ({
      nodeId: unit.nodeId,
      sequence: unit.sequence,
      level: unit.level,
      existingLessonId: unit.existingLessonId,
      existingLessonTitle: unit.existingLessonTitle,
      existingObjective: unit.existingObjective,
      canDoTarget: unit.canDoTarget,
      checkpointDraft: unit.checkpointDraft,
      prerequisiteNodeIds: unit.prerequisiteNodeIds,
      pairedReadingId: unit.pairedReadingId,
      readingQuestionIds: unit.readingQuestionIds,
      grammarQuestionIds: unit.grammarQuestionIds,
      linkingCaveat: unit.linkingCaveat,
      status: unit.status,
    })),
  };
}

writeFileSync(outputPath, `${JSON.stringify({
  schemaVersion: 1,
  source: sourcePath,
  publicRelease: false,
  cefrCertified: false,
  languageTracks,
}, null, 2)}\n`);
