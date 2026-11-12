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
const MODEL_DEFS = {
  joe: { language: 'en', locale: 'en-US', name: 'en_US-joe-medium', path: 'en/en_US/joe/medium', datasetLicense: 'CC0', base: 'rdh', revision: REVISION },
  mike: { language: 'en', locale: 'en-US', name: 'en_US-mike-medium', path: 'en/en_US/mike/medium', datasetLicense: 'CC0', base: 'rdh', revision: REVISION },
  kristin: { language: 'en', locale: 'en-US', name: 'en_US-kristin-medium', path: 'en/en_US/kristin/medium', datasetLicense: 'Public domain', base: 'trained from scratch', revision: '217ddc7' },
  denis: { language: 'ru', locale: 'ru-RU', name: 'ru_RU-denis-medium', path: 'ru/ru_RU/denis/medium', datasetLicense: 'CC0', base: 'rdh', revision: REVISION },
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
    : speakers.length <= 1 ? ['denis'] : [];
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
      const url = `https://huggingface.co/rhasspy/piper-voices/resolve/${model.revision}/${model.path}/${filename}`;
      const response = await requestPinnedFile(url, 120000);
      if (!response.ok) throw new Error(`Download ${filename} falhou (HTTP ${response.status}); nada foi publicado.`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (filename === 'MODEL_CARD') {
        const card = bytes.toString('utf8');
        const licenseMatches = model.datasetLicense === 'CC0' ? /CC0/i.test(card) : /public domain/i.test(card);
        const baseMatches = model.base === 'rdh' ? /rdh/i.test(card) : /trained from scratch/i.test(card);
        if (!licenseMatches || !baseMatches) throw new Error(`MODEL_CARD de ${model.name} não confirma a licença/base esperadas; modelo rejeitado.`);
      }
      const temp = target + '.download';
      fs.writeFileSync(temp, bytes);
      fs.renameSync(temp, target);
    }
  }
}

function persistModelProvenance(manifest) {
  for (const snapshot of manifest.modelSnapshots) {
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

function voicesFor(record) {
  if (record.blockedReason) throw new Error(record.blockedReason);
  const speakerOrder = [...new Set(record.scriptSegments.map((s) => s.speaker))];
  if (record.language === 'ru' && speakerOrder.length > 1) throw new Error('licensed_distinct_ru_voices_unavailable');
  if (speakerOrder.length > (record.language === 'en' ? 3 : 1)) throw new Error('licensed_distinct_voices_unavailable');
  const assigned = record.language === 'ru' ? ['denis'] : speakerOrder.length === 3 ? ['joe', 'mike', 'kristin'] : speakerOrder.length === 2 ? ['joe', 'mike'] : ['joe'];
  return Object.fromEntries(speakerOrder.map((speaker, index) => [speaker, assigned[index]]));
}

function generateRecord(record) {
  const piper = piperBin();
  const assignment = voicesFor(record);
  const work = path.join(PRIVATE, 'work', record.id, `v${record.generation.version}`);
  fs.mkdirSync(work, { recursive: true });
  const generated = [];
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
  const asset = `${record.id}__v${record.generation.version}.mp3`;
  const output = path.join(OUTPUT_DIR, asset);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const args = [];
  for (let i = 0; i < generated.length; i++) {
    args.push('-i', generated[i]);
    if (i < generated.length - 1) args.push('-f', 'lavfi', '-t', '0.42', '-i', 'anullsrc=r=22050:cl=mono');
  }
  const chain = [];
  for (let i = 0; i < generated.length; i++) {
    chain.push(`[${i}:a]`);
    if (i < generated.length - 1) chain.push(`[${2 * i + 1}:a]`);
  }
  const concat = chain.join('') + `concat=n=${chain.length}:v=0:a=1,loudnorm=I=-18:TP=-2:LRA=11[out]`;
  args.push('-filter_complex', concat, '-map', '[out]', '-ar', '22050', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '96k', '-write_xing', '0', '-y', output);
  run(process.env.FFMPEG_BIN || 'ffmpeg', args);
  const stat = fs.statSync(output);
  record.generation = {
    ...record.generation, assetPath: `audio/${asset}`, format: 'mp3', bytes: stat.size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),
    voiceModels: [...new Set(Object.values(assignment))].map((key) => {
      const def = MODEL_DEFS[key];
      const files = [modelPaths(key).model, modelPaths(key).config];
      return {
        name: def.name, locale: def.locale, modelRevision: def.revision, datasetLicense: def.datasetLicense,
        artifactSha256: files.map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')),
      };
    }),
  };
  record.state = 'generated';
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
    const selected = manifest.records.filter((r) => r.state === 'planned');
    for (const record of selected) {
      try { generateRecord(record); }
      catch (error) { record.blockedReason = error.message; }
    }
    saveManifest(manifest);
    console.log(JSON.stringify({ generated: manifest.records.filter((r) => r.state === 'generated').length, planned: manifest.records.filter((r) => r.state === 'planned').length, blocked: manifest.records.filter((r) => r.state === 'planned' && r.blockedReason).length }, null, 2));
    return;
  }
  if (command === 'validate') {
    const generated = manifest.records.filter((r) => r.state === 'generated');
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
  console.log('Uso: node scripts/learn-audio-v19/pipeline.mjs prepare|refresh-scripts|download-models|generate|validate|queue-review|retry <id>');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
