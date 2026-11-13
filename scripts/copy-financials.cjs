const fs = require('node:fs');
const path = require('node:path');
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
  fs.copyFileSync('frontend/public/learn/pedagogy-v1/audio-assets.json', 'dist/learn/pedagogy-v1/audio-assets.json');
} else {
  fs.cpSync('frontend/public/learn', 'dist/learn', { recursive: true });
}
fs.cpSync('frontend/public/fonts', 'dist/fonts', { recursive: true });
