const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSync } = require("esbuild");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "2t-mind-r2-client-"));
const bundle = path.join(temp, "r2-upload.cjs");
buildSync({
  entryPoints: [path.join(root, "frontend/src/mind/r2-upload.ts")],
  outfile: bundle, bundle: true, platform: "node", format: "cjs",
});
const client = require(bundle);
const PART_BYTES = 16 * 1024 * 1024;
const OWNER = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";
const UPLOAD = "33333333-3333-4333-8333-333333333333";
const KEY = `videos/${OWNER}/${ITEM}-44444444-4444-4444-8444-444444444444.mp4`;
const CAPABILITY = "C".repeat(43);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function setup({ size = 20, failFirstPart = false, partsAfterFailure = [] } = {}) {
  globalThis.__2T_MIND_R2_ENABLED__ = true;
  globalThis.__2T_MIND_R2_URL__ = "https://r2-worker.example.workers.dev";
  globalThis.__2T_MIND_CLOUD_ENABLED__ = true;
  globalThis.__2T_MIND_SUPABASE_URL__ = "https://unit-test.supabase.co";
  globalThis.__2T_MIND_SUPABASE_KEY__ = "sb_publishable_unit_test";
  const session = new Map();
  session.set("2t-mind-supabase-session-v1", JSON.stringify({
    access_token: "short-lived-test-token", refresh_token: "test-refresh-token",
    expires_at: Date.now() + 60_000, user_id: OWNER,
  }));
  globalThis.sessionStorage = {
    getItem: key => session.get(key) ?? null,
    setItem: (key, value) => session.set(key, String(value)),
    removeItem: key => session.delete(key),
    get length() { return session.size; },
    key: index => [...session.keys()][index] ?? null,
  };
  const calls = [];
  let failed = false;
  let statusCount = 0;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    calls.push({ path: url.pathname, method: init.method ?? "GET", headers: new Headers(init.headers) });
    if (url.pathname === "/admin/uploads" && init.method === "POST") {
      return json({ id: UPLOAD, key: KEY, status: "reserved" });
    }
    if (url.pathname === `/admin/uploads/${UPLOAD}` && (init.method ?? "GET") === "GET") {
      statusCount++;
      return json({ id: UPLOAD, itemId: ITEM, key: KEY, size, status: "reserved", uploadId: "r2-multipart-id",
        parts: statusCount > 1 ? partsAfterFailure : [] });
    }
    if (url.pathname === `/admin/uploads/${UPLOAD}/complete`) {
      return json({ id: UPLOAD, itemId: ITEM, key: KEY, size, status: "completed", uploadId: "r2-multipart-id", parts: [] });
    }
    if (url.pathname === `/admin/uploads/${UPLOAD}/cancel`) return json({ ok: true });
    throw new Error(`Unexpected test fetch: ${init.method ?? "GET"} ${url.pathname}`);
  };
  globalThis.XMLHttpRequest = class FakeXhr {
    upload = {};
    headers = new Map();
    status = 0;
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(name, value) { this.headers.set(name.toLowerCase(), value); }
    send(blob) {
      calls.push({ path: new URL(this.url).pathname, method: this.method, headers: this.headers, bytes: blob.size });
      if (failFirstPart && !failed) {
        failed = true;
        queueMicrotask(() => this.onerror?.());
        return;
      }
      queueMicrotask(() => {
        this.upload.onprogress?.({ lengthComputable: true, loaded: blob.size });
        this.status = 200;
        this.onload?.();
      });
    }
    abort() { this.onabort?.(); }
  };
  const file = {
    size,
    slice(start, end) { return { size: end - start }; },
  };
  return { calls, file, session };
}

test.after(() => fs.rmSync(temp, { recursive: true, force: true }));

test("browser uploader sends exact 16 MiB blocks and reports sent/confirmed bytes", async () => {
  const total = PART_BYTES + 10;
  const { calls, file } = setup({ size: total });
  const progress = [];
  const result = await client.uploadMindR2Video(file, ITEM, OWNER, "lecture.mp4", value => progress.push(value));
  assert.equal(result.storagePath, KEY);
  assert.equal(calls.filter(call => call.bytes !== undefined).map(call => call.bytes).join(","), `${PART_BYTES},10`);
  assert.ok(calls.filter(call => call.bytes !== undefined).every(call => call.headers.get("authorization") === "Bearer short-lived-test-token"));
  assert.ok(progress.some(value => value.sent === PART_BYTES && value.confirmed === PART_BYTES));
  assert.equal(progress.at(-1).confirmed, total);
  assert.ok(calls.some(call => call.path === `/admin/uploads/${UPLOAD}/complete`));
});

test("browser uploader resumes a block confirmed after a network interruption", async () => {
  const { calls, file } = setup({ size: 20, failFirstPart: true, partsAfterFailure: [{ partNumber: 1, size: 20 }] });
  await client.uploadMindR2Video(file, ITEM, OWNER, "lecture.mp4", () => {});
  assert.equal(calls.filter(call => call.bytes !== undefined).length, 1);
  assert.equal(calls.filter(call => call.path === `/admin/uploads/${UPLOAD}` && call.method === "GET").length, 2);
  assert.ok(calls.some(call => call.path === `/admin/uploads/${UPLOAD}/complete`));
});

test("browser cancellation requires server confirmation and preserves the cancellation result", async () => {
  const { calls, file } = setup({ size: 20 });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(client.uploadMindR2Video(file, ITEM, OWNER, "lecture.mp4", () => {}, controller.signal),
    error => error.message.startsWith("Upload cancelado."));
  assert.ok(calls.some(call => call.path === `/admin/uploads/${UPLOAD}/cancel`));
  assert.equal(calls.some(call => call.bytes !== undefined), false);
});

test("browser refuses an individual video above 5,000,000,000 bytes before requesting a reservation", async () => {
  const { calls } = setup();
  const oversized = { size: 5_000_000_001, slice() { throw new Error("must not read file"); } };
  await assert.rejects(client.uploadMindR2Video(oversized, ITEM, OWNER, "too-large.mp4", () => {}), /5 GB/);
  assert.equal(calls.length, 0);
});
