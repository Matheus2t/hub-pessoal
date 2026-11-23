import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildRestoreCommand, classifyFailure, compareSnapshots, parseLocalDbUrl, runPostgresPreflight, validateManualEnvironment, validatePostgresPreflightEnvironment, validateProductionDbUrl } from "./mind-production-backup.mjs";

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
  assert.equal(validateProductionDbUrl(goodUrl.replace("strong%40password", "p%40ss%25%2F%3A%3F")).sslmode, "require");
  assert.throws(() => validateProductionDbUrl(goodUrl.replace("strong%40password", "bad%E0%A4%A")), /percent-encoding inválido/);
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

test("standalone PostgreSQL preflight requires only the protected database URL, not the backup key", () => {
  const env = {
    GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main",
    MIND_BACKUP_ENVIRONMENT: "production-db-backup", SUPABASE_DB_URL: goodUrl,
  };
  assert.equal(validatePostgresPreflightEnvironment(env).database, "postgres");
  assert.throws(() => validatePostgresPreflightEnvironment({ ...env, GITHUB_REF: "refs/heads/codex/test" }), /branch main/);
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
  assert.equal(classifyFailure("password authentication failed for user postgres.secret", { stage: "production-postgres-connect", exitCode: 2 }),
    "PostgreSQL rejected password authentication; verify the Session Pooler URI and percent-encoding");
  assert.equal(classifyFailure("could not translate host name"), "DNS resolution failed");
  assert.equal(classifyFailure("certificate verify failed"), "TLS negotiation or certificate verification failed");
  assert.equal(classifyFailure("private@example.com token=secret"), "command failed; raw output suppressed to protect credentials and data");
});

test("distinguishes authentication, role/tenant, network, TLS, Supavisor, URI, Docker and unknown failures", () => {
  assert.equal(classifyFailure("psql: FATAL: password authentication failed for user private-role", {
    stage: "production-postgres-connect", exitCode: 2,
  }), "PostgreSQL rejected password authentication; verify the Session Pooler URI and percent-encoding");
  assert.equal(classifyFailure("psql: error: FATAL: 28P01: password authentication failed for user hidden", {
    stage: "production-postgres-connect", exitCode: 2,
  }), "PostgreSQL rejected password authentication (SQLSTATE 28P01)");
  assert.equal(classifyFailure("psql: error: FATAL: Tenant or user not found", { stage: "production-postgres-connect", exitCode: 2 }),
    "Supavisor did not resolve the project tenant or pooler role; copy the exact Session Pooler URI from Supabase Connect");
  assert.equal(classifyFailure("FATAL: Circuit breaker open", { stage: "production-postgres-connect", exitCode: 2 }),
    "Supavisor circuit breaker is open; stop reconnect attempts and review pooler authentication before retrying");
  assert.equal(classifyFailure("could not translate host name 'hidden'", { stage: "production-postgres-connect", exitCode: 2 }), "DNS resolution failed");
  assert.equal(classifyFailure("connection to server timed out", { stage: "production-postgres-connect", exitCode: 2 }), "database connection timed out");
  assert.equal(classifyFailure("connection refused", { stage: "production-postgres-connect", exitCode: 2 }), "database connection was refused");
  assert.equal(classifyFailure("SSL SYSCALL error: EOF detected", { stage: "production-postgres-connect", exitCode: 2 }),
    "TLS negotiation or certificate verification failed");
  assert.equal(classifyFailure("psql: invalid percent-encoded token: hidden-value", {
    stage: "production-postgres-connect", exitCode: 2,
  }), "SUPABASE_DB_URL credential percent-encoding is invalid; encode reserved password characters once");
  assert.equal(classifyFailure("Error response from daemon: unauthorized: authentication required", {
    stage: "docker-image-pull", exitCode: 1,
  }), "Docker registry refused the public PostgreSQL client image (authentication or anonymous pull limit)");
  assert.equal(classifyFailure("Error response from daemon: unauthorized", {
    stage: "disposable-supabase-start", exitCode: 1,
  }), "Disposable Supabase could not retrieve a container image (registry authentication or pull limit)");
  assert.equal(classifyFailure("psql connection failed", { stage: "production-postgres-connect", exitCode: 2 }),
    "PostgreSQL client failed (psql exit 2); no safe diagnostic class was found and raw output was suppressed");
  assert.equal(classifyFailure("spawn docker ENOENT", { stage: "production-postgres-connect", exitCode: null }),
    "Docker CLI is unavailable on the GitHub runner");
});

test("standalone preflight runs only a read-only SELECT and never starts disposable Supabase", () => {
  const events = [];
  const env = {
    GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main",
    MIND_BACKUP_ENVIRONMENT: "production-db-backup", SUPABASE_DB_URL: goodUrl,
  };
  const result = runPostgresPreflight(env, {
    pullImage: () => events.push("pull"),
    query: (url, sql, mountDir, stage) => {
      events.push("query");
      assert.equal(url, goodUrl);
      assert.equal(sql, "SELECT 1");
      assert.equal(mountDir, undefined);
      assert.equal(stage, "production-postgres-connect");
      return "1";
    },
    log: () => {},
  });
  assert.deepEqual(events, ["pull", "query"]);
  assert.deepEqual(result, { database: "postgres", sslmode: "require", result: "passed" });
});

test("backup invokes the independent preflight before starting disposable Supabase", () => {
  const script = readFileSync(new URL("./mind-production-backup.mjs", import.meta.url), "utf8");
  const preflight = script.indexOf("runPostgresPreflight(env);");
  const stackStart = script.indexOf('supabaseCli(["start"');
  assert.ok(preflight >= 0 && stackStart > preflight);
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
  assert.match(workflow, /operation:/);
  assert.match(workflow, /preflight/);
  assert.match(workflow, /backup/);
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /postgres-preflight:/);
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
  const preflightSettings = workflow.match(/  postgres-preflight:\n([\s\S]*?)\n  backup-restore:/);
  assert.ok(preflightSettings);
  assert.match(preflightSettings[1], /SUPABASE_DB_URL: \$\{\{ secrets\.SUPABASE_DB_URL \}\}/);
  assert.doesNotMatch(preflightSettings[1], /BACKUP_ENCRYPTION_PASSPHRASE/);
  assert.match(preflightSettings[1], /node scripts\/mind-production-backup\.mjs preflight/);
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

