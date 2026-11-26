import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseSupabaseStatusEnv } from "../../scripts/mind-codespaces.mjs";

if (process.env.GITHUB_ACTIONS !== "true") throw new Error("Use only in the disposable GitHub Actions job.");
const config = parseSupabaseStatusEnv(execFileSync("npx", [
  "--yes", "supabase@3.2.0", "status", "--workdir", "tests/mind-codespaces-runtime", "-o", "env",
], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
const api = new URL(config.API_URL);
if (api.origin !== "http://127.0.0.1:54321" && api.origin !== "http://localhost:54321") {
  throw new Error("Storage fixture must use the disposable Supabase gateway.");
}
const account = JSON.parse(readFileSync("backend/.mind-codespaces-admin.json", "utf8"));
const storage = "/storage/v1/upload/resumable";
const chunkSize = 6 * 1024 * 1024;
const total = 27 * 1024 * 1024;
const fixture = readFileSync("frontend/tests/fixtures/mind-h264-aac.mp4");
const video = Buffer.alloc(total);
fixture.copy(video);
video.writeUInt32BE(total - fixture.length, fixture.length);
video.write("free", fixture.length + 4);

async function request(path, init) {
  return fetch(new URL(path, api), {
    ...init, redirect: "error", signal: AbortSignal.timeout(30_000),
  });
}
function status(response, expected, label) {
  assert.ok(expected.includes(response.status), label + " returned HTTP " + response.status);
}
const login = await request("/auth/v1/token?grant_type=password", {
  method: "POST", headers: { apikey: config.ANON_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ email: account.email, password: account.password }),
});
status(login, [200], "Fixture login");
const session = await login.json();
assert.match(session.user.id, /^[a-f0-9-]{36}$/i);
assert.ok(session.access_token, "Fixture access token is present");
const path = session.user.id + "/" + randomUUID() + ".mp4";
const auth = { apikey: config.ANON_KEY, Authorization: "Bearer " + session.access_token };
const tus = { ...auth, "Tus-Resumable": "1.0.0" };
function metadata(objectName) {
  return Object.entries({ bucketName: "mind-videos", objectName, contentType: "video/mp4" })
    .map(([key, value]) => key + " " + Buffer.from(value).toString("base64")).join(",");
}
function start(objectName, bytes, headers = tus) {
  return request(storage, {
    method: "POST", headers: { ...headers, "Upload-Length": String(bytes), "Upload-Metadata": metadata(objectName) },
  });
}
status(await start(path, total, { apikey: config.ANON_KEY, "Tus-Resumable": "1.0.0" }), [401, 403], "Anonymous TUS initiation");
status(await start(randomUUID() + "/" + randomUUID() + ".mp4", total), [400, 401, 403], "Wrong owner TUS initiation");
status(await start(path, 50_000_001), [413], "Over-limit TUS initiation");
const started = await start(path, total);
status(started, [201], "Authenticated TUS initiation");
const location = started.headers.get("location");
assert.ok(location, "TUS initiation returned a session path");
const endpoint = new URL(location, api).pathname;
assert.ok(endpoint.startsWith(storage + "/"), "The resumed URL must stay in the local TUS route");

async function sendChunk(offset) {
  const end = Math.min(total, offset + chunkSize);
  const result = await request(endpoint, {
    method: "PATCH", headers: { ...tus, "Content-Type": "application/offset+octet-stream",
      "Upload-Offset": String(offset), Connection: "close" },
    body: video.subarray(offset, end),
  });
  status(result, [204], "TUS chunk");
  assert.equal(Number(result.headers.get("upload-offset")), end);
  return end;
}
const interruptedAt = await sendChunk(0);
const resumed = await request(endpoint, { method: "HEAD", headers: tus });
status(resumed, [200, 204], "TUS session after interruption");
assert.equal(Number(resumed.headers.get("upload-offset")), interruptedAt);
for (let offset = interruptedAt; offset < total;) offset = await sendChunk(offset);

const publicPath = "/storage/v1/object/public/mind-videos/" + path;
const playback = await request(publicPath, { headers: { Range: "bytes=0-4095" } });
status(playback, [206], "Public MP4 first range");
assert.match(playback.headers.get("content-type") ?? "", /^video\/mp4\b/);
assert.equal(playback.headers.get("content-range"), "bytes 0-4095/" + total);
assert.ok(Buffer.from(await playback.arrayBuffer()).equals(video.subarray(0, 4096)), "Published MP4 bytes match the fixture");

const removed = await request("/storage/v1/object/mind-videos/" + path, { method: "DELETE", headers: auth });
status(removed, [200, 204], "Administrative Storage deletion");
const gone = await request(publicPath);
status(gone, [400, 404], "Public object after deletion");
console.log("Isolated Supabase Storage: 27 MiB MP4 over TUS, resumed offset, public range, admin delete, owner/anonymous restrictions and 50 MB limit passed.");
