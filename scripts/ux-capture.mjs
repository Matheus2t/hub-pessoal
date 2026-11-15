import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const phase = process.argv[2] || 'before';
if (!['before', 'after'].includes(phase)) throw new Error('Use: node scripts/ux-capture.mjs before|after');

const base = process.env.BASE_URL || 'http://127.0.0.1:8123';
const root = path.resolve(`docs/ux-refinement-deep/evidence/${phase}`);
const routes = [
  ['home', '#/'], ['calculator-catalog', '#/calculadoras'],
  ['compound', '#/calculadora'], ['simple', '#/juros-simples'],
  ['price', '#/price'], ['retirement', '#/aposentadoria'],
  ['actions-overview', '#/acoes'], ['actions-company', '#/acoes/PETR4'],
  ['fixed-income', '#/renda-fixa'], ['call-lobby', '#/call'],
  ['learn-overview', '#/learn'], ['learn-en', '#/learn/en'],
  ['learn-en-vocabulary', '#/learn/en/vocabulary'], ['learn-ru', '#/learn/ru'],
  ['learn-ru-vocabulary', '#/learn/ru/vocabulary'], ['teams-overview', '#/times'],
  ['team-76ers', '#/76ers'], ['team-spfc', '#/spfc'], ['team-barcelona', '#/barcelona'],
  ['games-catalog', '#/games'], ['game-sudoku', '#/games/sudoku'],
];
const viewports = [320, 390, 768, 1024, 1366, 1440, 1920].map((width) => [
  String(width), { width, height: width <= 390 ? 844 : 900 },
]);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const metrics = [];

try {
  for (const [name, route] of routes) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    await page.goto(`${base}/${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.locator('main.main-content').waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    for (const [viewportName, viewport] of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);
      for (const theme of ['dark', 'light']) {
        await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
        await page.waitForTimeout(100);
        const metricsForPage = await page.evaluate(() => {
          const visible = (selector) => [...document.querySelectorAll(selector)]
            .filter((node) => node.getBoundingClientRect().width > 0)
            .map((node) => { const r = node.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }; });
          return { viewport: innerWidth, document: document.documentElement.scrollWidth,
            title: document.querySelector('main h1')?.textContent?.trim() || '',
            panels: visible('panel-workspace > [slot], .ws-cell, .tool-card, .arcade-tile, .team-hero, .call-panel') };
        });
        metrics.push({ name, route, viewport: viewportName, theme, ...metricsForPage });
        if (viewportName === '1366' || viewportName === '390') {
          const target = path.join(root, `${name}-${viewportName}-${theme}.png`);
          await mkdir(path.dirname(target), { recursive: true });
          await page.screenshot({ path: target, fullPage: true, animations: 'disabled' });
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

await mkdir(root, { recursive: true });
await writeFile(path.join(root, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
console.log(`Captured ${metrics.length} layouts for ${routes.length} routes in ${root}`);
