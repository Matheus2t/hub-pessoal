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

test("R2 CSP adds only the exact HTTPS Worker origin when explicitly enabled", () => {
  const output = buildIndexContent(base, { ...env, MIND_R2_ENABLED: "true", MIND_R2_WORKER_URL: "https://mind-r2.example.workers.dev" });
  assert.match(output, /connect-src[^;]*https:\/\/mind-r2\.example\.workers\.dev/);
  assert.match(output, /media-src[^;]*https:\/\/mind-r2\.example\.workers\.dev/);
  assert.doesNotMatch(output, /https:\/\/\*\.workers\.dev/);
  assert.equal(buildIndexContent(output, { ...env, MIND_R2_ENABLED: "true", MIND_R2_WORKER_URL: "https://mind-r2.example.workers.dev" }), output);
});

test("invalid or disabled R2 configuration does not widen CSP", () => {
  assert.equal(buildIndexContent(base, { ...env, MIND_R2_ENABLED: "true", MIND_R2_WORKER_URL: "http://mind-r2.example.workers.dev" }), buildIndexContent(base, env));
  assert.equal(buildIndexContent(base, { ...env, MIND_R2_ENABLED: "true", MIND_R2_WORKER_URL: "https://mind-r2.example.workers.dev/path" }), buildIndexContent(base, env));
  assert.equal(buildIndexContent(base, { ...env, MIND_R2_ENABLED: "false", MIND_R2_WORKER_URL: "https://mind-r2.example.workers.dev" }), buildIndexContent(base, env));
});

test("enabled cloud build fails closed if a required CSP directive is missing", () => {
  assert.throws(() => buildIndexContent("connect-src 'self'; object-src 'none';", env), /frame-src is missing/);
});
