#!/usr/bin/env node
// Validação estrutural (não linguística, auditiva ou de CEFR) para os roteiros V13.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const files = ['en', 'ru'].map(language => ({
  language,
  path: resolve(root, 'docs', `learn-listening-v13-${language}.json`)
}));
const seenUnits = new Set();
const seenQuestions = new Set();
const errors = [];
let unitsCount = 0;
let questionsCount = 0;
const count = {en: {A2: 0, B1: 0}, ru: {A2: 0, B1: 0}};

const fail = (where, error) => errors.push(`${where}: ${error}`);
for (const {language, path} of files) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  if (data.language !== language || data.schemaVersion !== 1) fail(path, 'metadata divergente');
  if (data.publicRelease !== false || data.cefrCertified !== false) fail(path, 'release/certificação indevida');
  if (data.audioStatus !== 'script_only_no_audio_generated_or_validated') fail(path, 'status de áudio indevido');
  if (data.internalEditorialReview?.round !== 'v18' || data.internalEditorialReview?.releaseAllowed !== false ||
      data.internalEditorialReview?.audioValidated !== false || data.internalEditorialReview?.ownerAcceptancePending !== true)
    fail(path, 'revisão V18/liberação editorial ausente ou insegura');
  for (const unit of data.units || []) {
    const where = unit.draftId || '?';
    unitsCount++;
    if (seenUnits.has(where)) fail(where, 'ID duplicado');
    seenUnits.add(where);
    if (!new RegExp(`^${language}-listen-v13-\\d{2}$`).test(where)) fail(where, 'padrão de ID incorreto');
    if (unit.language !== language) fail(where, 'idioma incorreto');
    if (!['A2', 'B1'].includes(unit.level)) { fail(where, 'nível fora do escopo'); continue; }
    count[language][unit.level]++;
    if (unit.public !== false || unit.productionStatus !== 'script_only_no_recording') fail(where, 'release/acervo de áudio indevido');
    if (unit.reviewStatus !== 'editorial_draft_requires_independent_language_review') fail(where, 'homologação não pode ser automática');
    const match = new RegExp(`^${language}-path-(\\d{2})$`).exec(unit.stageNodeId || '');
    const stage = match ? Number(match[1]) : NaN;
    if (Number.isNaN(stage) || (unit.level === 'A2' && (stage < 5 || stage > 10)) || (unit.level === 'B1' && (stage < 11 || stage > 15))) fail(where, 'mapeamento de trilha incompatível com nível');
    const words = (unit.transcript || []).flatMap(x => String(x.text || '').trim().split(/\s+/)).filter(Boolean).length;
    if (words < (unit.level === 'A2' ? 18 : 45)) fail(where, 'roteiro curto demais para o limite de integridade escolhido');
    if (!unit.transcript?.length || unit.transcript.some(x => !x.speaker || !x.text?.trim())) fail(where, 'falas faltando');
    if (unit.questions?.length !== (unit.level === 'A2' ? 2 : 3)) fail(where, 'quantidade de questões');
    const kinds = (unit.questions || []).map(x => x.kind);
    if (kinds[0] !== 'single_choice' || kinds[1] !== 'short_answer' || (unit.level === 'B1' && kinds[2] !== 'single_choice')) fail(where, 'ordem de questões');
    for (const q of unit.questions || []) {
      questionsCount++;
      if (seenQuestions.has(q.id)) fail(where, 'ID de questão duplicado');
      seenQuestions.add(q.id);
      if (!q.promptPt?.trim()) fail(q.id, 'enunciado ausente');
      if (q.kind === 'single_choice') {
        const options = q.options || [];
        if (options.length !== 3 || new Set(options.map(o => o.id)).size !== 3 || new Set(options.map(o => o.label)).size !== 3) fail(q.id, 'alternativas não distintas');
        if (!options.some(o => o.id === q.correctOptionId) || !q.evidence?.trim()) fail(q.id, 'gabarito/evidência ausente');
      } else if (q.kind === 'short_answer') {
        if (!q.modelPt || !q.essentialEvidence || !q.acceptedExamplesPt?.length || q.scoring !== 'human_or_uncertain_no_strict_string_match') fail(q.id, 'rubrica aberta ausente/inadequada');
      } else fail(q.id, 'tipo de questão inválido');
    }
  }
}
if (unitsCount !== 32 || questionsCount !== 80 || Object.values(count).some(x => x.A2 !== 8 || x.B1 !== 8)) fail('geral', 'inventário diferente de 32 roteiros / 80 questões / 8 por nível-idioma');
if (errors.length) {
  console.error('Falhou:', errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('V13 OK (somente estrutura): 32 roteiros / 80 questões / Inglês e Russo 8 A2 + 8 B1.');
}
