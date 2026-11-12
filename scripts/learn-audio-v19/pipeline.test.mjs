import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyOwnerDecision, blobSha, canApplyOwnerDecision, extractRecords, retryRejected,
} from './pipeline.mjs';
import { isAllowedHost, isLoopback, safeAsset } from './reviewer.mjs';

function syntheticSources() {
  const bridge = { tasks: Array.from({ length: 4 }, (_, i) => ({
    draftId: `${i < 2 ? 'en' : 'ru'}-bridge-v11-${i}`, language: i < 2 ? 'en' : 'ru',
    skill: 'listening_script', targetLevel: 'A1-A2', objective: 'bridge', reviewVersion: 'v11.1',
    stimulusText: i % 2 === 0 ? 'A: Hello there. B: How are you?' : 'A: Идём домой. B: Да, сейчас.',
  })) };
  const listening = {};
  const dictation = {};
  for (const language of ['en', 'ru']) {
    listening[language] = { units: Array.from({ length: 16 }, (_, i) => ({
      draftId: `${language}-listen-v13-${i + 1}`, level: i < 8 ? 'A2' : 'B1',
      titlePt: 'fixture sem conteúdo editorial', contentVersion: 'v13.1',
      transcript: i === 0 ? [{ speaker: 'A', text: 'Hello.' }, { speaker: 'B', text: 'Hi.' }]
        : i === 1 && language === 'en' ? [{ speaker: 'A', text: 'First.' }, { speaker: 'B', text: 'Second.' }, { speaker: 'C', text: 'Third.' }]
          : i === 2 && language === 'en' ? [{ speaker: 'A', text: 'First.' }, { speaker: 'B', text: 'Second.' }, { speaker: 'C', text: 'Third.' }, { speaker: 'D', text: 'Fourth.' }]
          : [{ speaker: 'Narrator', text: language === 'en' ? 'A short English test.' : 'Проверочная фраза.' }],
    })) };
    dictation[language] = { units: Array.from({ length: 16 }, (_, i) => ({
      draftId: `${language}-dict-v14-${i + 1}`, targetLevel: i < 8 ? 'A2' : 'B1',
      titlePt: 'fixture sem conteúdo editorial', expectedTranscript: language === 'en' ? 'Where is the station?' : 'Где станция?',
    })) };
  }
  return [
    { source: { key: 'bridge', pr: 116, commit: 'b0fa03876cb072c75f417b0f6bae504e1be896a1', path: 'v11.json', blobSha: 'a'.repeat(40) }, data: bridge },
    ...['en', 'ru'].map((language) => ({ source: { key: `listening-${language}`, pr: 118, commit: '716c1112c2f9b7dedaa99470bf3bf4b1c34d5560', path: `v13-${language}.json`, blobSha: 'b'.repeat(40) }, data: listening[language] })),
    ...['en', 'ru'].map((language) => ({ source: { key: `dictation-${language}`, pr: 119, commit: '77247cd660af3f3c002cf47d58dfe099a76c0161', path: `v14-${language}.json`, blobSha: 'c'.repeat(40) }, data: dictation[language] })),
  ];
}

test('inventory is balanced, unique and excludes speaker labels from spoken text', () => {
  const records = extractRecords(syntheticSources());
  assert.equal(records.length, 68);
  assert.equal(records.filter((r) => r.language === 'en').length, 34);
  assert.equal(records.filter((r) => r.language === 'ru').length, 34);
  assert.equal(records.filter((r) => r.source === 'V11').length, 4);
  assert.equal(records.filter((r) => r.source === 'V13').length, 32);
  assert.equal(records.filter((r) => r.source === 'V14').length, 32);
  assert.equal(new Set(records.map((r) => r.id)).size, 68);
  assert.equal(records[0].referenceText, 'Hello there. How are you?');
  assert.ok(records.every((r) => r.publicRelease === false && r.assessmentEnabled === false));
});

test('voice policy assigns three distinct English voices and blocks unsupported Russian dialogs', () => {
  const records = extractRecords(syntheticSources());
  assert.equal(records.find((r) => r.id === 'en-listen-v13-1').blockedReason, null);
  assert.deepEqual(records.find((r) => r.id === 'en-listen-v13-2').plannedVoices, ['joe', 'mike', 'kristin']);
  assert.equal(records.find((r) => r.id === 'en-listen-v13-3').blockedReason, 'licensed_distinct_en_voices_unavailable');
  assert.equal(records.find((r) => r.id === 'ru-listen-v13-1').blockedReason, 'licensed_distinct_ru_voices_unavailable');
});

test('owner approval requires explicit awaiting-review state and keeps provenance', () => {
  const item = { id: 'en-audio-01', state: 'awaiting_owner_review', sourceProvenance: { commit: 'pinned' }, technicalChecks: { status: 'passed' } };
  assert.equal(canApplyOwnerDecision({ ...item, state: 'technical_passed' }, 'approved'), false);
  assert.throws(() => applyOwnerDecision({ ...item, state: 'technical_passed' }, 'approved', '', '2026-11-12T00:00:00Z'));
  assert.throws(() => applyOwnerDecision(item, 'rejected', '', '2026-11-12T00:00:00Z'));
  const approved = applyOwnerDecision(item, 'approved', '', '2026-11-12T00:00:00Z');
  assert.equal(approved.state, 'approved');
  assert.deepEqual(approved.sourceProvenance, item.sourceProvenance);
  assert.equal(approved.ownerReview.reviewedAt, '2026-11-12T00:00:00Z');
});

test('rejected audio retry increments version and preserves the rejected attempt', () => {
  const rejected = { id: 'ru-audio-01', state: 'rejected', generation: { version: 2, assetPath: 'audio/ru-audio-01__v2.mp3', sha256: 'hash' }, technicalChecks: { status: 'passed' }, ownerReview: { decision: 'rejected', note: 'prosody' } };
  assert.throws(() => retryRejected({ ...rejected, state: 'approved' }));
  const retry = retryRejected(rejected);
  assert.equal(retry.state, 'planned');
  assert.equal(retry.generation.version, 3);
  assert.equal(retry.generation.assetPath, null);
  assert.equal(retry.previousAttempts[0].generation.assetPath, 'audio/ru-audio-01__v2.mp3');
  assert.equal(retry.previousAttempts[0].ownerReview.note, 'prosody');
});

test('review server is loopback-only and rejects paths outside private audio directory', () => {
  assert.equal(isLoopback('127.0.0.1'), true);
  assert.equal(isLoopback('::ffff:127.0.0.1'), true);
  assert.equal(isLoopback('192.0.2.1'), false);
  assert.equal(isAllowedHost('127.0.0.1:8787', 8787), true);
  assert.equal(isAllowedHost('matheus2t.com.br', 8787), false);
  assert.equal(safeAsset({ generation: { assetPath: 'audio/example__v1.mp3' } })?.endsWith('example__v1.mp3'), true);
  assert.equal(safeAsset({ generation: { assetPath: '../frontend/public/learn/audio/file.mp3' } }), null);
});

test('Git blob hash is deterministic and changes with source text', () => {
  assert.equal(blobSha('editorial source\n'), blobSha('editorial source\n'));
  assert.notEqual(blobSha('editorial source\n'), blobSha('altered source\n'));
});
