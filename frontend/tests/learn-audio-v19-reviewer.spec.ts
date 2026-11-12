import { test, expect } from "@playwright/test";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

let server: ChildProcessWithoutNullStreams;
let privateFixture: string;
let reviewUrl: string;
let serverOutput = "";

async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => probe.once("error", reject).listen(0, "127.0.0.1", resolve));
  const address = probe.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a loopback port.");
  await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

test.beforeAll(async () => {
  const repo = process.cwd();
  const privateRoot = path.resolve(repo, "private/learn-audio-v19/tests");
  privateFixture = path.join(privateRoot, `playwright-${process.pid}-${Date.now()}`);
  mkdirSync(privateFixture, { recursive: true });
  writeFileSync(path.join(privateFixture, "manifest.json"), JSON.stringify({
    schemaVersion: 1, publicRelease: false, assessmentEnabled: false,
    counts: { planned: 2, generated: 0, technicalPassed: 0, awaitingOwnerReview: 0, approved: 0, rejected: 0 },
    records: [{
      id: "en-v19-fixture-01", language: "en", level: "A2", kind: "listening", source: "V13",
      title: "Fixture local de revisão", referenceText: "This is a private review fixture.",
      state: "planned", blockedReason: "fixture_only", publicRelease: false, assessmentEnabled: false,
      generation: { version: 1, assetPath: null, format: null, durationSeconds: null, bytes: null, sha256: null },
      technicalChecks: null, ownerReview: null,
    }, {
      id: "ru-v19-fixture-02", language: "ru", level: "A2", kind: "dictation", source: "V14",
      title: "Fixture de ditado russo", referenceText: "Тестовая фраза.", state: "planned",
      publicRelease: false, assessmentEnabled: false,
      generation: { version: 1, assetPath: null, format: null, durationSeconds: null, bytes: null, sha256: null },
      technicalChecks: null, ownerReview: null,
    }],
  }, null, 2));
  const port = await freePort();
  server = spawn(process.execPath, [path.join(repo, "scripts/learn-audio-v19/reviewer.mjs")], {
    cwd: repo, env: { ...process.env, LEARN_AUDIO_REVIEW_PORT: String(port), LEARN_AUDIO_V19_DIR: privateFixture },
    stdio: "pipe",
  });
  server.stdout.on("data", (chunk: Buffer) => { serverOutput += chunk.toString(); });
  server.stderr.on("data", (chunk: Buffer) => { serverOutput += chunk.toString(); });
  const deadline = Date.now() + 8000;
  while (!serverOutput.includes("Revisão privada ativa")) {
    if (server.exitCode !== null) throw new Error(`Reviewer exited: ${serverOutput}`);
    if (Date.now() > deadline) throw new Error(`Reviewer did not start: ${serverOutput}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  reviewUrl = serverOutput.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/)?.[0] || "";
  if (!reviewUrl) throw new Error("Reviewer did not issue a local session URL.");
});

test.afterAll(async () => {
  if (server && server.exitCode === null) server.kill();
  if (privateFixture) {
    const base = path.resolve(process.cwd(), "private/learn-audio-v19/tests") + path.sep;
    const target = path.resolve(privateFixture);
    if (!target.startsWith(base)) throw new Error("Refusing to remove a test folder outside its private workspace.");
    rmSync(target, { recursive: true, force: true });
  }
});

test("private review page requires its one-session token and serves only local data", async ({ page, request }) => {
  const deniedPage = await request.get(new URL("/", reviewUrl).origin + "/");
  expect(deniedPage.status()).toBe(404);
  const deniedApi = await request.get(new URL("/api/manifest", reviewUrl).toString());
  expect(deniedApi.status()).toBe(401);
  const session = new URL(reviewUrl);
  const token = session.searchParams.get("token") ?? "";
  const crossOrigin = await request.post(new URL("/api/review", reviewUrl).toString(), {
    headers: { Authorization: `Bearer ${token}`, Origin: "https://untrusted.invalid" },
    data: { id: "en-v19-fixture-01", decision: "approved", note: "" },
  });
  expect(crossOrigin.status()).toBe(403);
  const unplayedApproval = await request.post(new URL("/api/review", reviewUrl).toString(), {
    headers: { Authorization: `Bearer ${token}`, Origin: session.origin },
    data: { id: "en-v19-fixture-01", decision: "approved", note: "" },
  });
  expect(unplayedApproval.status()).toBe(409);

  const response = await page.goto(reviewUrl);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Revisão de gravações" })).toBeVisible();
  await expect(page.getByText("LOCAL • PRIVADO")).toBeVisible();
  await expect(page.getByText("Fixture local de revisão")).toBeVisible();
  await expect(page.getByText(/Aprovar uma gravação nesta tela não autoriza sua publicação/)).toBeVisible();
  expect(await page.locator("audio").count()).toBe(0);
  await page.locator("#language").selectOption("ru");
  await expect(page.getByText("Fixture de ditado russo")).toBeVisible();
  await expect(page.getByText("Fixture local de revisão")).toHaveCount(0);
  await page.locator("#language").selectOption("all");
  await page.locator("#kind").selectOption("dictation");
  await expect(page.getByText("Fixture de ditado russo")).toBeVisible();
  await expect(page.getByText("Fixture local de revisão")).toHaveCount(0);
});

test("reviewer stays within desktop/mobile viewport and respects both color schemes", async ({ page }) => {
  await page.goto(reviewUrl);
  for (const width of [1920, 1366, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
  }
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await page.locator("body").evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgb(16, 16, 16)");
  await page.emulateMedia({ colorScheme: "light" });
  expect(await page.locator("body").evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgb(246, 246, 246)");
});
