const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
fs.cpSync('frontend/public/financials', 'dist/financials', { recursive: true });

// Generate a compact annual view from already-reviewed CVM snapshots.
// The frontend reads one local JSON instead of requesting dozens of company files.
const root = 'dist/financials';
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const companies = {};
for (const [symbol, identity] of Object.entries(manifest.companies)) {
  const data = JSON.parse(fs.readFileSync(path.join(root, identity.path), 'utf8'));
  const latest = data.periods.filter(p => p.kind === 'annual' && /^\d{4}-12-31$/.test(p.end))
    .sort((a, b) => b.end.localeCompare(a.end))[0];
  if (!latest) continue;
  const finite = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
  companies[symbol] = {
    year: latest.end.slice(0, 4),
    profit: finite(latest.values.profit),
    roe: finite(latest.values.roe),
    scope: latest.document.scope,
  };
}
fs.writeFileSync(path.join(root, 'directory-summary.json'), JSON.stringify({
  processed_at: manifest.processed_at, source: 'CVM/DFP', companies,
}));
fs.cpSync('frontend/public/teams', 'dist/teams', { recursive: true });
// In public deployments, do not copy internal/pilot/diagnostic source JSON,
// draft answer keys, or loopback preview manifests to the web asset directory.
// Local npm builds retain those files for existing localhost-only previews.
const publicLearnBuild = process.env.VERCEL === '1' || process.env.LEARN_PUBLIC_BUILD === '1';
fs.rmSync('dist/learn', { recursive: true, force: true });
if (publicLearnBuild) {
  fs.mkdirSync('dist/learn/pedagogy-v1', { recursive: true });
  for (const name of ['en.json', 'ru.json']) {
    fs.copyFileSync(path.join('frontend/public/learn', name), path.join('dist/learn', name));
  }
  // Required by the public legacy audio availability UI; this manifest
  // exposes only metadata, and never private V13/V14/V19 recordings.
  const audioManifestPath = 'frontend/public/learn/pedagogy-v1/audio-assets.json';
  const audioManifest = JSON.parse(fs.readFileSync(audioManifestPath, 'utf8'));
  fs.copyFileSync(audioManifestPath, 'dist/learn/pedagogy-v1/audio-assets.json');
  const studyAudio = audioManifest.assets.filter(asset => asset.releaseType === 'public-study-only');
  if (studyAudio.length !== 60 || studyAudio.filter(asset => asset.language === 'en').length !== 30 || studyAudio.filter(asset => asset.language === 'ru').length !== 30) {
    throw new Error('Build público recusado: o inventário de áudios de estudo não corresponde aos 30 estímulos por idioma.');
  }
  for (const asset of studyAudio) {
    const expectedUrl = `/learn/audio/${asset.language}/${asset.activityId}.mp3`;
    const source = path.resolve('frontend/public', `.${expectedUrl}`);
    const relative = path.relative(path.resolve('frontend/public'), source);
    if (asset.skill !== 'listening' || asset.id !== `catalog:${asset.language}:${asset.activityId}` ||
        !new RegExp(`^${asset.language}-listening-\\d{3}$`).test(asset.activityId) || asset.assetUrl !== expectedUrl ||
        asset.validationStatus !== 'technical-passed-study-only' || asset.assessmentEnabled !== false ||
        asset.licenseStatus !== 'CC0 voice-model/data chain (official Piper commercial-use list); exercise text authored in 2T' ||
        !/^[a-f0-9]{64}$/i.test(asset.sha256 || '') || relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(source)) {
      throw new Error(`Build público recusado: áudio de estudo sem proveniência ou política válida (${asset.id}).`);
    }
    const digest = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
    if (digest !== asset.sha256) throw new Error(`Build público recusado: SHA-256 divergente (${asset.id}).`);
    const target = path.resolve('dist', `.${expectedUrl}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
} else {
  fs.cpSync('frontend/public/learn', 'dist/learn', { recursive: true });
}
fs.cpSync('frontend/public/fonts', 'dist/fonts', { recursive: true });
