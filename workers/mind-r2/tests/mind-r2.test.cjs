const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSync } = require("esbuild");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "2t-mind-r2-"));
const bundle = path.join(temp, "worker.cjs");
const protocolBundle = path.join(temp, "protocol.cjs");
buildSync({ entryPoints: [path.join(root, "workers/mind-r2/src/index.ts")], outfile: bundle, bundle: true, platform: "node", format: "cjs" });
buildSync({ entryPoints: [path.join(root, "workers/mind-r2/src/protocol.ts")], outfile: protocolBundle, bundle: true, platform: "node", format: "cjs" });
const { default: worker, StorageControl } = require(bundle);
const protocol = require(protocolBundle);
const OWNER = "11111111-1111-4111-8111-111111111111";
const ORIGIN = "https://matheus2t.com.br";
const CAP = "C".repeat(43);

function ledger() {
  const database = new DatabaseSync(":memory:");
  const alarms = [];
  const storage = {
    sql: { exec(query, ...bindings) {
      const isQuery = /^\s*(SELECT|PRAGMA|WITH)\b/i.test(query);
      if (bindings.length || isQuery) return { toArray: () => database.prepare(query).all(...bindings) };
      database.exec(query); return { toArray: () => [] };
    } },
    transactionSync(callback) {
      database.exec("BEGIN IMMEDIATE");
      try { const result = callback(); database.exec("COMMIT"); return result; }
      catch (error) { database.exec("ROLLBACK"); throw error; }
    },
    async setAlarm(at) { alarms.push(at); },
  };
  return { database, alarms, control: new StorageControl({ storage }, {}) };
}
async function call(control, path, body, method = "POST") {
  const response = await control.fetch(new Request("https://mind-storage.internal" + path, {
    method, headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
  return { response, data: await response.json() };
}
async function bootstrap(control, objects = []) {
  await call(control, "/bootstrap/start", {});
  if (objects.length) await call(control, "/bootstrap/page", { objects });
  return call(control, "/bootstrap/finish", {});
}
function reservation(size, idem = crypto.randomUUID(), itemId = crypto.randomUUID()) {
  return { idempotencyKey: idem, capabilityHash: CAP, ownerId: OWNER, itemId,
    key: `videos/${OWNER}/${itemId}-${crypto.randomUUID()}.mp4`, size };
}
function workerEnv(control, overrides = {}) {
  return {
    MIND_STORAGE: { idFromName: () => "global", get: () => ({ fetch: request => control.fetch(request) }) },
    MIND_VIDEOS: { async get() { return null; }, async head() { return null; }, async delete() {} },
    SUPABASE_URL: "https://unit-test.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unit_test",
    ALLOWED_ORIGINS: ORIGIN, ...overrides,
  };
}

test("quota counts inventory/orphans, exact decimal 5 GB, and rejects over-capacity", async () => {
  const { control, database } = ledger();
  const exact = await bootstrap(control, [{ key: "outside/unlinked.mp4", size: 5_000_000_000 }]);
  assert.equal(exact.response.status, 200);
  assert.equal(exact.data.usedBytes, 5_000_000_000);
  const denied = await call(control, "/reserve", reservation(1));
  assert.equal(denied.response.status, 413);
  assert.equal(database.prepare("SELECT COUNT(*) AS n FROM uploads").get().n, 0);
  database.close();
});

test("two concurrent reservations cannot exceed the 5 GB hard cap", async () => {
  const { control, database } = ledger();
  await bootstrap(control, [{ key: "orphan/known-object", size: 4_000_000_000 }]);
  const results = await Promise.all([call(control, "/reserve", reservation(800_000_000)), call(control, "/reserve", reservation(800_000_000))]);
  assert.deepEqual(results.map(result => result.response.status).sort(), [201, 413]);
  const storage = await call(control, "/storage", undefined, "GET");
  assert.equal(storage.data.usedBytes + storage.data.reservedBytes, 4_800_000_000);
  database.close();
});

test("100 MB and 1 GB uploads fit by reservation; over-5-GB file is rejected", async () => {
  const { control, database } = ledger();
  await bootstrap(control);
  assert.equal((await call(control, "/reserve", reservation(100_000_000))).response.status, 201);
  assert.equal((await call(control, "/reserve", reservation(1_000_000_000))).response.status, 201);
  assert.equal((await call(control, "/reserve", reservation(5_000_000_001))).response.status, 400);
  assert.equal(protocol.expectedPartSize(100_000_000, 1), 16 * 1024 * 1024);
  assert.equal(protocol.expectedPartSize(1_000_000_000, 1), 16 * 1024 * 1024);
  database.close();
});

test("reservation replay is idempotent and a capability cannot be reused for another item", async () => {
  const { control, database } = ledger();
  await bootstrap(control);
  const input = reservation(100_000_000);
  const first = await call(control, "/reserve", input);
  const replay = await call(control, "/reserve", input);
  assert.equal(first.data.id, replay.data.id);
  assert.equal((await call(control, "/storage", undefined, "GET")).data.reservedBytes, 100_000_000);
  const tampered = await call(control, "/reserve", { ...input, itemId: crypto.randomUUID() });
  assert.equal(tampered.response.status, 409);
  database.close();
});

test("in-flight part lock blocks cancellation; confirmed abort frees the reservation", async () => {
  const { control, database } = ledger();
  await bootstrap(control);
  const created = await call(control, "/reserve", reservation(100_000_000));
  const id = created.data.id, hash = CAP;
  await call(control, "/create/start", { id, capabilityHash: hash });
  await call(control, "/create/confirm", { id, uploadId: "multipart-unit", capabilityHash: hash });
  const partSize = 16 * 1024 * 1024;
  assert.equal((await call(control, "/part/start", { id, partNumber: 1, size: partSize, capabilityHash: hash })).response.status, 200);
  assert.equal((await call(control, "/abort/start", { id, capabilityHash: hash })).response.status, 409);
  await call(control, "/part/fail", { id, partNumber: 1, capabilityHash: hash });
  assert.equal((await call(control, "/abort/start", { id, capabilityHash: hash })).response.status, 200);
  await call(control, "/abort/confirm", { id, confirmed: true, capabilityHash: hash });
  assert.equal((await call(control, "/storage", undefined, "GET")).data.reservedBytes, 0);
  database.close();
});

test("public media serves byte ranges only for published ledger objects", async () => {
  const { control, database } = ledger();
  await bootstrap(control);
  const key = `videos/${OWNER}/22222222-2222-4222-8222-222222222222-33333333-3333-4333-8333-333333333333.mp4`;
  database.prepare("INSERT INTO objects(key,size,published,managed) VALUES(?,6,1,1)").run(key);
  const bytes = Buffer.from("abcdef");
  let options;
  const env = workerEnv(control, { MIND_VIDEOS: { async get(_key, opts) {
    options = opts;
    const range = opts?.range;
    const payload = range ? bytes.subarray(range.offset, range.offset + range.length) : bytes;
    return { size: bytes.length, httpEtag: '"etag"', body: new Blob([payload]).stream(), writeHttpMetadata(headers) { headers.set("Content-Type", "video/mp4"); } };
  } } });
  const response = await worker.fetch(new Request(`https://worker.test/media/${key}`, { headers: { Range: "bytes=1-3", Origin: ORIGIN } }), env);
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("Content-Range"), "bytes 1-3/6");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.equal(await response.text(), "bcd");
  assert.deepEqual(options.range, { offset: 1, length: 3 });
  const hidden = await worker.fetch(new Request(`https://worker.test/media/${key.replace(/2222/, "4444")}`), env);
  assert.equal(hidden.status, 404);
  database.close();
});

test("Worker streams mocked 100 MB and 1 GB multipart uploads, publishes only after DB reference, then serves and deletes them", async t => {
  const { control, database } = ledger();
  const originalFetch = global.fetch;
  const token = "unit-test-admin-token-123456";
  let dbRow = null;
  const completedObjects = new Map();
  const uploads = new Map();
  const r2 = {
    async list() { return { objects: [], truncated: false }; },
    async head(key) { const object = completedObjects.get(key); return object ? { size: object.size, httpEtag: object.httpEtag } : null; },
    async delete(key) { completedObjects.delete(key); },
    async createMultipartUpload(key) {
      const uploadId = "mock-multipart-id";
      uploads.set(uploadId, { key, parts: new Map() });
      return { uploadId };
    },
    resumeMultipartUpload(key, uploadId) {
      const multipart = uploads.get(uploadId);
      assert.ok(multipart && multipart.key === key);
      return {
        async uploadPart(partNumber, body) {
          const reader = body.getReader();
          let received = 0;
          while (true) { const next = await reader.read(); if (next.done) break; received += next.value.byteLength; }
          const part = { partNumber, size: received, etag: `etag-${partNumber}` };
          multipart.parts.set(partNumber, part);
          return part;
        },
        async complete(parts) {
          const actual = parts.map(part => multipart.parts.get(part.partNumber));
          assert.equal(actual.every(Boolean), true);
          const object = { key, size: actual.reduce((total, part) => total + part.size, 0), httpEtag: '"complete-etag"' };
          completedObjects.set(key, object);
          uploads.delete(uploadId);
          return object;
        },
        async abort() { uploads.delete(uploadId); },
      };
    },
    async get(key, options) {
      const object = completedObjects.get(key);
      if (!object) return null;
      const range = options?.range;
      const payload = new TextEncoder().encode("video-range-fixture");
      const body = range ? payload.slice(0, range.length) : payload;
      return { size: object.size, httpEtag: object.httpEtag, body: new Blob([body]).stream(), writeHttpMetadata(headers) { headers.set("Content-Type", "video/mp4"); } };
    },
  };
  global.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.pathname === "/auth/v1/user") return Response.json({ id: OWNER });
    if (url.pathname === "/rest/v1/rpc/mind_is_admin") return Response.json(true);
    if (url.pathname === "/rest/v1/mind_items" && init.method !== "DELETE") return Response.json(dbRow ? [dbRow] : []);
    if (url.pathname === "/rest/v1/mind_items" && init.method === "DELETE") { const deleted = dbRow; dbRow = null; return Response.json(deleted ? [{ id: deleted.id }] : []); }
    return Response.json({ error: "unexpected test request" }, { status: 404 });
  };
  t.after(() => { global.fetch = originalFetch; database.close(); });
  const env = workerEnv(control, { MIND_VIDEOS: r2 });
  const send = (path, method = "GET", body, extra = {}) => worker.fetch(new Request("https://worker.test" + path, {
    method, headers: { Origin: ORIGIN, Authorization: "Bearer " + token, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...extra },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), env);
  const boot = await send("/admin/storage/bootstrap", "POST", {});
  assert.equal(boot.status, 200);
  for (const size of [100_000_000, 1_000_000_000]) {
    const itemId = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const capability = "A".repeat(43);
    const createdResponse = await send("/admin/uploads", "POST", { itemId, totalBytes: size, fileName: "aula.mp4", capability }, { "Idempotency-Key": idempotencyKey });
    assert.equal(createdResponse.status, 200);
    const created = await createdResponse.json();
    const parts = Math.ceil(size / (16 * 1024 * 1024));
    for (let partNumber = 1; partNumber <= parts; partNumber++) {
      const expected = Math.min(16 * 1024 * 1024, size - (partNumber - 1) * 16 * 1024 * 1024);
      let remaining = expected;
      const stream = new ReadableStream({ pull(controller) {
        if (!remaining) { controller.close(); return; }
        const chunk = Math.min(512 * 1024, remaining);
        controller.enqueue(new Uint8Array(chunk)); remaining -= chunk;
      } });
      const response = await worker.fetch(new Request(`https://worker.test/admin/uploads/${created.id}/parts/${partNumber}`, {
        method: "PUT", headers: { Origin: ORIGIN, Authorization: "Bearer " + token, "X-Upload-Capability": capability,
          "Content-Type": "application/octet-stream", "Content-Length": String(expected) }, body: stream, duplex: "half",
      }), env);
      assert.equal(response.status, 200);
    }
    const complete = await send(`/admin/uploads/${created.id}/complete`, "POST", {}, { "X-Upload-Capability": capability });
    assert.equal(complete.status, 200);
    dbRow = { id: itemId, owner_id: OWNER, kind: "video", storage_path: created.key, file_size: size, video_storage_provider: "r2" };
    const commit = await send(`/admin/uploads/${created.id}/commit`, "POST", {}, { "X-Upload-Capability": capability });
    assert.equal(commit.status, 200);
    const media = await send(`/media/${created.key}`, "GET", undefined, { Range: "bytes=0-4" });
    assert.equal(media.status, 206);
    assert.equal(media.headers.get("Content-Range"), `bytes 0-4/${size}`);
    dbRow = null;
    const deleted = await send("/admin/videos/delete", "POST", { key: created.key });
    assert.equal(deleted.status, 204);
    const usage = await send("/admin/storage", "GET");
    assert.equal((await usage.json()).usedBytes, 0);
  }
});

test("admin routes reject anonymous, non-admin and unapproved origins", async t => {
  const { control, database } = ledger();
  const env = workerEnv(control);
  const originalFetch = global.fetch;
  global.fetch = async input => String(input).endsWith("/auth/v1/user")
    ? Response.json({ id: OWNER })
    : Response.json(false);
  t.after(() => { global.fetch = originalFetch; database.close(); });
  const anon = await worker.fetch(new Request("https://worker.test/admin/storage", { headers: { Origin: ORIGIN } }), env);
  assert.equal(anon.status, 401);
  const wrongOrigin = await worker.fetch(new Request("https://worker.test/admin/storage", { headers: { Origin: "https://evil.example", Authorization: "Bearer " + "x".repeat(24) } }), env);
  assert.equal(wrongOrigin.status, 403);
  const nonAdmin = await worker.fetch(new Request("https://worker.test/admin/storage", { headers: { Origin: ORIGIN, Authorization: "Bearer " + "x".repeat(24) } }), env);
  assert.equal(nonAdmin.status, 403);
});

test("protocol enforces strict key format, byte ranges, uniform chunks and quota arithmetic", () => {
  assert.equal(protocol.MAX_R2_STORAGE_BYTES, 5_000_000_000);
  assert.equal(protocol.canReserve(4_000_000_000, 200_000_000, 800_000_000), true);
  assert.equal(protocol.canReserve(4_000_000_001, 200_000_000, 800_000_000), false);
  assert.deepEqual(protocol.parseByteRange("bytes=-3", 10), { start: 7, end: 9, length: 3 });
  assert.deepEqual(protocol.parseByteRange("bytes=3-", 10), { start: 3, end: 9, length: 7 });
  assert.equal(protocol.parseByteRange("bytes=10-", 10), false);
  assert.equal(protocol.expectedPartSize(5_000_000_000, 1), 16 * 1024 * 1024);
  assert.equal(protocol.expectedPartSize(5_000_000_000, 299), 5_000_000_000 - 298 * 16 * 1024 * 1024);
  assert.equal(protocol.safeFileName("../../video.mp4"), ".._.._video.mp4");
});

test.after(() => fs.rmSync(temp, { recursive: true, force: true }));
