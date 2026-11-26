import test from "node:test";
import assert from "node:assert/strict";
import { localMindFrontendEnv, parseBackendEnv } from "./dev-mind-env.mjs";

const anon = `header.${Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url")}.sig`;
const valid = {
  MIND_GOOGLE_DRIVE_ENABLED: "true",
  MIND_SUPABASE_URL: "http://kong:8000",
  MIND_SUPABASE_PUBLISHABLE_KEY: anon,
  MIND_SUPABASE_SERVICE_ROLE_KEY: "server-only",
  GOOGLE_DRIVE_CLIENT_ID: "server-only",
  GOOGLE_DRIVE_CLIENT_SECRET: "server-only",
  GOOGLE_DRIVE_REDIRECT_URI: "http://localhost:8000/api/mind-drive/google/callback",
  MIND_GOOGLE_TOKEN_ENCRYPTION_KEY: "server-only",
  API_CORS_ORIGINS: "http://localhost:3000,http://127.0.0.1:3000",
  MIND_GOOGLE_DRIVE_ALLOWED_ORIGINS: "http://localhost:3000,http://127.0.0.1:3000",
};

test("parses only allowlisted dotenv entries, including quoted values and equals signs", () => {
  const parsed = parseBackendEnv([
    "# ignored comment",
    'MIND_SUPABASE_PUBLISHABLE_KEY="anon.jwt=tail" # inline comment',
    "GOOGLE_DRIVE_CLIENT_SECRET='secret=value'",
    "UNRELATED_SECRET=must-not-be-retained",
  ].join("\n"));
  assert.deepEqual(parsed, {
    MIND_SUPABASE_PUBLISHABLE_KEY: "anon.jwt=tail",
    GOOGLE_DRIVE_CLIENT_SECRET: "secret=value",
  });
});

test("exposes only loopback frontend settings after explicit, complete local opt-in", () => {
  const output = localMindFrontendEnv({ backendEnv: valid, processEnv: {} });
  assert.equal(output.MIND_CLOUD_ENABLED, "true");
  assert.equal(output.MIND_LOCAL_SUPABASE_ENABLED, "true");
  assert.equal(output.MIND_GOOGLE_DRIVE_ENABLED, "true");
  assert.equal(output.MIND_SUPABASE_URL, "http://127.0.0.1:54321");
  assert.equal(output.TWO_T_API_BASE_URL, "http://localhost:8000");
  assert.equal(output.MIND_SUPABASE_PUBLISHABLE_KEY, anon);
  assert.equal(JSON.stringify(output).includes("server-only"), false);
  assert.equal(Object.keys(output).some(key => /SECRET|SERVICE_ROLE|ENCRYPTION|CLIENT_ID/.test(key)), false);
});

test("fails closed for hosted Supabase, a privileged key, missing secrets, or wrong callback/origin", () => {
  for (const patch of [
    { MIND_SUPABASE_URL: "https://project.supabase.co" },
    { MIND_SUPABASE_PUBLISHABLE_KEY: `h.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.s` },
    { GOOGLE_DRIVE_CLIENT_SECRET: "" },
    { GOOGLE_DRIVE_REDIRECT_URI: "https://matheus2t.com.br/callback" },
    { API_CORS_ORIGINS: "https://matheus2t.com.br" },
    { MIND_GOOGLE_DRIVE_ALLOWED_ORIGINS: "https://matheus2t.com.br" },
  ]) assert.equal(localMindFrontendEnv({ backendEnv: { ...valid, ...patch } }), null);
});

test("fails closed for Vercel and explicit local feature opt-outs or remote frontend overrides", () => {
  for (const processEnv of [
    { VERCEL: "1" },
    { MIND_CLOUD_ENABLED: "false" },
    { MIND_LOCAL_SUPABASE_ENABLED: "false" },
    { MIND_GOOGLE_DRIVE_ENABLED: "false" },
    { TWO_T_API_BASE_URL: "https://api.example.com" },
    { MIND_SUPABASE_URL: "https://project.supabase.co" },
  ]) assert.equal(localMindFrontendEnv({ backendEnv: valid, processEnv }), null);
});
