const test = require("node:test");
const assert = require("node:assert/strict");
const { buildIndexContent } = require("./write-index.cjs");

const base = "default-src 'self'; connect-src 'self' https://api.example.test; frame-src 'self' https://viewer.example.test; media-src 'self'; object-src 'none';";
const env = {
  MIND_CLOUD_ENABLED: "true",
  MIND_SUPABASE_URL: "https://project.supabase.co/",
  MIND_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-only",
};

test("cloud build adds only the configured Supabase origin to connect-src, frame-src and media-src", () => {
  const output = buildIndexContent(base, env);
  assert.match(output, /connect-src[^;]*https:\/\/project\.supabase\.co;/);
  assert.match(output, /frame-src[^;]*https:\/\/project\.supabase\.co;/);
  assert.match(output, /media-src[^;]*https:\/\/project\.supabase\.co;/);
  assert.equal((output.match(/https:\/\/project\.supabase\.co/g) ?? []).length, 3);
  assert.match(output, /object-src 'none'/);
  assert.doesNotMatch(output, /https:\/\/[^ ;]+\.supabase\.co\.evil/);
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

test("enabled cloud build fails closed if a required CSP directive is missing", () => {
  assert.throws(() => buildIndexContent("connect-src 'self'; object-src 'none';", env), /frame-src is missing/);
});
