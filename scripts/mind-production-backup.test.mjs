import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { once } from "node:events";
import { X509Certificate } from "node:crypto";
import { ForbiddenPostgresCredentialError, buildDockerPsqlArgs, buildRestoreCommand, classifyFailure, compareSnapshots, directComparisonUrl, formatCommandFailure, parseLocalDbUrl, probePostgresEndpoint, productionClientEnvironment, productionConnectionUrl, runPostgresPreflight, validateManualEnvironment, validatePostgresPreflightEnvironment, validateProductionDbUrl } from "./mind-production-backup.mjs";

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
  assert.throws(() => validateProductionDbUrl(goodUrl.replace("sslmode=require", "sslmode=disable")), /deve exigir TLS/);
  assert.equal(validateProductionDbUrl(goodUrl.replace("strong%40password", "p%40ss%25%2F%3A%3F")).sslmode, "require");
  assert.throws(() => validateProductionDbUrl(goodUrl.replace("strong%40password", "bad%E0%A4%A")), /percent-encoding inválido/);
});

test("all source connections pin Supabase CA and hostname verification without changing the encoded password", () => {
  const raw = goodUrl.replace("strong%40password", "p%40ss+%252F") + "&hostaddr=203.0.113.5&sslmode=disable&sslrootcert=system";
  const caPath = "/tmp/with spaces/supabase+ca.crt";
  const fixed = productionConnectionUrl(raw, caPath);
  const url = new URL(fixed);
  assert.equal(url.password, "p%40ss+%252F");
  assert.deepEqual([...url.searchParams], [["sslmode", "verify-full"], ["sslrootcert", caPath]]);
  assert.match(fixed, /with%20spaces/);
  assert.doesNotMatch(fixed, /hostaddr/);
  const ca = new X509Certificate(readFileSync(new URL("./supabase-prod-ca-2021.crt", import.meta.url)));
  assert.equal(ca.ca, true);
  assert.equal(ca.fingerprint256.replaceAll(":", "").toLowerCase(), "807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa");
});

test("native libpq gets the decoded password once and ignores inherited connection overrides", () => {
  const raw = goodUrl.replace("strong%40password", "p%40ss+%252F");
  const env = productionClientEnvironment(raw, {
    PATH: "/usr/bin", PGHOSTADDR: "203.0.113.5", PGOPTIONS: "-c unexpected=setting",
    PGSERVICE: "wrong", SUPABASE_DB_URL: "unused", BACKUP_ENCRYPTION_PASSPHRASE: "unrelated",
  });
  assert.equal(env.PGPASSWORD, "p@ss+%2F");
  assert.equal(env.PGHOST, "aws-0-sa-east-1.pooler.supabase.com");
  assert.equal(env.PGSSLMODE, "verify-full");
  assert.match(env.PGSSLROOTCERT, /supabase-prod-ca-2021\.crt$/);
  assert.equal(env.PATH, "/usr/bin");
  for (const key of ["PGHOSTADDR", "PGOPTIONS", "PGSERVICE", "SUPABASE_DB_URL", "BACKUP_ENCRYPTION_PASSPHRASE"]) {
    assert.equal(key in env, false);
  }
  assert.throws(() => productionClientEnvironment(raw.replace("%40", "%00"), {}), ForbiddenPostgresCredentialError);
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
    "Supavisor did not resolve the configured project tenant or pooler role; verify the exact Session Pooler URI in Supabase Connect");
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
    "PostgreSQL session failed without a recognized safe signature (psql exit 2); raw output suppressed");
  assert.equal(classifyFailure("spawn docker ENOENT", { stage: "production-postgres-connect", exitCode: null }),
    "Docker CLI is unavailable on the GitHub runner");
  assert.equal(classifyFailure({ stdout: "", stderr: "" }, {
    stage: "production-postgres-connect", errorCode: "ENOENT", executable: "docker", exitCode: null,
  }), "Docker CLI is unavailable on the GitHub runner");
  assert.equal(classifyFailure({ stdout: "FATAL: 28P01: password authentication failed for user private-user", stderr: "" }, {
    stage: "production-postgres-authentication", exitCode: 2,
  }), "PostgreSQL rejected password authentication (SQLSTATE 28P01)");
  assert.equal(classifyFailure({ stdout: "FATAL: (ENOTFOUND) tenant/user postgres.private not found", stderr: "" }, {
    stage: "production-postgres-authentication", exitCode: 2,
  }), "Supavisor did not resolve the configured project tenant or pooler role; verify the exact Session Pooler URI in Supabase Connect");
  assert.equal(classifyFailure({ stdout: "", stderr: "ERROR:  53300: remaining connection slots are reserved" }, {
    stage: "production-postgres-authentication", exitCode: 2,
  }), "PostgreSQL refused the connection because its connection limit was reached (SQLSTATE 53300)");
  assert.equal(classifyFailure({ stdout: "", stderr: "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?" }, {
    stage: "production-postgres-authentication", executable: "docker", exitCode: 125,
  }), "Docker daemon unavailable while invoking the containerized PostgreSQL client");
  assert.equal(classifyFailure({ stdout: "", stderr: "Error response from daemon: unauthorized: authentication required" }, {
    stage: "production-postgres-authentication", executable: "docker", exitCode: 125,
  }), "Docker registry refused the PostgreSQL client image during container invocation");
  assert.equal(classifyFailure({ stdout: "", stderr: "psql: error: FATAL: password authentication failed for user hidden" }, {
    stage: "production-postgres-authentication", executable: "docker", exitCode: 2,
  }), "PostgreSQL rejected password authentication; verify the Session Pooler URI and percent-encoding");
});

test("unclassified process failures expose only a diagnostic ID and stream sizes", () => {
  const unsafe = "postgresql://sensitive-user:my-unique-secret@db.private.example:5432/postgres?token=private-token; client 203.0.113.77";
  const message = formatCommandFailure({
    stage: "production-postgres-authentication",
    stdout: `unexpected stdout ${unsafe}`,
    stderr: `unexpected stderr ${unsafe}`,
    errorCode: "SENSITIVE_VALUE",
    exitCode: 2,
  });
  assert.match(message, /diagnostic_id=[0-9a-f-]{36}/);
  assert.match(message, /stdout_bytes=\d+; stderr_bytes=\d+/);
  assert.match(message, /spawn_code=none/);
  assert.doesNotMatch(message, /sensitive-user|my-unique-secret|private\.example|private-token|203\.0\.113\.77/);
});

test("Docker argv carries only environment variable names, never the URI, password, or SQL", () => {
  const args = buildDockerPsqlArgs(undefined);
  const joined = args.join(" ");
  assert.deepEqual(args.slice(0, 8), ["run", "--rm", "--network", "host", "-e", "BACKUP_DB_URL", "-e", "BACKUP_QUERY"]);
  assert.match(joined, /psql "\$BACKUP_DB_URL"/);
  assert.match(joined, /-c "\$BACKUP_QUERY"/);
  assert.doesNotMatch(joined, /kadkcuumcahnqrvalloz|strong|SELECT 1|@aws-/);
});

test("transport probe independently records DNS, TCP, and TLS without exposing addresses", async () => {
  const layers = await probePostgresEndpoint({ host: "pooler.example.test", port: 5432 }, {
    lookup: async () => [{ address: "203.0.113.10", family: 4 }],
    connectTcp: async (address, port) => ({ address, port, destroy() {} }),
    negotiateTls: async (socket, hostname) => {
      assert.equal(socket.port, 5432);
      assert.equal(hostname, "pooler.example.test");
      return "TLSv1.3";
    },
  });
  assert.deepEqual(layers, { dns: "passed", tcp: "passed", tls: "passed", tlsVersion: "TLSv1.3", addressCount: 1 });
  assert.doesNotMatch(JSON.stringify(layers), /203\.0\.113\.10|pooler\.example\.test/);
});

test("DNS and TCP failures are separately classified and omit the host and resolved address", async () => {
  await assert.rejects(probePostgresEndpoint({ host: "private-pooler.example.test", port: 5432 }, {
    lookup: async () => { throw Object.assign(new Error("private host text"), { code: "ENOTFOUND" }); },
  }), (error) => {
    assert.match(error.message, /production-postgres-dns: DNS could not resolve/);
    assert.match(error.message, /code=ENOTFOUND/);
    assert.doesNotMatch(error.message, /private-pooler|private host text/);
    return true;
  });
  await assert.rejects(probePostgresEndpoint({ host: "private-pooler.example.test", port: 5432 }, {
    lookup: async () => [{ address: "203.0.113.20", family: 4 }],
    connectTcp: async () => { throw Object.assign(new Error("private address text"), { code: "ECONNREFUSED" }); },
  }), (error) => {
    assert.match(error.message, /production-postgres-tcp: TCP connection .* refused/);
    assert.match(error.message, /code=ECONNREFUSED/);
    assert.doesNotMatch(error.message, /private-pooler|203\.0\.113\.20|private address text/);
    return true;
  });
});

test("real loopback TCP PostgreSQL SSLRequest refusal is distinguished as TLS, not Docker or authentication", async (t) => {
  const server = createServer((socket) => {
    socket.once("data", (data) => {
      assert.deepEqual([...data.subarray(0, 8)], [0, 0, 0, 8, 4, 210, 22, 47]);
      socket.write("N");
      socket.end();
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const port = server.address().port;
  await assert.rejects(probePostgresEndpoint({ host: "127.0.0.1", port }), (error) => {
    assert.match(error.message, /production-postgres-tls: PostgreSQL endpoint refused the SSLRequest/);
    assert.match(error.message, /code=PG_SSL_REFUSED/);
    assert.doesNotMatch(error.message, /127\.0\.0\.1|\b\d{1,3}(?:\.\d{1,3}){3}\b/);
    return true;
  });
});

test("standalone preflight runs layers and only a read-only SELECT, never disposable Supabase", async () => {
  const events = [];
  const env = {
    GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main",
    MIND_BACKUP_ENVIRONMENT: "production-db-backup", SUPABASE_DB_URL: goodUrl,
  };
  const result = await runPostgresPreflight(env, {
    probe: async () => {
      events.push("probe");
      return { dns: "passed", tcp: "passed", tls: "passed", tlsVersion: "TLSv1.3", addressCount: 1 };
    },
    query: (url, sql, mountDir, stage) => {
      events.push("query");
      assert.equal(url, goodUrl);
      assert.equal(sql, "SELECT 1");
      assert.equal(mountDir, undefined);
      assert.equal(stage, "production-postgres-authentication");
      return "1";
    },
    log: () => {},
  });
  assert.deepEqual(events, ["probe", "query"]);
  assert.deepEqual(result, {
    database: "postgres", sslmode: "verify-full", result: "passed", route: "pooler",
  });
});

test("preflight reports unexpected SELECT output without revealing it", async () => {
  const env = {
    GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main",
    MIND_BACKUP_ENVIRONMENT: "production-db-backup", SUPABASE_DB_URL: goodUrl,
  };
  const logs = [];
  let calls = 0;
  const result = await runPostgresPreflight(env, {
    probe: async () => ({ tlsVersion: "TLSv1.3" }),
    query: () => ++calls === 1 ? "private-unexpected-output" : "1",
    log: (line) => logs.push(line),
  });
  assert.equal(result.route, "direct");
  assert.equal(calls, 2);
  assert.match(logs.join("\n"), /production-postgres-result: SELECT 1 returned unexpected output shape/);
  assert.doesNotMatch(logs.join("\n"), /private-unexpected-output|strong%40password|pooler\.supabase\.com/);
});

test("preflight identifies a decoded NUL credential without echoing URI or value", async () => {
  const env = {
    GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main",
    MIND_BACKUP_ENVIRONMENT: "production-db-backup", SUPABASE_DB_URL: goodUrl,
  };
  const logs = [];
  await assert.rejects(runPostgresPreflight(env, {
    probe: async () => ({ tlsVersion: "TLSv1.3" }),
    query: () => { throw new ForbiddenPostgresCredentialError(); },
    log: (line) => logs.push(line),
  }), (error) => /production-postgres-credential: decoded password contains prohibited NUL byte/.test(error.message));
  assert.match(logs.join("\\n"), /production-postgres-credential: decoded password contains prohibited NUL byte/);
  assert.doesNotMatch(logs.join("\\n"), /strong%40password|pooler\\.supabase\\.com|kadkcuumcahnqrvalloz/);
});

test("preflight separates a client exception from database authentication", async () => {
  const env = {
    GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main",
    MIND_BACKUP_ENVIRONMENT: "production-db-backup", SUPABASE_DB_URL: goodUrl,
  };
  const logs = [];
  await assert.rejects(runPostgresPreflight(env, {
    probe: async () => ({ tlsVersion: "TLSv1.3" }),
    query: () => { throw new TypeError("private-client-value"); },
    log: (line) => logs.push(line),
  }), (error) => /production-postgres-client-setup: client-side TypeError/.test(error.message)
      && !error.message.includes("private-client-value"));
  assert.match(logs.join("\n"), /production-postgres-client-setup: client-side TypeError/);
  assert.doesNotMatch(logs.join("\n"), /private-client-value/);
});

test("preflight compares the official direct endpoint with the same password after a pooler failure", async () => {
  const env = {
    GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch", GITHUB_REF: "refs/heads/main",
    MIND_BACKUP_ENVIRONMENT: "production-db-backup",
    SUPABASE_DB_URL: goodUrl.replace("strong%40password", "p%40ss+%252F"),
  };
  const logs = [], routes = [];
  const deps = {
    probe: async () => ({ tlsVersion: "TLSv1.3" }),
    query: (url, sql) => {
      assert.equal(sql, "SELECT 1");
      const native = productionClientEnvironment(url, {});
      assert.equal(native.PGPASSWORD, "p@ss+%2F");
      assert.equal(native.PGSSLMODE, "verify-full");
      routes.push([native.PGUSER, native.PGHOST]);
      if (routes.length === 1) throw new Error("password authentication failed for hidden user and sensitive-value");
      return "1";
    },
    log: (line) => logs.push(line),
  };
  assert.equal((await runPostgresPreflight(env, deps)).route, "direct");
  assert.deepEqual(routes, [
    ["postgres.kadkcuumcahnqrvalloz", "aws-0-sa-east-1.pooler.supabase.com"],
    ["postgres", "db.kadkcuumcahnqrvalloz.supabase.co"],
  ]);
  assert.doesNotMatch(logs.join("\n"), /sensitive-value|supabase\.co|kadkcuumcahnqrvalloz|p@ss/);
  const direct = directComparisonUrl(env.SUPABASE_DB_URL);
  assert.throws(() => validateProductionDbUrl(direct), /projeto Supabase esperado/);
  assert.throws(() => productionClientEnvironment(direct.replace(".supabase.co", ".example.test"), {}));
  await assert.rejects(runPostgresPreflight(env, {
    ...deps, query: () => { throw new Error("production-postgres-authentication: secret-that-must-stay-hidden"); },
  }), error => /Both routes failed/.test(error.message) && !error.message.includes("secret-that-must-stay-hidden"));
});

test("backup invokes the independent preflight before starting disposable Supabase", () => {
  const script = readFileSync(new URL("./mind-production-backup.mjs", import.meta.url), "utf8");
  const preflight = script.indexOf("await runPostgresPreflight(env);");
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
