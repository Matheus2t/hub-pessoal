import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRestoreCommand, classifyFailure, compareSnapshots, parseLocalDbUrl, validateManualEnvironment, validateProductionDbUrl } from "./mind-production-backup.mjs";

const goodUrl = "postgresql://postgres.kadkcuumcahnqrvalloz:strong%40password@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require";

test("accepts only the production project session pooler over TLS", () => {
  assert.deepEqual(validateProductionDbUrl(goodUrl), {
    host: "aws-0-sa-east-1.pooler.supabase.com", port: 5432, database: "postgres", sslmode: "require",
  });
  assert.throws(() => validateProductionDbUrl(goodUrl.replace("kadkcuumcahnqrvalloz", "other-project")), /não identifica/);
  assert.throws(() => validateProductionDbUrl(goodUrl.replace("pooler.supabase.com", "supabase.co")), /Session pooler/);
  assert.throws(() => validateProductionDbUrl(goodUrl.replace("aws-0-sa-east-1", "nested.aws-0-sa-east-1")), /Session pooler/);
  assert.throws(() => validateProductionDbUrl(goodUrl.replace(":5432/", ":6543/")), /Session pooler/);
  assert.throws(() => validateProductionDbUrl(goodUrl.replace("?sslmode=require", "")), /TLS/);
  assert.throws(() => validateProductionDbUrl(goodUrl.replace("sslmode=require", "sslmode=verify-full")), /sslmode=require/);
});

test("rejects execution outside manual main workflow or protected environment", () => {
  const base = {
    GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main",
    MIND_BACKUP_ENVIRONMENT: "production-db-backup", SUPABASE_DB_URL: goodUrl,
    BACKUP_ENCRYPTION_PASSPHRASE: "A".repeat(64),
  };
  assert.equal(validateManualEnvironment(base).database, "postgres");
  assert.throws(() => validateManualEnvironment({ ...base, GITHUB_REF: "refs/heads/codex/test" }), /branch main/);
  assert.throws(() => validateManualEnvironment({ ...base, MIND_BACKUP_ENVIRONMENT: "" }), /environment protegido/);
  assert.throws(() => validateManualEnvironment({ ...base, BACKUP_ENCRYPTION_PASSPHRASE: "short" }), /64 caracteres/);
  assert.throws(() => validateManualEnvironment({ ...base, BACKUP_ENCRYPTION_PASSPHRASE: `${"A".repeat(63)}=` }), /64 caracteres/);
});

test("local restore URL must be loopback Supabase Postgres only", () => {
  assert.equal(parseLocalDbUrl("API_URL=http://127.0.0.1:54321\nDB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres"),
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
  assert.throws(() => parseLocalDbUrl("DB_URL=postgresql://postgres:password@remote.example:5432/postgres"), /local descartável/);
  assert.throws(() => parseLocalDbUrl("DB_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres"), /local descartável/);
});

test("snapshot comparison detects data, schema, and during-dump changes", () => {
  const before = { meta: { tables: 2 }, rows: { "public.mind_items": { count: 4, digest: "a" } } };
  assert.deepEqual(compareSnapshots(before, before, before), { sourceStableDuringDump: true, restoredMatchesSource: true });
  assert.deepEqual(compareSnapshots(before, { meta: { tables: 2 }, rows: { "public.mind_items": { count: 5, digest: "b" } } }, before),
    { sourceStableDuringDump: false, restoredMatchesSource: true });
  assert.deepEqual(compareSnapshots(before, before, { meta: { tables: 3 }, rows: before.rows }),
    { sourceStableDuringDump: true, restoredMatchesSource: false });
});

test("connection diagnostics classify failures without echoing raw details", () => {
  assert.equal(classifyFailure("password authentication failed for user postgres.secret"), "authentication rejected");
  assert.equal(classifyFailure("could not translate host name"), "DNS resolution failed");
  assert.equal(classifyFailure("certificate verify failed"), "TLS verification failed");
  assert.equal(classifyFailure("private@example.com token=secret"), "command failed; raw output suppressed to protect credentials and data");
});

test("restore uses a single transaction in the documented Supabase order", () => {
  const command = buildRestoreCommand();
  assert.match(command, /--single-transaction/);
  assert.match(command, /--variable ON_ERROR_STOP=1/);
  assert.ok(command.indexOf("roles.sql") < command.indexOf("schema.sql"));
  assert.ok(command.indexOf("schema.sql") < command.indexOf("session_replication_role = replica"));
  assert.ok(command.indexOf("session_replication_role = replica") < command.indexOf("data.sql"));
  assert.doesNotMatch(command, /DROP SCHEMA|production/);
});

test("workflow is manual, main-only, protected, and injects only two environment secrets", () => {
  const workflow = readFileSync(new URL("../.github/workflows/mind-production-db-backup.yml", import.meta.url), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /environment: production-db-backup/);
  assert.match(workflow, /SUPABASE_DB_URL: \$\{\{ secrets\.SUPABASE_DB_URL \}\}/);
  assert.match(workflow, /BACKUP_ENCRYPTION_PASSPHRASE: \$\{\{ secrets\.BACKUP_ENCRYPTION_PASSPHRASE \}\}/);
  assert.match(workflow, /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/);
  assert.match(workflow, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/);
  assert.match(workflow, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
  assert.match(workflow, /if-no-files-found: error/);
  assert.match(workflow, /Verify the protected environment allows only main/);
  assert.match(workflow, /\.branch_policies\[0\]\.name == "main"/);
  assert.match(workflow, /needs: verify-environment/);
  const backupJobSettings = workflow.match(/  backup-restore:\n([\s\S]*?)    steps:\n/);
  assert.ok(backupJobSettings);
  assert.doesNotMatch(backupJobSettings[1], /runner\.temp/);
  const backupStepEnvironment = workflow.match(/- name: Create encrypted backup and verify restore in disposable Supabase\n        env:\n([\s\S]*?)\n        run:/);
  assert.ok(backupStepEnvironment);
  assert.match(backupStepEnvironment[1], /MIND_BACKUP_OUTPUT_DIR: .*runner\.temp/);
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(vercel.git.deploymentEnabled.main, false);
  assert.doesNotMatch(workflow, /secrets\.(?!SUPABASE_DB_URL|BACKUP_ENCRYPTION_PASSPHRASE)/);
  assert.doesNotMatch(workflow, /pull_request:|push:/);
});
