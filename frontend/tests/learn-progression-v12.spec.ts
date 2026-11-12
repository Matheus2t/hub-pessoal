import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { normalize, resolve, sep } from 'node:path';
import type { Attempt, Backup } from '../src/learn/model';
import { isLearnProgressionPreviewEnabled } from '../src/learn/pilot-preview';
import { progressionSummary, stageStudyProgress } from '../src/learn/progression';
import type { ProgressionTrack } from '../src/learn/progression';
import en from '../public/learn/en.json';
import ru from '../public/learn/ru.json';
import manifest from '../public/learn/progression-v12.json';

const empty: Backup = { format: '2t-learn', version: 3, exportedAt: 1, attempts: [], cards: [], planning: [], lessonEvents: [], lessonProgress: [] };
const tracks = manifest.languageTracks as Record<'en' | 'ru', ProgressionTrack>;
const attempt = (id: string, language: 'en' | 'ru', itemId: string): Attempt => ({
  id, language, itemId, skill: 'grammar', topic: 'stage test', answer: 'response', expected: 'expected', correct: false, at: 1000, seconds: 2,
});
test.beforeEach(async ({ page }) => {
  const dist = resolve('dist');
  await page.route('http://127.0.0.1:3000/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const file = normalize(resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`));
    if (!file.startsWith(`${dist}${sep}`) || !existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
    const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
    const contentType = ext === '.html' ? 'text/html' : ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.json' || ext === '.webmanifest' ? 'application/json' : ext === '.svg' ? 'image/svg+xml' : 'application/octet-stream';
    return route.fulfill({ status: 200, contentType, body: readFileSync(file) });
  });
});

test('V12 declares 30 ordered stages and keeps all 474 catalog exercises untouched', () => {
  for (const language of ['en', 'ru'] as const) {
    const stages = tracks[language].stages;
    expect(stages).toHaveLength(15);
    expect(stages.map(stage => stage.sequence)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    expect(['A1', 'A2', 'B1'].map(level => stages.filter(stage => stage.level === level).length)).toEqual([4, 6, 5]);
    expect(new Set((language === 'en' ? en : ru).exercises.map(exercise => exercise.id)).size).toBe(237);
  }
  expect(en.exercises.length + ru.exercises.length).toBe(474);
  expect(manifest.publicRelease).toBe(false);
  expect(manifest.cefrCertified).toBe(false);
});

test('study progress counts distinct saved answers, includes uncertain/wrong as study only, and isolates languages', () => {
  const first = tracks.en.stages[0];
  const id = first.grammarQuestionIds[0];
  const progress = stageStudyProgress(first, [attempt('one', 'en', id), attempt('two', 'en', id), attempt('three', 'ru', first.grammarQuestionIds[1])], 'en');
  expect(progress).toEqual({ answered: 1, total: 6, complete: false, inProgress: true });
  const all = [...first.grammarQuestionIds, ...first.readingQuestionIds].map((itemId, i) => attempt(`done-${i}`, 'en', itemId));
  expect(stageStudyProgress(first, all, 'en').complete).toBe(true);
  expect(progressionSummary(tracks.en, { ...empty, attempts: all }, 'en').completed).toBe(1);
  expect(progressionSummary(tracks.ru, { ...empty, attempts: all }, 'ru').completed).toBe(0);
});

test('V12 preview requires loopback and the exact opt-in; public host and preview query stay blocked', () => {
  expect(isLearnProgressionPreviewEnabled('localhost', '?learn-preview=progression-v12')).toBe(true);
  expect(isLearnProgressionPreviewEnabled('127.0.0.1', '?learn-preview=progression-v12')).toBe(true);
  expect(isLearnProgressionPreviewEnabled('matheus2t.com.br', '?learn-preview=progression-v12')).toBe(false);
  expect(isLearnProgressionPreviewEnabled('matheus2t.vercel.app', '?learn-preview=progression-v12')).toBe(false);
  expect(isLearnProgressionPreviewEnabled('localhost', '?learn-preview=c5-integration')).toBe(false);
});

test('local route displays the guided progression and keeps bridge activities unavailable on mobile and desktop', async ({ page }) => {
  for (const width of [1366, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 850 });
    for (const colorScheme of ['dark', 'light'] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto('/?learn-preview=progression-v12#/learn/en/progression');
      await expect(page.getByRole('heading', { name: 'Progressão de estudo' })).toBeVisible();
      await expect(page.locator('.learn-progression-stage')).toHaveCount(15);
      await expect(page.getByText('Atividades-ponte V11 indisponíveis')).toBeVisible();
      await expect(page.getByText(/en-bridge-v10/)).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});

test('Russian stage data remains isolated in the interface', async ({ page }) => {
  await page.goto('/?learn-preview=progression-v12#/learn/ru/progression');
  await expect(page.locator('.learn-progression-kicker')).toContainText('РУССКИЙ');
  await expect(page.locator('.learn-progression-stage')).toHaveCount(15);
  await expect(page.getByRole('heading', { name: 'Грамматика', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Cirílico e leitura' })).toBeVisible();
});

test('direct V12 route without the local preview flag shows only the blocked state', async ({ page }) => {
  await page.goto('/#/learn/en/progression');
  await expect(page.getByRole('heading', { name: 'Prévia indisponível' })).toBeVisible();
  await expect(page.locator('.learn-progression-stage')).toHaveCount(0);
});

test('submitted activity IDs persist and resume once after reload; wrong answers do not unlock mastery', async ({ page }) => {
  await page.goto('/?learn-preview=progression-v12#/learn/en/progression');
  const first = tracks.en.stages[0];
  const [itemId, duplicateId, ruId] = [first.grammarQuestionIds[0], first.grammarQuestionIds[0], tracks.ru.stages[0].grammarQuestionIds[0]];
  const rows = [attempt('en-one', 'en', itemId), attempt('en-duplicate', 'en', duplicateId), attempt('ru-one', 'ru', ruId)];
  await page.evaluate(async (items: Attempt[]) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('2t-learn', 3); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const tx = db.transaction('attempts', 'readwrite');
    for (const item of items) tx.objectStore('attempts').put(item);
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(tx.error); });
    db.close();
  }, rows);
  await page.reload();
  const card = page.locator('.learn-progression-stage').first();
  await expect(card.getByText('1/6 atividades respondidas')).toBeVisible();
  await expect(card.getByText('Em andamento')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar Gramática' }).first().click();
  await expect(page.locator('learn-session')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar à progressão' }).click();
  await expect(page.locator('.learn-progression-stage').first().getByText('1/6 atividades respondidas')).toBeVisible();
});
