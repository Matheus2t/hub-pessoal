import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_REF = "kadkcuumcahnqrvalloz";
const CLI_VERSION = "3.2.0";
const BACKUP_SCOPE = "Supabase CLI logical dump of public/private schemas and custom roles; managed Auth/Storage schemas, extension schemas, and Storage object bytes are excluded.";
const MAX_ARTIFACT_BYTES = 100 * 1024 * 1024;

export function validateProductionDbUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("SUPABASE_DB_URL não é uma URI PostgreSQL válida."); }
  const username = decodeURIComponent(url.username);
  const sslmode = url.searchParams.get("sslmode");
  if (!/^postgres(?:ql)?:$/.test(url.protocol)) throw new Error("SUPABASE_DB_URL deve usar o protocolo PostgreSQL.");
  if (username !== `postgres.${PROJECT_REF}`) throw new Error("A conexão não identifica o projeto Supabase esperado.");
  if (!/^[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) || url.port !== "5432") {
    throw new Error("Use o Session pooler IPv4 copiado do painel Supabase, na porta 5432.");
  }
  if (url.pathname !== "/postgres") throw new Error("A URI deve apontar para o banco postgres.");
  if (!url.password) throw new Error("A URI PostgreSQL não contém senha.");
  if (sslmode !== "require") throw new Error("A URI deve usar sslmode=require; modos TLS não validados são recusados.");
  return Object.freeze({ host: url.hostname, port: 5432, database: "postgres", sslmode });
}

export function validateManualEnvironment(env) {
  if (env.GITHUB_ACTIONS !== "true" || env.GITHUB_EVENT_NAME !== "workflow_dispatch" || env.GITHUB_REF !== "refs/heads/main") {
    throw new Error("Backup bloqueado: execute manualmente a partir da branch main no GitHub Actions.");
  }
  if (env.MIND_BACKUP_ENVIRONMENT !== "production-db-backup") {
    throw new Error("Backup bloqueado: environment protegido production-db-backup não foi selecionado.");
  }
  if (!env.SUPABASE_DB_URL) throw new Error("Secret de conexão ausente no environment protegido.");
  if (!/^[A-Za-z0-9+/]{64}$/.test(env.BACKUP_ENCRYPTION_PASSPHRASE || "")) {
    throw new Error("A chave deve ser a saída Base64 de 48 bytes aleatórios (64 caracteres, sem quebra de linha).");
  }
  return validateProductionDbUrl(env.SUPABASE_DB_URL);
}

export function parseLocalDbUrl(statusOutput) {
  const line = statusOutput.split(/\r?\n/).find((entry) => /^DB_URL=/.test(entry));
  if (!line) throw new Error("Supabase descartável não informou DB_URL.");
  let raw = line.slice("DB_URL=".length).trim();
  if (raw.startsWith('"')) raw = JSON.parse(raw);
  const url = new URL(raw);
  if (!(["localhost", "127.0.0.1", "::1"].includes(url.hostname)) || url.port !== "54322" || url.pathname !== "/postgres") {
    throw new Error("Restore recusado: DB_URL não aponta para o Postgres local descartável.");
  }
  return raw;
}

export function compareSnapshots(before, after, restored) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return Object.freeze({
    sourceStableDuringDump: same(before, after),
    restoredMatchesSource: same(before, restored),
  });
}

export function buildRestoreCommand() {
  return `psql "$LOCAL_DB_URL" -X --single-transaction --variable ON_ERROR_STOP=1 --file /backup/roles.sql --file /backup/schema.sql --command 'SET session_replication_role = replica' --file /backup/data.sql`;
}

export function classifyFailure(stderr = "") {
  if (/password authentication failed|authentication failed/i.test(stderr)) return "authentication rejected";
  if (/could not translate host|name or service not known|temporary failure in name resolution/i.test(stderr)) return "DNS resolution failed";
  if (/certificate|SSL error|TLS error|sslmode/i.test(stderr)) return "TLS verification failed";
  if (/timeout|timed out|connection refused|no route to host/i.test(stderr)) return "database network connection failed";
  if (/permission denied|not authorized|insufficient privilege/i.test(stderr)) return "database permissions rejected";
  return "command failed; raw output suppressed to protect credentials and data";
}

function run(file, args, { env = process.env, cwd = ROOT, input, maxBuffer = 16 * 1024 * 1024 } = {}) {
  const result = spawnSync(file, args, { cwd, env, input, encoding: "utf8", maxBuffer, windowsHide: true });
  if (result.error || result.status !== 0) {
    const category = classifyFailure(`${result.stderr ?? ""}\n${result.error?.message ?? ""}`);
    throw new Error(`${file} ${category} (exit ${result.status ?? "unavailable"}).`);
  }
  return result.stdout ?? "";
}

const dockerImage = "postgres:17-alpine";
function dockerPsql(dbUrl, sql, mountDir) {
  const args = ["run", "--rm", "--network", "host", "-e", "BACKUP_DB_URL", "-e", "BACKUP_QUERY"];
  if (mountDir) args.push("-v", `${mountDir}:/backup:ro`);
  args.push(dockerImage, "sh", "-lc", "psql \"$BACKUP_DB_URL\" -X -A -t -v ON_ERROR_STOP=1 -c \"$BACKUP_QUERY\"");
  return run("docker", args, { env: { ...process.env, BACKUP_DB_URL: dbUrl, BACKUP_QUERY: sql } }).trim();
}

function quoteIdent(value) { return `"${value.replaceAll('"', '""')}"`; }

function snapshot(dbUrl) {
  const metaSql = `SELECT json_build_object(
    'schemas',(SELECT coalesce(json_agg(nspname ORDER BY nspname),'[]'::json) FROM pg_namespace WHERE nspname IN ('public','private')),
    'tables',(SELECT count(*) FROM pg_tables WHERE schemaname IN ('public','private')),
    'functions',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prokind IN ('f','p')),
    'policies',(SELECT count(*) FROM pg_policies WHERE schemaname IN ('public','private')),
    'foreignKeys',(SELECT count(*) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname IN ('public','private') AND c.contype='f')
  )::text`;
  const meta = JSON.parse(dockerPsql(dbUrl, metaSql));
  const structureSql = `SELECT json_build_object(
    'schemas',(SELECT coalesce(json_agg(json_build_array(n.nspname,r.rolname) ORDER BY n.nspname),'[]'::json)
      FROM pg_namespace n JOIN pg_roles r ON r.oid=n.nspowner WHERE n.nspname IN ('public','private')),
    'relations',(SELECT coalesce(json_agg(json_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
      'columns',(SELECT coalesce(json_agg(json_build_array(a.attnum,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid),a.attidentity,a.attgenerated) ORDER BY a.attnum),'[]'::json)
        FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
      'constraints',(SELECT coalesce(json_agg(json_build_array(x.conname,pg_get_constraintdef(x.oid,true)) ORDER BY x.conname),'[]'::json) FROM pg_constraint x WHERE x.conrelid=c.oid),
      'indexes',(SELECT coalesce(json_agg(pg_get_indexdef(i.indexrelid) ORDER BY ic.relname),'[]'::json) FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid),
      'view',(CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid,true) ELSE NULL END)) ORDER BY n.nspname,c.relname),'[]'::json)
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND c.relkind IN ('r','p','v','m','S')),
    'constraints',(SELECT coalesce(json_agg(json_build_array(n.nspname,c.relname,x.conname,pg_get_constraintdef(x.oid,true)) ORDER BY n.nspname,c.relname,x.conname),'[]'::json)
      FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private')),
    'functions',(SELECT coalesce(json_agg(json_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_functiondef(p.oid)) ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),'[]'::json)
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prokind IN ('f','p')),
    'policies',(SELECT coalesce(json_agg(json_build_array(schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check) ORDER BY schemaname,tablename,policyname),'[]'::json) FROM pg_policies WHERE schemaname IN ('public','private')),
    'triggers',(SELECT coalesce(json_agg(json_build_array(n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid,true)) ORDER BY n.nspname,c.relname,t.tgname),'[]'::json)
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND NOT t.tgisinternal),
    'sequences',(SELECT coalesce(json_agg(json_build_array(s.schemaname,s.sequencename,s.data_type,s.start_value,s.min_value,s.max_value,s.increment_by,s.cycle,s.cache_size,s.last_value) ORDER BY s.schemaname,s.sequencename),'[]'::json)
      FROM pg_sequences s WHERE s.schemaname IN ('public','private'))
  )::text`;
  const structure = JSON.parse(dockerPsql(dbUrl, structureSql));
  const tables = JSON.parse(dockerPsql(dbUrl,
    "SELECT coalesce(json_agg(json_build_array(schemaname,tablename) ORDER BY schemaname,tablename),'[]'::json)::text FROM pg_tables WHERE schemaname IN ('public','private')"));
  const rows = {};
  for (const [schema, table] of tables) {
    const ident = `${quoteIdent(schema)}.${quoteIdent(table)}`;
    const sql = `SELECT count(*)::text || E'\\t' || md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY md5(to_jsonb(t)::text)), '')) FROM ${ident} AS t`;
    const [count, digest] = dockerPsql(dbUrl, sql).split("\t");
    if (!/^\d+$/.test(count ?? "") || !/^[a-f0-9]{32}$/.test(digest ?? "")) throw new Error("A verificação agregada das tabelas retornou formato inválido.");
    rows[`${schema}.${table}`] = { count: Number(count), digest };
  }
  const structureFingerprint = createHash("sha256").update(JSON.stringify(structure)).digest("hex");
  return { meta, structureFingerprint, rows };
}

function supabaseCli(args) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  return run(npx, ["--yes", `supabase@${CLI_VERSION}`, ...args], { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 });
}

function parseEnvValue(output, key) {
  const line = output.split(/\r?\n/).find((entry) => entry.startsWith(`${key}=`));
  if (!line) return undefined;
  const value = line.slice(key.length + 1).trim();
  return value.startsWith('"') ? JSON.parse(value) : value;
}

function sha256(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

function now() { return new Date().toISOString(); }

function createDisposableRuntime() {
  const runtime = mkdtempSync(join(tmpdir(), "mind-backup-runtime-"));
  const supabaseDir = join(runtime, "supabase");
  const runId = String(process.env.GITHUB_RUN_ID || Date.now()).replace(/[^0-9]/g, "").slice(-12);
  const config = `project_id = "mind-backup-${runId}"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
shadow_port = 54320
major_version = 17

[db.seed]
enabled = false

[auth]
enabled = true
site_url = "http://localhost:3000"
enable_signup = false
additional_redirect_urls = []
jwt_expiry = 3600

[auth.email]
enable_signup = false

[storage]
enabled = false
`;
  mkdirSync(join(supabaseDir, "migrations"), { recursive: true });
  writeFileSync(join(supabaseDir, "config.toml"), config, { mode: 0o600 });
  return runtime;
}

async function verifyDisposableServices(statusOutput) {
  const apiUrl = parseEnvValue(statusOutput, "API_URL");
  const anonKey = parseEnvValue(statusOutput, "ANON_KEY");
  const serviceKey = parseEnvValue(statusOutput, "SERVICE_ROLE_KEY");
  const api = new URL(apiUrl || "invalid:");
  if (!(api.hostname === "localhost" || api.hostname === "127.0.0.1" || api.hostname === "[::1]") || api.port !== "54321" || !anonKey || !serviceKey) {
    throw new Error("Supabase descartável não está limitado ao loopback ou não retornou as chaves locais esperadas.");
  }
  for (const [path, key] of [["/auth/v1/health", anonKey], ["/rest/v1/", serviceKey]]) {
    let response;
    try { response = await fetch(new URL(path, api), { headers: { apikey: key } }); }
    catch { throw new Error("Auth/PostgREST local não respondeu pelo loopback."); }
    if (!response.ok) throw new Error(`Auth/PostgREST local respondeu HTTP ${response.status}.`);
  }
}

export async function runProductionBackup(env = process.env) {
  process.umask(0o077);
  const target = validateManualEnvironment(env);
  const outputDir = resolve(env.MIND_BACKUP_OUTPUT_DIR || join(tmpdir(), "mind-production-backup"));
  mkdirSync(outputDir, { recursive: true, mode: 0o700 });
  const runtime = createDisposableRuntime();
  const plainDir = mkdtempSync(join(tmpdir(), "mind-production-backup-plain-"));
  const restoreDir = mkdtempSync(join(tmpdir(), "mind-production-backup-restore-"));
  const encryptedPath = join(outputDir, "mind-production-public-private-backup.tar.gz.gpg");
  const backupReportPath = join(outputDir, "backup-report.json");
  const restoreReportPath = join(outputDir, "restore-report.json");
  let backupMeta;

  try {
    console.log(`Target validated: ${target.database} on the configured Supabase session pooler; URL/password suppressed.`);
    supabaseCli(["start", "--workdir", runtime, "--exclude", "studio,inbucket,imgproxy,realtime,functions,analytics,vector,supavisor"]);
    const localStatus = supabaseCli(["status", "--workdir", runtime, "-o", "env"]);
    await verifyDisposableServices(localStatus);
    const localDbUrl = parseLocalDbUrl(localStatus);
    const before = snapshot(env.SUPABASE_DB_URL);

    const rolesPath = join(plainDir, "roles.sql");
    const schemaPath = join(plainDir, "schema.sql");
    const dataPath = join(plainDir, "data.sql");
    const remote = `--remote=${env.SUPABASE_DB_URL}`;
    supabaseCli(["db", "dump", remote, "-f", rolesPath, "--role-only"]);
    supabaseCli(["db", "dump", remote, "-f", schemaPath, "--schema", "public,private"]);
    supabaseCli(["db", "dump", remote, "-f", dataPath, "--data-only", "--use-copy", "--schema", "public,private"]);
    for (const file of [rolesPath, schemaPath, dataPath]) {
      if (statSync(file).size === 0) throw new Error("A Supabase dump component is empty; backup rejected.");
      chmodSync(file, 0o600);
    }

    const after = snapshot(env.SUPABASE_DB_URL);
    const stable = compareSnapshots(before, after, before);
    if (!stable.sourceStableDuringDump) throw new Error("A estrutura ou os dados de public/private mudaram durante o dump; repita em uma janela sem gravações.");

    const archivePath = join(plainDir, "backup.tar.gz");
    run("tar", ["-czf", archivePath, "-C", plainDir, "roles.sql", "schema.sql", "data.sql"]);
    const encrypted = run("gpg", ["--batch", "--yes", "--pinentry-mode", "loopback", "--passphrase-fd", "0", "--symmetric", "--cipher-algo", "AES256", "--output", encryptedPath, archivePath], { input: `${env.BACKUP_ENCRYPTION_PASSPHRASE}\n` });
    void encrypted;
    chmodSync(encryptedPath, 0o600);
    const encryptedSize = statSync(encryptedPath).size;
    if (encryptedSize > MAX_ARTIFACT_BYTES) throw new Error("Backup criptografado excede o limite de 100 MiB; artifact não será enviado.");
    const checksumPath = join(outputDir, "mind-production-public-private-backup.tar.gz.gpg.sha256");
    const encryptedSha256 = sha256(encryptedPath);
    writeFileSync(checksumPath, `${encryptedSha256}  ${encryptedPath.split(/[\\/]/).at(-1)}\n`, { mode: 0o600 });
    backupMeta = {
      generatedAt: now(), projectRef: PROJECT_REF, database: target.database, scope: BACKUP_SCOPE,
      encryptedBytes: encryptedSize, encryptedSha256,
      sourceObjectSummary: before.meta,
      sourceRows: Object.fromEntries(Object.entries(before.rows).map(([name, value]) => [name, value.count])),
    };
    writeFileSync(backupReportPath, `${JSON.stringify(backupMeta, null, 2)}\n`, { mode: 0o600 });
    console.log("Encrypted logical backup created; the artifact remains encrypted at rest.");

    const decryptedTar = join(restoreDir, "backup.tar.gz");
    run("gpg", ["--batch", "--yes", "--pinentry-mode", "loopback", "--passphrase-fd", "0", "--decrypt", "--output", decryptedTar, encryptedPath], { input: `${env.BACKUP_ENCRYPTION_PASSPHRASE}\n` });
    run("tar", ["-xzf", decryptedTar, "-C", restoreDir]);
    dockerPsql(localDbUrl, "SELECT 1");
    const restoreScript = buildRestoreCommand();
    const containerArgs = ["run", "--rm", "--network", "host", "-e", "LOCAL_DB_URL", "-v", `${restoreDir}:/backup:ro`, dockerImage, "sh", "-lc", restoreScript];
    run("docker", containerArgs, { env: { ...process.env, LOCAL_DB_URL: localDbUrl }, maxBuffer: 16 * 1024 * 1024 });

    const restored = snapshot(localDbUrl);
    const comparison = compareSnapshots(before, after, restored);
    if (!comparison.sourceStableDuringDump || !comparison.restoredMatchesSource) {
      throw new Error("Restore terminou, mas inventário de schemas, objetos ou fingerprints dos dados não corresponde à origem.");
    }
    const restoreReport = {
      completedAt: now(), result: "passed", projectRef: PROJECT_REF,
      restoredObjectSummary: restored.meta,
      tableCount: Object.keys(restored.rows).length,
      rowCountTotal: Object.values(restored.rows).reduce((sum, row) => sum + row.count, 0),
      tableFingerprintsMatched: true,
      scope: BACKUP_SCOPE,
      encryptedSha256: backupMeta.encryptedSha256,
    };
    writeFileSync(restoreReportPath, `${JSON.stringify(restoreReport, null, 2)}\n`, { mode: 0o600 });
    console.log("Disposable Supabase restore passed: schema metadata and every public/private table fingerprint matched.");
    return { backupReportPath, restoreReportPath, encryptedPath, checksumPath, report: restoreReport };
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : "Backup/restore failed; raw output suppressed.";
    writeFileSync(restoreReportPath, `${JSON.stringify({ completedAt: now(), result: "failed", projectRef: PROJECT_REF, message: safeMessage, encryptedSha256: backupMeta?.encryptedSha256 ?? null }, null, 2)}\n`, { mode: 0o600 });
    throw error;
  } finally {
    rmSync(plainDir, { recursive: true, force: true });
    rmSync(restoreDir, { recursive: true, force: true });
    try { supabaseCli(["stop", "--workdir", runtime]); } catch { /* the hosted runner is ephemeral */ }
    rmSync(runtime, { recursive: true, force: true });
  }
}

async function main() {
  const command = process.argv[2];
  if (command !== "run") throw new Error("Use this script only through the protected manual GitHub Actions workflow.");
  await runProductionBackup();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : "Backup workflow failed."); process.exitCode = 1; });
}
