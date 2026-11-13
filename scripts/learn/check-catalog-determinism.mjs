import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const generator = path.join(root, 'scripts/learn/build-catalogs.py');
const collections = ['words', 'phrases', 'readings', 'lessons', 'exercises'];

function generate(outputRoot) {
  const candidates = process.platform === 'win32'
    ? [['python', []], ['py', ['-3']], ['python3', []]]
    : [['python3', []], ['python', []]];
  const failures = [];
  for (const [command, prefix] of candidates) {
    const result = spawnSync(command, [...prefix, generator, '--output-root', outputRoot], {
      cwd: root, encoding: 'utf8', windowsHide: true
    });
    if (!result.error && result.status === 0) return;
    if (result.error?.code !== 'ENOENT') {
      failures.push(`${command}: ${result.stderr || result.error?.message || `exit ${result.status}`}`);
    }
  }
  throw new Error(`Could not run the Python catalog generator. ${failures.join(' | ')}`);
}

function summarize(expected, generated, language) {
  // Callers pass parsed catalog objects; do not attempt to read them as paths.
  // Broken diagnostics must not hide the actual first catalog drift.

  console.error(`Catalog mismatch (${language}):`);
  for (const collection of collections) {
    const left = new Map(expected[collection].map(item => [item.id, item]));
    const right = new Map(generated[collection].map(item => [item.id, item]));
    const missing = [...left.keys()].filter(id => !right.has(id)).slice(0, 8);
    const extra = [...right.keys()].filter(id => !left.has(id)).slice(0, 8);
    const changed = [...left.keys()].filter(id => right.has(id) && JSON.stringify(left.get(id)) !== JSON.stringify(right.get(id))).slice(0, 12);
    if (missing.length || extra.length || changed.length) {
      console.error(`  ${collection}: missing=${missing.join(',')} extra=${extra.join(',')} changed=${changed.join(',')}`);
    }
  }
}

const temp = mkdtempSync(path.join(os.tmpdir(), '2t-learn-catalog-check-'));
try {
  const outputs = [path.join(temp, 'first'), path.join(temp, 'second')];
  for (const output of outputs) generate(output);
  let total = 0;
  const generatedIds = [];
  for (const language of ['en', 'ru']) {
    const filename = `${language}.json`;
    const expected = path.join(root, 'frontend/public/learn', filename);
    const first = path.join(outputs[0], filename);
    const second = path.join(outputs[1], filename);
    const a = readFileSync(first);
    const b = readFileSync(second);
    const committed = readFileSync(expected);
    if (!a.equals(b)) throw new Error(`Repeated generation is not deterministic for ${filename}.`);
    if (!isDeepStrictEqual(JSON.parse(a), JSON.parse(committed))) {
      summarize(JSON.parse(committed), JSON.parse(a), language);
      throw new Error(`Generated ${filename} differs from the versioned catalog.`);
    }
    const ids = JSON.parse(a).exercises.map(item => item.id);
    if (ids.length !== 237 || new Set(ids).size !== ids.length) {
      throw new Error(`${language} exercise count/ID integrity failed (${ids.length}).`);
    }
    generatedIds.push(...ids);
    total += ids.length;
  }
  if (total !== 474) throw new Error(`Expected 474 exercises; found ${total}.`);
  const inventory = readFileSync(path.join(root, 'docs/learn-revisao-itens-474.csv'), 'utf8');
  const inventoryIds = inventory.split(/\r?\n/).slice(1).filter(Boolean)
    .map(line => line.match(/^"(?:en|ru)","([^"]+)"/)?.[1]).filter(Boolean);
  if (inventoryIds.length !== 474 || new Set(inventoryIds).size !== 474 ||
      generatedIds.some(id => !inventoryIds.includes(id)) || inventoryIds.some(id => !generatedIds.includes(id))) {
    throw new Error('Generated exercise IDs do not match the 474-item editorial inventory.');
  }
  console.log('Catalog generation is reproducible in two runs and semantically identical to both versioned catalogs; all 474 exercise IDs are preserved.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
