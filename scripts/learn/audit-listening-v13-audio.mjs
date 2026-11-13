#!/usr/bin/env node
// Local-only technical audit. Never copies private MP3s into the repository build.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const privateRoot = resolve(process.env.LEARN_AUDIO_V19_DIR || resolve(root, 'private/learn-audio-v19'));
const manifestPath = resolve(privateRoot, 'manifest.json');
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const outputPath = process.argv.includes('--out') ? resolve(process.argv[process.argv.indexOf('--out') + 1]) : null;
const issues = [];

if (!existsSync(manifestPath)) throw new Error('V19 privado ausente; defina LEARN_AUDIO_V19_DIR. Nenhum áudio foi copiado.');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.publicRelease !== false || manifest.assessmentEnabled !== false) throw new Error('Manifesto V19 não está no estado privado esperado.');
const units = ['en', 'ru'].flatMap(language => {
  const data = JSON.parse(readFileSync(resolve(root, `docs/learn-listening-v13-${language}.json`), 'utf8'));
  return data.units.map(unit => ({...unit, language}));
});
const records = manifest.records.filter(record => record.source === 'V13' && record.kind === 'listening');
const byId = new Map(records.map(record => [record.id, record]));
if (units.length !== 32 || records.length !== 32 || byId.size !== 32) issues.push(`inventário V13: ${units.length} roteiros / ${records.length} registros / ${byId.size} IDs únicos`);

const run = (binary, args) => {
  const result = spawnSync(binary, args, {encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024});
  if (result.error) throw result.error;
  return result;
};
const normalize = text => String(text || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
const hashFile = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const probeDuration = file => {
  const result = run(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]);
  const duration = Number(result.stdout.trim());
  return result.status === 0 && Number.isFinite(duration) ? duration : null;
};
const rows = [];

for (const unit of units) {
  const record = byId.get(unit.draftId);
  const row = {id: unit.draftId, language: unit.language, level: unit.level, title: unit.titlePt};
  if (!record) {
    rows.push({...row, file: 'ausente', technical: 'FALHA', note: 'registro de manifesto ausente'});
    issues.push(`${unit.draftId}: registro V19 ausente`);
    continue;
  }
  row.file = String(record.generation?.assetPath || '').split(/[\\/]/).at(-1) || 'sem arquivo';
  row.state = record.state;
  const assetRelative = record.generation?.assetPath;
  const file = resolve(privateRoot, String(assetRelative || ''));
  const rel = relative(privateRoot, file);
  if (!assetRelative || isAbsolute(assetRelative) || rel === '..' || rel.startsWith(`..${sep}`) || !file.startsWith(privateRoot + sep)) {
    row.technical = 'FALHA'; row.note = 'caminho do ativo fora da pasta privada';
    issues.push(`${unit.draftId}: caminho privado inválido`); rows.push(row); continue;
  }
  if (!existsSync(file) || !lstatSync(file).isFile() || lstatSync(file).isSymbolicLink()) {
    row.technical = 'FALHA'; row.note = 'arquivo ausente ou não regular';
    issues.push(`${unit.draftId}: arquivo ausente/não regular`); rows.push(row); continue;
  }
  const stat = statSync(file);
  const hash = hashFile(file);
  const declaredBytes = record.generation?.bytes;
  const hashMatches = hash === record.generation?.sha256;
  const bytesMatch = stat.size === declaredBytes;
  row.bytes = stat.size;
  row.sha = hash.slice(0, 12);
  row.integrity = hashMatches && bytesMatch ? 'ok' : 'falha';
  if (!hashMatches || !bytesMatch) issues.push(`${unit.draftId}: hash/tamanho diferente do manifesto`);

  const probeResult = run(ffprobe, ['-v','error','-show_entries','format=duration,bit_rate,size:stream=codec_name,codec_type,sample_rate,channels,channel_layout,bit_rate','-of','json',file]);
  let probe;
  try { probe = JSON.parse(probeResult.stdout); } catch { probe = null; }
  const stream = probe?.streams?.filter(item => item.codec_type === 'audio') || [];
  const duration = Number(probe?.format?.duration || stream[0]?.duration);
  row.duration = Number.isFinite(duration) ? duration.toFixed(2) : 'n/a';
  row.codec = stream[0]?.codec_name || 'n/a';
  row.rate = stream[0]?.sample_rate || 'n/a';
  row.channels = stream[0]?.channels || 'n/a';
  const durationMatches = Number.isFinite(duration) && Math.abs(duration - Number(record.technicalChecks?.durationSeconds)) <= 0.15;
  row.durationMatch = durationMatches ? 'ok' : 'falha';
  if (probeResult.status !== 0 || stream.length !== 1 || row.codec !== 'mp3' || !durationMatches) issues.push(`${unit.draftId}: metadata de codec/duração inválidos`);

  const decoded = run(ffmpeg, ['-v','error','-i',file,'-f','null','-']);
  row.decode = decoded.status === 0 ? 'ok' : 'falha';
  if (decoded.status !== 0) issues.push(`${unit.draftId}: ffmpeg não decodificou completamente`);

  const signal = run(ffmpeg, ['-hide_banner','-nostats','-i',file,'-af','silencedetect=noise=-50dB:d=0.5,volumedetect','-f','null','-']);
  const signalText = `${signal.stdout || ''}\n${signal.stderr || ''}`;
  const mean = signalText.match(/mean_volume:\s*(-?[\d.]+) dB/i)?.[1];
  const peak = signalText.match(/max_volume:\s*(-?[\d.]+) dB/i)?.[1];
  const silences = [...signalText.matchAll(/silence_duration:\s*([\d.]+)/gi)].map(match => Number(match[1]));
  const starts = [...signalText.matchAll(/silence_start:\s*([\d.]+)/gi)].map(match => Number(match[1]));
  row.meanDb = mean ?? 'n/a';
  row.peakDb = peak ?? 'n/a';
  row.longSilences = silences.length;
  row.longestSilence = Math.max(0, ...silences).toFixed(2);
  if (signal.status !== 0 || mean === undefined || peak === undefined) issues.push(`${unit.draftId}: análise de volume/silêncio falhou`);
  if (Number(peak) > -0.2 || Number(mean) < -35 || starts.length > 0 && silences.length !== starts.length) issues.push(`${unit.draftId}: nível ou corte/silêncio exige inspeção humana`);

  const transcript = normalize(unit.transcript.map(line => line.text).join(' '));
  const referenceMatches = transcript === normalize(record.referenceText);
  row.transcript = referenceMatches ? 'ok' : 'falha';
  if (!referenceMatches) issues.push(`${unit.draftId}: transcrição do manifesto diverge do roteiro`);
  const wordCount = (transcript.match(/[\p{L}\p{N}]+/gu) || []).length;
  row.words = wordCount;
  const wordsPerSecond = Number.isFinite(duration) && duration > 0 ? wordCount / duration : Infinity;
  row.wordsPerSecond = Number.isFinite(wordsPerSecond) ? wordsPerSecond.toFixed(2) : 'n/a';
  const workDir = resolve(privateRoot, 'work', unit.draftId, `v${record.generation?.version || 1}`);
  const expectedSegments = unit.transcript.length;
  let observedSegments = [];
  if (existsSync(workDir) && statSync(workDir).isDirectory()) {
    observedSegments = Array.from({length: expectedSegments + 2}, (_, index) => resolve(workDir, `segment-${String(index + 1).padStart(2, '0')}.wav`))
      .filter(segment => existsSync(segment) && lstatSync(segment).isFile() && !lstatSync(segment).isSymbolicLink());
  }
  const intermediateDurations = observedSegments.map(probeDuration).filter(Number.isFinite);
  const intermediateSeconds = intermediateDurations.reduce((sum, value) => sum + value, 0);
  row.segments = `${observedSegments.length}/${expectedSegments}`;
  row.workSeconds = intermediateDurations.length === observedSegments.length ? intermediateSeconds.toFixed(2) : 'n/a';
  row.assembly = observedSegments.length ? 'auxiliares; vínculo não comprovado' : 'indisponíveis';
  const implausibleRate = wordsPerSecond > 7.5;
  row.contentPlausibility = implausibleRate ? 'suspeita de truncamento' : 'sem anomalia de duração';
  if (implausibleRate) issues.push(`${unit.draftId}: duração muito curta para o texto (${wordCount} palavras em ${row.duration}s; ${row.wordsPerSecond} palavras/s), provável truncamento; exige confirmação auditiva`);
  const locales = [...new Set((record.generation?.voiceModels || []).map(model => model.locale || ''))];
  const expectedLocale = unit.language === 'en' ? /^en(?:-|$)/i : /^ru(?:-|$)/i;
  row.modelLocale = locales.length && locales.every(locale => expectedLocale.test(locale)) ? locales.join(', ') : `revisar: ${locales.join(', ') || 'ausente'}`;
  if (!locales.length || !locales.every(locale => expectedLocale.test(locale))) issues.push(`${unit.draftId}: locale declarada do modelo não corresponde ao idioma`);
  row.technical = row.integrity === 'ok' && row.durationMatch === 'ok' && row.decode === 'ok' && row.transcript === 'ok'
    ? implausibleRate ? 'REVISAR' : 'OK'
    : 'FALHA';
  rows.push(row);
}

const hashGroups = new Map();
for (const row of rows) if (row.sha) hashGroups.set(row.sha, [...(hashGroups.get(row.sha) || []), row.id]);
for (const [sha, ids] of hashGroups) if (ids.length > 1) issues.push(`áudio duplicado (${sha}): ${ids.join(', ')}`);
const table = [
  '# 2T Learn V13 — relatório técnico individual dos áudios', '',
  `Arquivos examinados: ${rows.length}; registros V13 no manifesto: ${records.length}. Manifesto privado: publicRelease=false, assessmentEnabled=false.`,
  'Os arquivos permanecem fora do repositório, do build e do relatório. A inspeção técnica não confirma idioma falado, pronúncia, prosódia, naturalidade nem aprovação pedagógica.', '',
  'As 17 atividades com múltiplos segmentos foram regeneradas como V2 em diretório privado isolado, usando os mesmos roteiros e a montagem corrigida da pipeline. Os 15 áudios de segmento único permanecem V1. Os 32 V1 originais seguem preservados no manifesto original; todas as gravações continuam em `awaiting_owner_review`.',
  '', '### Correção da montagem', '',
  'O montador FFmpeg intercalava WAVs e pausas, mas reutilizava o índice `i` em vez de `2*i` para cada fala; em diálogos, isso substituía falas posteriores por entradas de silêncio. `audioConcatLabels` agora produz os índices corretos, com testes para 1–4 segmentos. As 17 V2 passaram pelo validador da pipeline (17/17); a aprovação auditiva continua pendente.', '',
  '| ID | Idioma/nível | Arquivo | Bytes | Duração s | Palavras / palavras/s | WAVs auxiliares / segmentos | Vínculo da montagem | MP3 / Hz / canais | Média dB / pico dB | Silêncios ≥0,5s / máximo s | Hash/tamanho | Decodificação | Roteiro/locale declarados | Resultado técnico | Estado |',
  '|---|---|---|---:|---:|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(row => `| ${row.id} | ${row.language}/${row.level} | ${row.file} | ${row.bytes ?? '—'} | ${row.duration ?? '—'} | ${row.words ?? '—'} / ${row.wordsPerSecond ?? '—'} | ${row.workSeconds ?? '—'} / ${row.segments ?? '—'} | ${row.assembly ?? '—'} | ${row.codec ?? '—'} / ${row.rate ?? '—'} / ${row.channels ?? '—'} | ${row.meanDb ?? '—'} / ${row.peakDb ?? '—'} | ${row.longSilences ?? '—'} / ${row.longestSilence ?? '—'} | ${row.integrity ?? '—'} | ${row.decode ?? '—'} | ${row.transcript ?? '—'} / ${row.modelLocale ?? '—'} | ${row.technical ?? 'FALHA'} (${row.contentPlausibility ?? '—'}) | ${row.state ?? 'ausente'} |`),
  '',
  '## Critérios e limites',
  '',
  '- FFprobe verifica contêiner/codec, duração, taxa de amostragem e canais; FFmpeg decodifica e mede volume/silêncio. SHA-256 e tamanho são confrontados com o manifesto V19; roteiro e locale são confrontados com os metadados declarados, não com uma transcrição automática do áudio. Palavras/s é apenas um alerta de duração extrema (>7,5); não prova o que foi falado. WAVs auxiliares são listados apenas como contexto, pois não há hash/proveniência que comprove serem exatamente a fonte do MP3 atual.',
  '- O locale do modelo é apenas metadado de geração. Não identifica automaticamente o idioma efetivamente falado nem detecta pronúncia, entonação, ritmo natural, artefatos perceptivos ou aderência integral da fala ao roteiro.',
  '- Resultado técnico não altera `awaiting_owner_review`, `audioAssessmentEnabled=false`, `notAssessed` ou `uncertain`.',
  '',
  `Arquivos decodificáveis e com integridade básica aprovada: ${rows.filter(row => row.integrity === 'ok' && row.durationMatch === 'ok' && row.decode === 'ok').length}/${rows.length}; revisão por duração extrema: ${rows.filter(row => row.technical === 'REVISAR').length}; falhas de integridade/decodificação: ${rows.filter(row => row.technical === 'FALHA').length}. Alertas: ${issues.length}.`,
  ...(issues.length ? issues.map(issue => `- ${issue}`) : ['Nenhuma falha técnica objetiva nos critérios automatizados.']),
  ''
].join('\n');

if (outputPath) writeFileSync(outputPath, table, 'utf8');
process.stdout.write(table);
if (issues.length) process.exitCode = 1;
