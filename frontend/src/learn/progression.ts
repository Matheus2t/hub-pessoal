import type { Attempt, Backup, Language } from './model';

export interface ProgressionStage {
  nodeId: string;
  sequence: number;
  level: 'A1' | 'A2' | 'B1';
  existingLessonId: string;
  existingLessonTitle: string;
  existingObjective: string;
  canDoTarget: string;
  checkpointDraft: string;
  prerequisiteNodeIds: string[];
  pairedReadingId: string;
  readingQuestionIds: string[];
  grammarQuestionIds: string[];
  linkingCaveat: string;
  status: 'draft_mapping_not_published';
}

export interface ProgressionTrack {
  language: Language;
  stageGuides: Record<'A1' | 'A2' | 'B1', { label: string; exit: string }>;
  stages: ProgressionStage[];
}

export interface ProgressionManifest {
  schemaVersion: 1;
  source: string;
  publicRelease: false;
  cefrCertified: false;
  languageTracks: Record<Language, ProgressionTrack>;
}

export interface StageStudyProgress {
  answered: number;
  total: number;
  complete: boolean;
  inProgress: boolean;
}

export function stageQuestionIds(stage: ProgressionStage): string[] {
  return [...new Set([...stage.grammarQuestionIds, ...stage.readingQuestionIds])];
}

/** Counts distinct submitted activity IDs, never scores or infers mastery. */
export function stageStudyProgress(stage: ProgressionStage, attempts: Attempt[], language: Language): StageStudyProgress {
  const ids = new Set(stageQuestionIds(stage));
  const answered = new Set(attempts.filter(attempt => attempt.language === language && ids.has(attempt.itemId)).map(attempt => attempt.itemId));
  const total = ids.size;
  return { answered: answered.size, total, complete: total > 0 && answered.size === total, inProgress: answered.size > 0 && answered.size < total };
}

export function progressionSummary(track: ProgressionTrack, backup: Backup, language: Language) {
  const attempts = backup.attempts.filter(attempt => attempt.language === language);
  const stages = [...track.stages].sort((a, b) => a.sequence - b.sequence);
  const progress = new Map(stages.map(stage => [stage.nodeId, stageStudyProgress(stage, attempts, language)]));
  const completed = stages.filter(stage => progress.get(stage.nodeId)!.complete).length;
  const next = stages.find(stage => !progress.get(stage.nodeId)!.complete && stage.prerequisiteNodeIds.every(id => progress.get(id)?.complete));
  return { attempts, stages, progress, completed, next };
}
