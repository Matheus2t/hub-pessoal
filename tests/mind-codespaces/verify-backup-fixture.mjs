import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildRestoreCommand, encryptDumpArchive, extractDumpArchive } from "../../scripts/mind-production-backup.mjs";

if (process.env.GITHUB_ACTIONS !== "true") throw new Error("Use only in the disposable GitHub Actions job.");
const admin = "postgresql://postgres:backup-fixture-only@127.0.0.1:54322/postgres";
const source = admin.replace(/postgres$/, "mind_backup_source");
const dest = admin.replace(/postgres$/, "mind_backup_restore");
const temp = mkdtempSync(join(tmpdir(), "mind-backup-fixture-"));
const plain = join(temp, "plain");
const restored = join(temp, "restored");
const bundle = join(temp, "backup.tar.gz.gpg");
const passphrase = randomBytes(48).toString("base64");
const image = "postgres:17-alpine";

function docker(args, options) {
  return execFileSync("docker", ["run", "--rm", "--network", "host", ...args], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options,
  });
}
function sql(url, statement) {
  return docker([image, "psql", url, "-XAt", "-v", "ON_ERROR_STOP=1", "-c", statement]).trim();
}
function dump(flags) {
  return docker([image, "pg_dump", source, "--no-owner", "--no-privileges", "--schema=public", "--schema=private", ...flags]);
}

try {
  mkdirSync(plain, { mode: 0o700 });
  mkdirSync(restored, { mode: 0o700 });
  sql(admin, "create database mind_backup_source");
  sql(admin, "create database mind_backup_restore");
  sql(source, `create schema private;
    create table public.fixture_notes (id int primary key, title text not null);
    create table private.fixture_admins (id int primary key);
    insert into public.fixture_notes values (1, 'synthetic backup sentinel');
    insert into private.fixture_admins values (2);
    alter table public.fixture_notes enable row level security;
    create policy fixture_public_read on public.fixture_notes for select using (true);`);
  writeFileSync(join(plain, "roles.sql"), "-- Fixture needs only the PostgreSQL built-in roles.\n");
  writeFileSync(join(plain, "schema.sql"), dump(["--schema-only"]));
  writeFileSync(join(plain, "data.sql"), dump(["--data-only"]));
  assert.ok(encryptDumpArchive(plain, bundle, passphrase) > 0);
  assert.equal(readFileSync(bundle).includes(Buffer.from("synthetic backup sentinel")), false);
  extractDumpArchive(bundle, restored, passphrase);
  docker(["-e", "LOCAL_DB_URL", "-v", restored + ":/backup:ro", image, "sh", "-lc", buildRestoreCommand()], {
    env: { ...process.env, LOCAL_DB_URL: dest },
  });

  const evidence = `select json_build_array(
    (select json_agg(to_jsonb(n) order by n.id) from public.fixture_notes n),
    (select json_agg(to_jsonb(a) order by a.id) from private.fixture_admins a),
    (select relrowsecurity from pg_class where oid = 'public.fixture_notes'::regclass),
    (select count(*) from pg_policies where policyname = 'fixture_public_read')
  )::text`;
  const original = sql(source, evidence);
  const recovered = sql(dest, evidence);
  assert.equal(recovered, original);
  assert.deepEqual(JSON.parse(recovered).slice(2), [true, 1]);
  console.log("PostgreSQL 17 fixture: AES-256 archive decrypted and restored, records and RLS policy match.");
} catch {
  throw new Error("The encrypted PostgreSQL fixture backup/restore did not complete. No raw database output was emitted.");
} finally {
  rmSync(temp, { recursive: true, force: true });
}
