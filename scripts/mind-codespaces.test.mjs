import test from "node:test";
import assert from "node:assert/strict";
import { buildLocalBackendEnv, parseSupabaseStatusEnv, renderDotEnv } from "./mind-codespaces.mjs";

function jwt(role) {
  return `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
}

const statusText = `API_URL="http://127.0.0.1:54321"\nANON_KEY="${jwt("anon")}"\nSERVICE_ROLE_KEY="${jwt("service_role")}"\n`;

test("parses CLI env output without emitting local keys", () => {
  const parsed = parseSupabaseStatusEnv(statusText);
  assert.equal(parsed.API_URL, "http://127.0.0.1:54321");
  assert.equal(parsed.ANON_KEY, jwt("anon"));
});

test("Drive remains off unless credentials are explicitly acknowledged as rotated", () => {
  const local = parseSupabaseStatusEnv(statusText);
  const key = Buffer.alloc(32, 7).toString("base64");
  const secrets = { TWO_T_GOOGLE_DRIVE_CLIENT_ID: "client-id", TWO_T_GOOGLE_DRIVE_CLIENT_SECRET: "new-secret" };
  assert.equal(buildLocalBackendEnv(local, secrets, key).MIND_GOOGLE_DRIVE_ENABLED, "false");
  assert.equal(buildLocalBackendEnv(local, { ...secrets, TWO_T_GOOGLE_OAUTH_ROTATED: "yes" }, key).MIND_GOOGLE_DRIVE_ENABLED, "true");
});

test("rejects remote Supabase URLs and non-service role keys", () => {
  const key = Buffer.alloc(32, 9).toString("base64");
  const local = parseSupabaseStatusEnv(statusText);
  assert.throws(() => buildLocalBackendEnv({ ...local, API_URL: "https://example.supabase.co" }, {}, key), /configuração recusada/);
  assert.throws(() => buildLocalBackendEnv({ ...local, SERVICE_ROLE_KEY: jwt("anon") }, {}, key), /configuração recusada/);
});

test("dotenv values are quoted and only server-side keys are written", () => {
  const text = renderDotEnv({ MIND_SUPABASE_SERVICE_ROLE_KEY: "secret#\"value", GOOGLE_DRIVE_CLIENT_SECRET: "oauth-secret" });
  assert.match(text, /MIND_SUPABASE_SERVICE_ROLE_KEY="secret#\\\"value"/);
  assert.match(text, /GOOGLE_DRIVE_CLIENT_SECRET="oauth-secret"/);
});
