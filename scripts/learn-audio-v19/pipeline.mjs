#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
export const PRIVATE = path.resolve(process.env.LEARN_AUDIO_V19_DIR || path.join(REPO, 'private/learn-audio-v19'));
const SOURCES_DIR = path.join(PRIVATE, 'sources');
const MODELS_DIR = path.join(PRIVATE, 'models');
const OUTPUT_DIR = path.join(PRIVATE, 'audio');
const MANIFEST_PATH = path.join(PRIVATE, 'manifest.json');
const REVISION = 'cf910fb';
const TERA_REVISION = '4c3bf2eb99c148cb657af10bd3bf717befb714c8';
const TERA_REPO = 'TeraSpace/TeraTTSv2';
const TERA_DIR = path.join(MODELS_DIR, 'teratts');
const TERA_FILES = [
  { path: 'LICENSE', size: 4171 }, { path: 'LICENSE-OPENRAIL', size: 15007 },
  { path: 'README.md', size: 7567 }, { path: 'RUACCENT_NOTICE.txt', size: 1176 },
  { path: 'teratts.py', size: 22443 }, { path: 'teratts_ruaccent.py', size: 13767 },
  { path: 'unicode_indexer.json', size: 262171 },
  { path: 'models/duration_predictor.onnx', size: 1572411, sha256: '15248b4751493fe48543f01164cd9b74d103b4483c63367a01c344442ebf03d8' },
  { path: 'models/sampler_distilled_cfg3_8step.onnx', size: 256417643, sha256: '921a050f19794bf97234ca8ffc0298559eaca466d9f7f3b72ec41dfefb37acc6' },
  { path: 'models/text_encoder.onnx', size: 27910305, sha256: 'd59b7911fe9e465988f26bedbf7c34ef9b2c5588d9b0da5f86d41340a3324a12' },
  { path: 'models/vocoder.onnx', size: 101416199, sha256: 'd4e4cf9a9b9de8cca28f309c4cb7735327322b5a764ba61dfc3706c3c7942c07' },
  { path: 'styles/ru_f1/style_dp.npy', size: 640, sha256: '189e1eabfccf8f0f76a6b10d84ba0fdde18de2ecc2c2e16e3a790f961db95382' },
  { path: 'styles/ru_f1/style_ttl.npy', size: 51328, sha256: '489cb6d10f3e2528d7ac4b3e4d8b01ca54d44b98d193dd26684b16c3a24bd9a7' },
  { path: 'styles/ru_m5/style_dp.npy', size: 640, sha256: '79741747bb75e0dac2357c089bc923926c4a34fe46b5ce9f85376b14b8e59bf9' },
  { path: 'styles/ru_m5/style_ttl.npy', size: 51328, sha256: '6eccc64350dcc23a8e790eebd7abbec24b0055e6451d975deffa899885e26e99' },
  { path: 'ruaccent/dictionary/accents.json.gz', size: 20954156, sha256: 'aa460ebba90de00fbbf3d41d121961f605b98667e45efb7920f127473b15515e' },
  { path: 'ruaccent/dictionary/omographs.json.gz', size: 219047, sha256: '04a9e81c68d65f65ba493fe0110f99e79087548c2beeec3032e2b66e28706f36' },
  { path: 'ruaccent/dictionary/yo_homographs.json.gz', size: 5747 },
  { path: 'ruaccent/dictionary/yo_words.json.gz', size: 548914, sha256: 'a19fa89a964a0691d9fe4ee384783e3934904891843d8f59a1c480d67947a82a' },
];
const MODEL_DEFS = {
  joe: { language: 'en', locale: 'en-US', name: 'en_US-joe-medium', path: 'en/en_US/joe/medium', datasetLicense: 'CC0', base: 'rdh', revision: REVISION, pins: { card: ['d6c9dc095927749342e44c7f5cf99432ff91a3d9', 423], config: ['9dbbd529471dd6064fabc4e6927ede028dc0f94a', 5465], model: ['abf4b998e34045cbd00eaf050de2de620f81ded6eb8b85a24b022a1c2b3f08d2', 63221984] } },
  mike: { language: 'en', locale: 'en-US', name: 'en_US-mike-medium', path: 'en/en_US/mike/medium', datasetLicense: 'CC0', base: 'rdh', revision: REVISION, pins: { card: ['4bd0a14a039ce337361150a68a81d82de7edd582', 424], config: ['92c54d6bb7305bbf2c3332156cde273e3923b814', 5466], model: ['6876866e3dfadc7f044bc5e4fbac16c47b5a1e79eaec04e3bb0c2c6e9da8a857', 63221984] } },
  kristin: { language: 'en', locale: 'en-US', name: 'en_US-kristin-medium', path: 'en/en_US/kristin/medium', datasetLicense: 'Public domain', base: 'trained from scratch', revision: '217ddc7', pins: { card: ['40000a8e64cf5deb284a999cda92af78cdae783a', 479], config: ['e94be84ab0dc3532b4b2b48cbb1f5d4a8746bedd', 4968], model: ['5849957f929cbf720c258f8458692d6103fff2f0e3d3b19c8259474bb06a18d4', 63531379] } },
  denis: { language: 'ru', locale: 'ru-RU', name: 'ru_RU-denis-medium', path: 'ru/ru_RU/denis/medium', datasetLicense: 'CC0', base: 'rdh', revision: REVISION, pins: { card: ['a97e89d1da2fcbced2e4a42ac49a670a1c19c8a8', 418], config: ['ef303184a1b36263939cee3375333b7c8342dbc6', 5464], model: ['879bc365cb14d1380e3f5ed6044162ccf54c99f6161871569b7f830aec3ce841', 63221984] } },
};
const SOURCES = [
  { key: 'bridge', path: 'docs/learn-atividades-ponte-v11.json', commit: 'b0fa03876cb072c75f417b0f6bae504e1be896a1', blobSha: 'e3295b09493fb0547d7eedc6133693d4eadc9519', pr: 116, file: 'v11-bridge.json' },
  { key: 'listening-en', path: 'docs/learn-listening-v13-en.json', commit: '716c1112c2f9b7dedaa99470bf3bf4b1c34d5560', blobSha: 'cbbb3b4c5251c0e9fad5e42838f12e46d89b3057', pr: 118, file: 'v13-listening-en.json' },
  { key: 'listening-ru', path: 'docs/learn-listening-v13-ru.json', commit: '716c1112c2f9b7dedaa99470bf3bf4b1c34d5560', blobSha: 'ef6e28198a3bb0fd946f25a396150beb1b0fff7e', pr: 118, file: 'v13-listening-ru.json' },
  { key: 'dictation-en', path: 'docs/learn-ditados-v14-en.json', commit: '77247cd660af3f3c002cf47d58dfe099a76c0161', blobSha: '4b9d20a94493200d6cba82515ff8f147a8834be0', pr: 119, file: 'v14-dictation-en.json' },
  { key: 'dictation-ru', path: 'docs/learn-ditados-v14-ru.json', commit: '77247cd660af3f3c002cf47d58dfe099a76c0161', blobSha: '6fb3fe502c8315c753535f3432dfa10f354dc654', pr: 119, file: 'v14-dictation-ru.json' },
];
const ALLOWED_STATES = ['planned', 'generated', 'technical_passed', 'awaiting_owner_review', 'approved', 'rejected'];

function ensurePrivate() {
  fs.mkdirSync(PRIVATE, { recursive: true });
  const rel = path.relative(REPO, PRIVATE);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('LEARN_AUDIO_V19_DIR precisa ficar dentro da pasta privada do projeto.');
}

async function requestPinnedFile(url, timeoutMs) {
  try {
    return await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const cause = error.cause?.code || error.cause?.message || error.message;
    throw new Error(`Falha de rede ao acessar a origem pública (${cause}). Nenhum áudio foi criado.`);
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'w' });
  fs.renameSync(temp, file);
}

export function blobSha(content) {
  const bytes = Buffer.from(content, 'utf8');
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

export function verifyPinnedBytes(bytes, expectedDigest, expectedBytes, algorithm = 'sha256') {
  if (bytes.length !== expectedBytes) throw new Error(`tamanho divergente (${bytes.length}; esperado ${expectedBytes}).`);
  const digest = algorithm === 'sha256'
    ? crypto.createHash('sha256').update(bytes).digest('hex')
    : algorithm === 'git-blob-sha1'
      ? blobSha(bytes.toString('utf8'))
      : null;
  if (!digest) throw new Error(`algoritmo de integridade não permitido: ${algorithm}`);
  if (digest !== expectedDigest) throw new Error('hash da origem oficial não confere.');
  return digest;
}

export function verifyModelArtifact(key, filename, bytes) {
  const model = MODEL_DEFS[key];
  if (!model) throw new Error(`Modelo não cadastrado: ${key}`);
  const type = filename === 'MODEL_CARD' ? 'card' : filename.endsWith('.onnx') ? 'model' : filename.endsWith('.onnx.json') ? 'config' : null;
  if (!type) throw new Error(`Artefato de modelo não reconhecido: ${filename}`);
  const [expectedDigest, expectedBytes] = model.pins[type];
  const actual = verifyPinnedBytes(bytes, expectedDigest, expectedBytes, type === 'model' ? 'sha256' : 'git-blob-sha1');
  return { type, digest: actual, bytes: bytes.length };
}

function verifyTeraArtifact(definition, bytes) {
  if (bytes.length !== definition.size) throw new Error(`TeraTTS ${definition.path}: tamanho divergente (${bytes.length}; esperado ${definition.size}).`);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  if (definition.sha256 && digest !== definition.sha256) throw new Error(`TeraTTS ${definition.path}: SHA-256 não confere.`);
  return digest;
}

export function recount(manifest) {
  const counts = { planned: 0, generated: 0, technicalPassed: 0, awaitingOwnerReview: 0, approved: 0, rejected: 0 };
  const keys = { planned: 'planned', generated: 'generated', technical_passed: 'technicalPassed', awaiting_owner_review: 'awaitingOwnerReview', approved: 'approved', rejected: 'rejected' };
  for (const record of manifest.records) if (keys[record.state]) counts[keys[record.state]]++;
  manifest.counts = counts;
  return counts;
}

async function fetchSources() {
  ensurePrivate();
  fs.mkdirSync(SOURCES_DIR, { recursive: true });
  for (const source of SOURCES) {
    const target = path.join(SOURCES_DIR, source.file);
    let content = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (content && blobSha(content) !== source.blobSha) content = '';
    if (!content) {
      const url = `https://raw.githubusercontent.com/Matheus2t/hub-pessoal/${source.commit}/${source.path}`;
      const response = await requestPinnedFile(url, 30000);
      if (!response.ok) throw new Error(`Falha ao buscar fonte ${source.path}: HTTP ${response.status}`);
      content = await response.text();
      if (blobSha(content) !== source.blobSha) throw new Error(`SHA Git divergente para ${source.path}; fonte não será usada.`);
      fs.writeFileSync(target, content, { flag: 'w' });
    }
  }
}

function parseBridgeSegments(text) {
  const markers = [...text.matchAll(/(?:^|\s)([A-Z]):\s*/g)];
  if (!markers.length) return [{ speaker: 'Narrator', text: text.trim() }];
  return markers.map((marker, index) => {
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? text.length;
    return { speaker: marker[1], text: text.slice(start, end).trim() };
  }).filter((segment) => segment.text);
}

function makeRecord({ id, language, kind, level, title, segments, source, version }) {
  if (!id || !['en', 'ru'].includes(language) || !segments.length || segments.some((s) => !s.text.trim())) {
    throw new Error(`Registro editorial incompleto: ${id || '(sem ID)'}`);
  }
  const speakers = [...new Set(segments.map((s) => s.speaker))];
  const audioVoices = language === 'en'
    ? speakers.length <= 1 ? ['joe'] : speakers.length === 2 ? ['joe', 'mike'] : speakers.length === 3 ? ['joe', 'mike', 'kristin'] : []
    : speakers.length <= 1 ? ['denis'] : speakers.length === 2 ? ['tera_ru_f1', 'tera_ru_m5'] : [];
  const blockedReason = audioVoices.length ? null
    : language === 'ru' ? 'licensed_distinct_ru_voices_unavailable'
      : 'licensed_distinct_en_voices_unavailable';
  return {
    id, language, level: level || null, kind, title: title || id,
    source: source.key.startsWith('bridge') ? 'V11' : source.key.startsWith('listening') ? 'V13' : 'V14',
    sourceVersion: version || null,
    sourceProvenance: { pr: source.pr, commit: source.commit, path: source.path, blobSha: source.blobSha },
    scriptSegments: segments,
    referenceText: segments.map((s) => s.text).join(' '),
    scriptSha256: crypto.createHash('sha256').update(segments.map((s) => s.text).join('\n').normalize('NFC')).digest('hex'),
    requiredSpeakerCount: speakers.length,
    plannedVoices: [...new Set(audioVoices)],
    blockedReason,
    generation: { version: 1, engine: 'piper-tts 1.8.0 (local only)', assetPath: null, format: null, durationSeconds: null, bytes: null, sha256: null },
    state: 'planned',
    technicalChecks: null,
    ownerReview: null,
    publicRelease: false,
    assessmentEnabled: false,
  };
}

export function extractRecords(sourceData) {
  const byKey = Object.fromEntries(sourceData.map(({ source, data }) => [source.key, { source, data }]));
  const records = [];
  const bridge = byKey.bridge.data.tasks.filter((task) => /listening/i.test(task.skill || ''));
  for (const task of bridge) records.push(makeRecord({
    id: task.draftId, language: task.language, kind: 'bridge', level: task.targetLevel || task.level,
    title: task.titlePt || task.title || task.objective, segments: parseBridgeSegments(task.stimulusText || ''),
    source: byKey.bridge.source, version: task.reviewVersion,
  }));
  for (const language of ['en', 'ru']) {
    const item = byKey[`listening-${language}`];
    for (const unit of item.data.units) records.push(makeRecord({
      id: unit.draftId, language, kind: 'listening', level: unit.level,
      title: unit.titlePt, segments: (unit.transcript || []).map((turn) => ({ speaker: turn.speaker || 'Narrator', text: turn.text })),
      source: item.source, version: unit.contentVersion || unit.reviewVersion,
    }));
    const dict = byKey[`dictation-${language}`];
    for (const unit of dict.data.units) records.push(makeRecord({
      id: unit.draftId, language, kind: 'dictation', level: unit.targetLevel,
      title: unit.titlePt, segments: [{ speaker: 'Narrator', text: unit.expectedTranscript }],
      source: dict.source, version: unit.reviewVersion || unit.contentVersion,
    }));
  }
  const ids = records.map((record) => record.id);
  if (new Set(ids).size !== ids.length) throw new Error('IDs de exercício duplicados na entrada de áudio.');
  const counts = {
    total: records.length,
    en: records.filter((r) => r.language === 'en').length,
    ru: records.filter((r) => r.language === 'ru').length,
    bridge: records.filter((r) => r.source === 'V11').length,
    listening: records.filter((r) => r.source === 'V13').length,
    dictation: records.filter((r) => r.source === 'V14').length,
  };
  if (counts.total !== 68 || counts.en !== 34 || counts.ru !== 34 || counts.bridge !== 4 || counts.listening !== 32 || counts.dictation !== 32) {
    throw new Error(`Inventário editorial divergente: ${JSON.stringify(counts)}`);
  }
  return records;
}

export function canApplyOwnerDecision(record, decision) {
  return ALLOWED_STATES.includes(record.state)
    && record.state === 'awaiting_owner_review'
    && ['approved', 'rejected'].includes(decision);
}

export function applyOwnerDecision(record, decision, note, reviewedAt = new Date().toISOString()) {
  if (!canApplyOwnerDecision(record, decision)) throw new Error('A decisão exige revisão explícita de uma gravação tecnicamente aprovada.');
  if (decision === 'rejected' && !String(note || '').trim()) throw new Error('Informe o motivo da rejeição para manter a rastreabilidade.');
  return { ...record, state: decision, ownerReview: { decision, note: String(note || '').trim(), reviewedAt } };
}

export function retryRejected(record) {
  if (record.state !== 'rejected') throw new Error('Somente gravações rejeitadas podem iniciar uma nova versão.');
  return {
    ...record,
    previousAttempts: [...(record.previousAttempts || []), {
      generation: record.generation, state: record.state, technicalChecks: record.technicalChecks, ownerReview: record.ownerReview,
    }],
    generation: { ...record.generation, version: record.generation.version + 1, assetPath: null, format: null, durationSeconds: null, bytes: null, sha256: null },
    state: 'planned', technicalChecks: null, ownerReview: null,
  };
}

export function audioConcatLabels(segmentCount) {
  if (!Number.isInteger(segmentCount) || segmentCount < 1) throw new Error('segmentCount precisa ser inteiro positivo.');
  const labels = [];
  for (let index = 0; index < segmentCount; index++) {
    labels.push(`[${2 * index}:a]`);
    if (index < segmentCount - 1) labels.push(`[${2 * index + 1}:a]`);
  }
  return labels;
}

function readSources() {
  return SOURCES.map((source) => {
    const content = fs.readFileSync(path.join(SOURCES_DIR, source.file), 'utf8');
    if (blobSha(content) !== source.blobSha) throw new Error(`SHA Git divergente em ${source.file}`);
    return { source, data: JSON.parse(content) };
  });
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function saveManifest(manifest) {
  recount(manifest);
  manifest.updatedAt = new Date().toISOString();
  writeJson(MANIFEST_PATH, manifest);
}

async function prepare() {
  if (fs.existsSync(MANIFEST_PATH)) throw new Error('O manifesto já existe; não será sobrescrito. Faça uma cópia privada antes de qualquer atualização.');
  await fetchSources();
  const sourceData = readSources();
  const records = extractRecords(sourceData);
  const manifest = {
    schemaVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    publicRelease: false, assessmentEnabled: false,
    editorialAudit: { pr: 123, commit: 'd8afcb10143dacd8b7fb98a5d3c88e45f0c66d4d', path: 'docs/learn-revisao-integrada-v18.json' },
    sourceSnapshots: SOURCES.map(({ key, path: sourcePath, commit, blobSha, pr }) => ({ key, path: sourcePath, commit, blobSha, pr })),
    engine: { name: 'Piper TTS', version: '1.8.0', runtimeLicense: 'GPL-3.0-or-later', usage: 'local generation only; engine is not distributed with Learn' },
    modelSnapshots: Object.entries(MODEL_DEFS).map(([key, model]) => ({
      key, name: model.name, revision: model.revision, path: model.path, locale: model.locale, datasetLicense: model.datasetLicense,
      fineTunedFrom: model.base, modelCardPath: `models/MODEL_CARD_${key}`,
      modelRights: 'Dataset chain listed as permissive by Piper; trained-model/output status remains subject to separate legal review; local-only',
    })),
    counts: { planned: records.length, generated: 0, technicalPassed: 0, awaitingOwnerReview: 0, approved: 0, rejected: 0 },
    records,
  };
  ensurePrivate();
  writeJson(MANIFEST_PATH, manifest);
  return manifest;
}

async function downloadModels() {
  ensurePrivate();
  fs.mkdirSync(MODELS_DIR, { recursive: true });
  for (const [key, model] of Object.entries(MODEL_DEFS)) {
    for (const filename of ['MODEL_CARD', `${model.name}.onnx.json`, `${model.name}.onnx`]) {
    const target = path.join(MODELS_DIR, filename === 'MODEL_CARD' ? `MODEL_CARD_${key}` : `${key}-${filename}`);
      const cached = fs.existsSync(target) ? fs.readFileSync(target) : null;
      if (cached) {
        try {
          verifyModelArtifact(key, filename, cached);
          if (filename === 'MODEL_CARD') validateModelCard(model, cached.toString('utf8'));
          continue;
        } catch { /* Refetch corrupt or stale cache from the pinned official revision. */ }
      }
      const url = `https://huggingface.co/rhasspy/piper-voices/resolve/${model.revision}/${model.path}/${filename}`;
      const response = await requestPinnedFile(url, 120000);
      if (!response.ok) throw new Error(`Download ${filename} falhou (HTTP ${response.status}); nada foi publicado.`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (filename === 'MODEL_CARD') {
        validateModelCard(model, bytes.toString('utf8'));
      }
      verifyModelArtifact(key, filename, bytes);
      const temp = target + '.download';
      fs.writeFileSync(temp, bytes);
      if (fs.existsSync(target)) fs.rmSync(target);
      fs.renameSync(temp, target);
    }
  }
}

async function downloadTeraModels() {
  ensurePrivate();
  for (const definition of TERA_FILES) {
    const target = path.join(TERA_DIR, definition.path);
    const rel = path.relative(TERA_DIR, target);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Caminho de modelo TeraTTS inválido.');
    if (fs.existsSync(target)) {
      try { verifyTeraArtifact(definition, fs.readFileSync(target)); continue; }
      catch { /* Refetch cached files that fail checks against the pinned release. */ }
    }
    const response = await requestPinnedFile(`https://huggingface.co/${TERA_REPO}/resolve/${TERA_REVISION}/${definition.path}`, 300000);
    if (!response.ok) throw new Error(`Download TeraTTS ${definition.path} falhou (HTTP ${response.status}).`);
    const bytes = Buffer.from(await response.arrayBuffer());
    verifyTeraArtifact(definition, bytes);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temp = target + '.download';
    fs.writeFileSync(temp, bytes);
    if (fs.existsSync(target)) fs.rmSync(target);
    fs.renameSync(temp, target);
  }
}

function validateModelCard(model, card) {
  const licenseMatches = model.datasetLicense === 'CC0' ? /CC0/i.test(card) : /public domain/i.test(card);
  const baseMatches = model.base === 'rdh' ? /rdh/i.test(card) : /trained from scratch/i.test(card);
  if (!licenseMatches || !baseMatches) throw new Error(`MODEL_CARD não confirma a licença/base esperadas para ${model.name}; modelo rejeitado.`);
}

function persistModelProvenance(manifest) {
  for (const snapshot of manifest.modelSnapshots) {
    if (snapshot.key === 'terattsv2') continue;
    const def = MODEL_DEFS[snapshot.key];
    const { model, config } = modelPaths(snapshot.key);
    const files = [path.join(MODELS_DIR, `MODEL_CARD_${snapshot.key}`), config, model];
    snapshot.locale = def.locale;
    snapshot.artifacts = files.map((file) => ({
      file: path.relative(PRIVATE, file).replaceAll('\\', '/'),
      bytes: fs.statSync(file).size,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
    }));
  }
}

function modelPaths(key) {
  const def = MODEL_DEFS[key];
  return {
    model: path.join(MODELS_DIR, `${key}-${def.name}.onnx`),
    config: path.join(MODELS_DIR, `${key}-${def.name}.onnx.json`),
  };
}

function run(bin, args, options = {}) {
  const result = spawnSync(bin, args, { cwd: REPO, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) throw new Error(`${bin} falhou: ${result.error?.message || result.stderr?.slice(-1500) || result.status}`);
  return result;
}

function piperBin() {
  return process.env.PIPER_BIN || path.join(PRIVATE, '.venv', 'Scripts', 'piper.exe');
}

export function voicesFor(record) {
  const speakerOrder = [...new Set(record.scriptSegments.map((s) => s.speaker))];
  if (record.language === 'ru' && speakerOrder.length > 2) throw new Error('licensed_distinct_ru_voices_unavailable');
  if (speakerOrder.length > (record.language === 'en' ? 3 : 2)) throw new Error('licensed_distinct_voices_unavailable');
  const assigned = record.language === 'ru'
    ? speakerOrder.length === 2 ? ['tera_ru_f1', 'tera_ru_m5'] : ['denis']
    : speakerOrder.length === 3 ? ['joe', 'mike', 'kristin'] : speakerOrder.length === 2 ? ['joe', 'mike'] : ['joe'];
  return Object.fromEntries(speakerOrder.map((speaker, index) => [speaker, assigned[index]]));
}

function teraModelMetadata(voice) {
  const style = voice.replace('tera_', '');
  const files = [
    ...TERA_FILES.filter(({ path: file }) => file.startsWith('models/')),
    ...TERA_FILES.filter(({ path: file }) => file.startsWith(`styles/${style}/`)),
  ];
  return {
    name: `TeraTTSv2 ${style}`, locale: 'ru-RU', engine: 'TeraTTSv2 ONNX', repository: TERA_REPO,
    modelRevision: TERA_REVISION, license: 'Open RAIL-M with commercial attribution condition; local generation only',
    artifactSha256: files.map((file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(TERA_DIR, file.path))).digest('hex')),
  };
}

function generateRecord(record) {
  const assignment = voicesFor(record);
  const work = path.join(PRIVATE, 'work', record.id, `v${record.generation.version}`);
  fs.mkdirSync(work, { recursive: true });
  const generated = [];
  const usesTera = Object.values(assignment).some((key) => key.startsWith('tera_'));
  if (usesTera) {
    if (!fs.existsSync(path.join(TERA_DIR, 'teratts.py'))) throw new Error('modelo local ausente: terattsv2');
    const requestFile = path.join(work, 'segments.json');
    const python = process.env.TERA_TTS_PYTHON || path.join(PRIVATE, '.venv', 'Scripts', 'python.exe');
    const outputs = record.scriptSegments.map((segment, index) => ({
      text: segment.text,
      voice: assignment[segment.speaker].replace('tera_', ''),
      output: path.join(work, `segment-${String(index + 1).padStart(2, '0')}.wav`),
    }));
    fs.writeFileSync(requestFile, JSON.stringify(outputs), 'utf8');
    run(python, [path.join(HERE, 'teratts_local.py'), TERA_DIR, requestFile]);
    generated.push(...outputs.map(({ output }) => output));
  } else {
    const piper = piperBin();
    for (let i = 0; i < record.scriptSegments.length; i++) {
      const segment = record.scriptSegments[i];
      const modelKey = assignment[segment.speaker];
      if (!modelKey) throw new Error(`Voz ausente para ${segment.speaker}`);
      const { model, config } = modelPaths(modelKey);
      if (!fs.existsSync(model) || !fs.existsSync(config)) throw new Error(`modelo local ausente: ${modelKey}`);
      const input = path.join(work, `segment-${String(i + 1).padStart(2, '0')}.txt`);
      const wav = path.join(work, `segment-${String(i + 1).padStart(2, '0')}.wav`);
      fs.writeFileSync(input, segment.text.normalize('NFC') + '\n');
      run(piper, ['-m', model, '-c', config, '-i', input, '-f', wav, '--sentence-silence', '0.22']);
      generated.push(wav);
    }
  }
  const normalized = usesTera ? generated.map((wav, index) => {
    const target = path.join(work, `segment-${String(index + 1).padStart(2, '0')}-22050.wav`);
    run(process.env.FFMPEG_BIN || 'ffmpeg', ['-v', 'error', '-y', '-i', wav, '-ar', '22050', '-ac', '1', target]);
    return target;
  }) : generated;
  const asset = `${record.id}__v${record.generation.version}.mp3`;
  const output = path.join(OUTPUT_DIR, asset);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const args = [];
  for (let i = 0; i < normalized.length; i++) {
    args.push('-i', normalized[i]);
    if (i < normalized.length - 1) args.push('-f', 'lavfi', '-t', '0.42', '-i', 'anullsrc=r=22050:cl=mono');
  }
  const chain = [];
  chain.push(...audioConcatLabels(normalized.length));
  const concat = chain.join('') + `concat=n=${chain.length}:v=0:a=1,loudnorm=I=-18:TP=-2:LRA=11[out]`;
  args.push('-filter_complex', concat, '-map', '[out]', '-ar', '22050', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '96k', '-write_xing', '0', '-y', output);
  run(process.env.FFMPEG_BIN || 'ffmpeg', args);
  const stat = fs.statSync(output);
  record.generation = {
    ...record.generation, engine: usesTera ? `TeraTTSv2 ONNX (${TERA_REVISION})` : 'piper-tts 1.8.0 (local only)', assetPath: `audio/${asset}`, format: 'mp3', bytes: stat.size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),
    voiceModels: [...new Set(Object.values(assignment))].map((key) => {
      if (key.startsWith('tera_')) return teraModelMetadata(key);
      const def = MODEL_DEFS[key];
      const files = [modelPaths(key).model, modelPaths(key).config];
      return {
        name: def.name, locale: def.locale, modelRevision: def.revision, datasetLicense: def.datasetLicense,
        artifactSha256: files.map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')),
      };
    }),
  };
  record.state = 'generated';
  delete record.blockedReason;
  return record;
}

function validateRecord(record) {
  const abs = path.resolve(PRIVATE, record.generation.assetPath || '');
  if (!record.generation.assetPath || !abs.startsWith(OUTPUT_DIR + path.sep)) throw new Error('assetPath ausente ou fora da pasta privada.');
  if (!fs.existsSync(abs)) throw new Error('arquivo de áudio ausente.');
  const stat = fs.statSync(abs);
  if (stat.size < 2048) throw new Error('arquivo pequeno demais ou silencioso.');
  const probe = run(process.env.FFPROBE_BIN || 'ffprobe', ['-v', 'error', '-show_entries', 'format=duration,format_name', '-show_entries', 'stream=codec_name,sample_rate,channels', '-of', 'json', abs]);
  const metadata = JSON.parse(probe.stdout);
  const duration = Number(metadata.format?.duration);
  const stream = metadata.streams?.[0];
  if (!Number.isFinite(duration) || duration < 0.25 || duration > 240) throw new Error('duração fora do intervalo técnico esperado.');
  if (!String(metadata.format?.format_name).includes('mp3') || stream?.codec_name !== 'mp3' || stream?.sample_rate !== '22050' || stream?.channels !== 1) {
    throw new Error('formato, codec, sample rate ou canais não correspondem ao perfil MP3 mono 22.05 kHz.');
  }
  const decode = run(process.env.FFMPEG_BIN || 'ffmpeg', ['-v', 'error', '-i', abs, '-f', 'null', '-']);
  const volume = run(process.env.FFMPEG_BIN || 'ffmpeg', ['-hide_banner', '-i', abs, '-af', 'volumedetect', '-f', 'null', '-']);
  const mean = Number(volume.stderr.match(/mean_volume:\s*(-?[\d.]+) dB/)?.[1]);
  const peak = Number(volume.stderr.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1]);
  if (!Number.isFinite(mean) || mean < -42 || !Number.isFinite(peak) || peak > -0.1) throw new Error('volume médio silencioso ou pico com risco de clipping.');
  const silence = run(process.env.FFMPEG_BIN || 'ffmpeg', ['-hide_banner', '-i', abs, '-af', 'silencedetect=noise=-48dB:d=1.5', '-f', 'null', '-']);
  const longSilences = [...silence.stderr.matchAll(/silence_duration:\s*([\d.]+)/g)].map((match) => Number(match[1])).filter((seconds) => seconds > 2);
  if (longSilences.length) throw new Error('pausa silenciosa acima de 2 segundos; revisar/gerar nova versão.');
  record.generation.durationSeconds = Math.round(duration * 1000) / 1000;
  record.generation.bytes = stat.size;
  record.generation.sha256 = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
  record.technicalChecks = { status: 'passed', checkedAt: new Date().toISOString(), durationSeconds: record.generation.durationSeconds, meanDb: mean, peakDb: peak, longSilenceCount: 0, decoded: Boolean(decode), checks: ['exists', 'mp3', 'duration', 'size', 'non_silent', 'peak', 'long_silence', 'decode', 'sha256'] };
  record.state = 'technical_passed';
  return record;
}

async function main() {
  const command = process.argv[2] || 'help';
  ensurePrivate();
  if (command === 'prepare') {
    const manifest = await prepare();
    console.log(JSON.stringify({ manifest: MANIFEST_PATH, counts: manifest.counts, sourceSnapshots: manifest.sourceSnapshots.map(({ key, commit, blobSha }) => ({ key, commit, blobSha })) }, null, 2));
    return;
  }
  if (command === 'download-models') {
    await downloadModels();
    const manifest = loadManifest();
    persistModelProvenance(manifest);
    saveManifest(manifest);
    console.log('Modelos baixados e MODEL_CARD validado; arquivos continuam em private/.');
    return;
  }
  if (command === 'download-teratts') {
    await downloadTeraModels();
    const manifest = loadManifest();
    const artifacts = TERA_FILES.map((file) => ({
      file: `models/teratts/${file.path}`,
      bytes: fs.statSync(path.join(TERA_DIR, file.path)).size,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(TERA_DIR, file.path))).digest('hex'),
    }));
    manifest.modelSnapshots = [...manifest.modelSnapshots.filter((snapshot) => snapshot.key !== 'terattsv2'), {
      key: 'terattsv2', repository: TERA_REPO, revision: TERA_REVISION,
      license: 'Open RAIL-M with commercial attribution condition',
      usage: 'local generation only; generated audio remains private pending owner review', artifacts,
    }];
    for (const record of manifest.records) if (record.language === 'ru' && record.requiredSpeakerCount === 2 && record.state === 'planned') {
      record.plannedVoices = ['tera_ru_f1', 'tera_ru_m5'];
      if (record.blockedReason === 'licensed_distinct_ru_voices_unavailable') delete record.blockedReason;
    }
    saveManifest(manifest);
    console.log(JSON.stringify({ repository: TERA_REPO, revision: TERA_REVISION, files: artifacts.length, bytes: artifacts.reduce((total, file) => total + file.bytes, 0), privateDirectory: TERA_DIR }, null, 2));
    return;
  }
  if (command === 'refresh-scripts') {
    await fetchSources();
    const manifest = loadManifest();
    if (manifest.records.some((record) => record.state !== 'planned' || record.generation.assetPath)) {
      throw new Error('Atualização recusada: há gravações geradas ou revisadas; nenhuma evidência será sobrescrita.');
    }
    manifest.records = extractRecords(readSources());
    saveManifest(manifest);
    console.log('Roteiros locais atualizados a partir dos mesmos SHAs fixados; nenhuma gravação foi alterada.');
    return;
  }
  const manifest = loadManifest();
  if (command === 'generate') {
    const requestedId = process.argv[3];
    const requested = requestedId ? manifest.records.find((r) => r.id === requestedId) : null;
    if (requestedId && !requested) throw new Error(`ID de exercício não encontrado: ${requestedId}`);
    if (requested && requested.state !== 'planned') throw new Error(`O item ${requestedId} está em ${requested.state}; somente itens planejados podem ser gerados.`);
    const selected = requested ? [requested] : manifest.records.filter((r) => r.state === 'planned');
    const results = [];
    for (const record of selected) {
      try { generateRecord(record); results.push({ id: record.id, state: record.state }); }
      catch (error) { record.blockedReason = error.message; results.push({ id: record.id, state: record.state, error: error.message }); }
    }
    saveManifest(manifest);
    console.log(JSON.stringify({ attempted: selected.length, generated: results.filter((r) => r.state === 'generated').length, planned: manifest.records.filter((r) => r.state === 'planned').length, blocked: manifest.records.filter((r) => r.state === 'planned' && r.blockedReason).length, results }, null, 2));
    return;
  }
  if (command === 'validate') {
    const requestedId = process.argv[3];
    const requested = requestedId ? manifest.records.find((r) => r.id === requestedId) : null;
    if (requestedId && !requested) throw new Error(`ID de exercício não encontrado: ${requestedId}`);
    if (requested && requested.state !== 'generated') throw new Error(`O item ${requestedId} está em ${requested.state}; somente itens gerados podem ser validados.`);
    const generated = requested ? [requested] : manifest.records.filter((r) => r.state === 'generated');
    for (const record of generated) {
      try { validateRecord(record); }
      catch (error) { record.technicalChecks = { status: 'failed', checkedAt: new Date().toISOString(), error: error.message }; }
    }
    saveManifest(manifest);
    console.log(JSON.stringify({ generated: generated.length, technicalPassed: manifest.records.filter((r) => r.state === 'technical_passed').length, failed: manifest.records.filter((r) => r.technicalChecks?.status === 'failed').length }, null, 2));
    return;
  }
  if (command === 'queue-review') {
    for (const record of manifest.records) if (record.state === 'technical_passed') record.state = 'awaiting_owner_review';
    saveManifest(manifest);
    console.log(`Na fila de revisão do proprietário: ${manifest.records.filter((r) => r.state === 'awaiting_owner_review').length}`);
    return;
  }
  if (command === 'retry') {
    const id = process.argv[3];
    const record = manifest.records.find((r) => r.id === id);
    if (!record) throw new Error('ID não encontrado.');
    const retried = retryRejected(record);
    Object.assign(record, retried);
    saveManifest(manifest);
    console.log(`Nova tentativa ${record.generation.version} preparada para ${record.id}; versões anteriores preservadas.`);
    return;
  }
  console.log('Uso: node scripts/learn-audio-v19/pipeline.mjs prepare|refresh-scripts|download-models|download-teratts|generate|validate|queue-review|retry <id>');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
