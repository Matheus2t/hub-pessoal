const test = require("node:test");
const assert = require("node:assert/strict");
const { buildIndexContent } = require("./write-index.cjs");

const base = "default-src 'self'; connect-src 'self' https://api.example.test; frame-src 'self' https://viewer.example.test; media-src 'self' blob:; object-src 'none';";
const env = {
  MIND_CLOUD_ENABLED: "true",
  MIND_SUPABASE_URL: "https://project.supabase.co/",
  MIND_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-only",
};

test("cloud build allows the configured API and exact direct Storage host for resumable upload", () => {
  const output = buildIndexContent(base, env);
  assert.match(output, /connect-src[^;]*https:\/\/project\.supabase\.co(?:\s|;)/);
  assert.match(output, /connect-src[^;]*https:\/\/project\.storage\.supabase\.co(?:\s|;)/);
  assert.match(output, /frame-src[^;]*https:\/\/project\.supabase\.co;/);
  assert.match(output, /media-src[^;]*https:\/\/project\.supabase\.co;/);
  assert.match(output, /media-src[^;]*blob:/);
  assert.equal((output.match(/https:\/\/project\.storage\.supabase\.co/g) ?? []).length, 1);
  assert.match(output, /object-src 'none'/);
  assert.doesNotMatch(output, /https:\/\/[^ ;]+\.supabase\.co\.evil/);
  assert.doesNotMatch(output, /https:\/\/\*\.storage\.supabase\.co/);
});

test("disabled or invalid cloud configuration leaves the public CSP unchanged", () => {
  assert.equal(buildIndexContent(base, { ...env, MIND_CLOUD_ENABLED: "false" }), base);
  assert.equal(buildIndexContent(base, { ...env, MIND_SUPABASE_URL: "https://project.supabase.co.attacker.test" }), base);
  assert.equal(buildIndexContent(base, { ...env, MIND_SUPABASE_PUBLISHABLE_KEY: "service_role_secret" }), base);
});

test("adding the configured source is idempotent", () => {
  const once = buildIndexContent(base, env);
  const twice = buildIndexContent(once, env);
  assert.equal(twice, once);
});

test("Google Drive is allowed only when the explicit feature flag is enabled", () => {
  const disabled = buildIndexContent(base, env);
  assert.doesNotMatch(disabled, /drive\.google\.com|www\.googleapis\.com/);
  const enabled = buildIndexContent(base, { ...env, MIND_GOOGLE_DRIVE_ENABLED: "true" });
  assert.match(enabled, /connect-src[^;]*https:\/\/www\.googleapis\.com;/);
  assert.match(enabled, /frame-src[^;]*https:\/\/drive\.google\.com;/);
  assert.equal(buildIndexContent(enabled, { ...env, MIND_GOOGLE_DRIVE_ENABLED: "true" }), enabled);
});

test("enabled cloud build fails closed if a required CSP directive is missing", () => {
  assert.throws(() => buildIndexContent("connect-src 'self'; object-src 'none';", env), /frame-src is missing/);
});

test("Drive compile flag requires valid cloud config and explicit opt-in", async () => {
  const { frontendBuildDefines } = await import("./frontend-build-defines.mjs");
  const names = ["MIND_CLOUD_ENABLED", "MIND_SUPABASE_URL", "MIND_SUPABASE_PUBLISHABLE_KEY", "MIND_GOOGLE_DRIVE_ENABLED"];
  const prior = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    process.env.MIND_CLOUD_ENABLED = "true";
    process.env.MIND_SUPABASE_URL = "https://project.supabase.co";
    process.env.MIND_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    assert.equal(frontendBuildDefines()["globalThis.__2T_MIND_GOOGLE_DRIVE_ENABLED__"], "false");
    process.env.MIND_GOOGLE_DRIVE_ENABLED = "true";
    assert.equal(frontendBuildDefines()["globalThis.__2T_MIND_GOOGLE_DRIVE_ENABLED__"], "true");
    process.env.MIND_CLOUD_ENABLED = "false";
    assert.equal(frontendBuildDefines()["globalThis.__2T_MIND_GOOGLE_DRIVE_ENABLED__"], "false");
    process.env.MIND_CLOUD_ENABLED = "true";
    process.env.MIND_SUPABASE_URL = "http://project.supabase.co";
    assert.equal(frontendBuildDefines()["globalThis.__2T_MIND_GOOGLE_DRIVE_ENABLED__"], "false");
  } finally {
    for (const name of names) { if (prior[name] === undefined) delete process.env[name]; else process.env[name] = prior[name]; }
  }
});
