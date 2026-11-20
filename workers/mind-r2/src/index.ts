import {
  canReserve, expectedPartSize, MAX_R2_PARTS, MAX_R2_STORAGE_BYTES,
  parseByteRange, R2_PART_BYTES, R2_UPLOAD_TTL_MS, R2_VIDEO_KEY, safeFileName, UUID_PATTERN,
} from "./protocol";

type Env = {
  MIND_VIDEOS: any;
  MIND_STORAGE: { idFromName(name: string): unknown; get(id: unknown): { fetch(request: Request): Promise<Response> } };
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  ALLOWED_ORIGINS: string;
};

const json = (data: unknown, status = 200, headers?: HeadersInit) => Response.json(data, { status, headers });
const bad = (message: string, status = 400) => json({ error: message }, status);
const asJson = async (request: Request): Promise<Record<string, unknown>> => {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 16_384) throw new Error("Requisição administrativa muito grande.");
  const value: unknown = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Corpo inválido.");
  return value as Record<string, unknown>;
};
const uuid = () => crypto.randomUUID();
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
async function secretHash(secret: string) {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret))));
}
function configuredOrigins(env: Env) {
  return new Set(env.ALLOWED_ORIGINS.split(",").map(value => value.trim()).filter(value => {
    try { const url = new URL(value); return (url.protocol === "https:" || url.hostname === "localhost") && url.origin === value; }
    catch { return false; }
  }));
}
function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({ "Vary": "Origin", "Access-Control-Expose-Headers": "Accept-Ranges, Content-Range, Content-Length, ETag, Content-Disposition" });
  const origin = request.headers.get("origin");
  if (origin && configuredOrigins(env).has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}
function withCors(response: Response, request: Request, env: Env): Response {
  const headers = new Headers(response.headers);
  corsHeaders(request, env).forEach((value, key) => headers.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function control(env: Env, path: string, body?: unknown, method = "POST") {
  const id = env.MIND_STORAGE.idFromName("global-storage-ledger-v1");
  return env.MIND_STORAGE.get(id).fetch(new Request("https://mind-storage.internal" + path, {
    method, headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
}
async function controlJson(env: Env, path: string, body?: unknown, method = "POST") {
  const response = await control(env, path, body, method);
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) throw Object.assign(new Error(String(data.error ?? "Controle de armazenamento indisponível.")), { status: response.status });
  return data;
}
function bearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return /^Bearer [A-Za-z0-9._~-]{20,8192}$/.test(header) ? header.slice(7) : "";
}
async function requireAdmin(request: Request, env: Env) {
  const origin = request.headers.get("origin");
  if (!origin || !configuredOrigins(env).has(origin)) throw Object.assign(new Error("Origem não autorizada."), { status: 403 });
  const token = bearer(request);
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw Object.assign(new Error("Sessão administrativa necessária."), { status: 401 });
  const headers = { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: "Bearer " + token };
  const [identity, permission] = await Promise.all([
    fetch(env.SUPABASE_URL + "/auth/v1/user", { headers, signal: AbortSignal.timeout(8000) }),
    fetch(env.SUPABASE_URL + "/rest/v1/rpc/mind_is_admin", {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(8000),
    }),
  ]);
  if (identity.status === 401 || permission.status === 401 || permission.status === 403) {
    throw Object.assign(new Error("Sessão expirada ou sem permissão de administrador."), { status: 403 });
  }
  if (!identity.ok || !permission.ok) throw Object.assign(new Error("Não foi possível confirmar as permissões no Supabase."), { status: 503 });
  const user = await identity.json() as { id?: unknown };
  if (!UUID_PATTERN.test(String(user.id ?? "")) || (await permission.json()) !== true) {
    throw Object.assign(new Error("A conta não possui permissão de administrador."), { status: 403 });
  }
  return { id: String(user.id), token, headers };
}
async function itemReference(env: Env, admin: Awaited<ReturnType<typeof requireAdmin>>, itemId: string, key: string, size: number) {
  const query = new URLSearchParams({
    select: "id,owner_id,kind,storage_path,file_size,video_storage_provider",
    id: "eq." + itemId,
    storage_path: "eq." + key,
    file_size: "eq." + size,
    video_storage_provider: "eq.r2",
    kind: "eq.video",
    limit: "1",
  });
  const response = await fetch(env.SUPABASE_URL + "/rest/v1/mind_items?" + query, {
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: "Bearer " + admin.token },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw Object.assign(new Error("Não foi possível confirmar o registro publicado no Supabase."), { status: 503 });
  const rows = await response.json() as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row || row.owner_id !== admin.id || row.kind !== "video" || row.storage_path !== key ||
      row.video_storage_provider !== "r2" || Number(row.file_size) !== size) {
    throw Object.assign(new Error("O MP4 ainda não está vinculado a um registro válido da biblioteca."), { status: 409 });
  }
}
async function noItemReference(env: Env, admin: Awaited<ReturnType<typeof requireAdmin>>, key: string) {
  const query = new URLSearchParams({ select: "id", storage_path: "eq." + key, video_storage_provider: "eq.r2", limit: "1" });
  const response = await fetch(env.SUPABASE_URL + "/rest/v1/mind_items?" + query, {
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: "Bearer " + admin.token }, signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw Object.assign(new Error("Não foi possível confirmar que o vídeo não está vinculado."), { status: 503 });
  if ((await response.json() as unknown[]).length) throw Object.assign(new Error("O vídeo ainda está vinculado a um item."), { status: 409 });
}

async function publicMedia(request: Request, env: Env, key: string) {
  if (!R2_VIDEO_KEY.test(key)) return bad("Vídeo não encontrado.", 404);
  const ledger = await controlJson(env, "/published?key=" + encodeURIComponent(key), undefined, "GET");
  if (ledger.published !== true || !Number.isSafeInteger(ledger.size)) return bad("Vídeo não encontrado.", 404);
  const size = Number(ledger.size);
  const range = parseByteRange(request.headers.get("range"), size);
  if (range === false) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" } });
  const object = await env.MIND_VIDEOS.get(key, range ? { range: { offset: range.start, length: range.length } } : undefined);
  if (!object || object.size !== size) return bad("Arquivo temporariamente indisponível.", 503);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", "video/mp4");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Length", String(range?.length ?? size));
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  headers.set("X-Content-Type-Options", "nosniff");
  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  }
  const filename = request.url && new URL(request.url).searchParams.get("download");
  if (filename !== null) {
    const safe = safeFileName(filename).replace(/["\r\n]/g, "_");
    headers.set("Content-Disposition", `attachment; filename="${safe.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(safe)}`);
  }
  return new Response(request.method === "HEAD" ? null : object.body, { status: range ? 206 : 200, headers });
}

async function adminRoute(request: Request, env: Env, url: URL) {
  const admin = await requireAdmin(request, env);
  const path = url.pathname;
  if (path === "/admin/storage" && request.method === "GET") {
    return json(await controlJson(env, "/storage", undefined, "GET"));
  }
  if (path === "/admin/storage/bootstrap" && request.method === "POST") {
    const initial = await controlJson(env, "/bootstrap/start", { now: Date.now() });
    if (initial.ready === true) return json(initial);
    let cursor: string | undefined;
    do {
      const page = await env.MIND_VIDEOS.list({ limit: 1000, ...(cursor ? { cursor } : {}) });
      const objects = page.objects.map((object: { key: string; size: number }) => ({ key: object.key, size: object.size }));
      await controlJson(env, "/bootstrap/page", { objects });
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    return json(await controlJson(env, "/bootstrap/finish", { now: Date.now() }));
  }
  const uploadMatch = path.match(/^\/admin\/uploads\/([0-9a-f-]{36})(?:\/(parts\/([0-9]+)|complete|commit|cancel))?$/i);
  if (path === "/admin/uploads" && request.method === "POST") {
    const body = await asJson(request);
    const itemId = String(body.itemId ?? "");
    const totalBytes = Number(body.totalBytes);
    const idempotencyKey = String(request.headers.get("idempotency-key") ?? body.idempotencyKey ?? "");
    const capability = String(body.capability ?? "");
    if (!UUID_PATTERN.test(itemId) || !Number.isSafeInteger(totalBytes) || totalBytes < 12 || totalBytes > MAX_R2_STORAGE_BYTES ||
        !/^[0-9a-f-]{36}$/i.test(idempotencyKey) || !/^[A-Za-z0-9_-]{40,64}$/.test(capability)) return bad("Parâmetros de upload inválidos.");
    const filename = safeFileName(body.fileName);
    const key = `videos/${admin.id}/${itemId}-${uuid()}.mp4`;
    const hash = await secretHash(capability);
    const reserved = await controlJson(env, "/reserve", { idempotencyKey, capabilityHash: hash, ownerId: admin.id, itemId, key, size: totalBytes });
    if (reserved.status === "committed") return json({ ...reserved, fileName: filename });
    if (!reserved.uploadId) {
      const creating = await controlJson(env, "/create/start", { id: reserved.id, capabilityHash: hash });
      if (creating.uploadId) return json({ ...creating, fileName: filename });
      if (creating.create !== true) return bad("O envio está sendo preparado; tente consultar o progresso novamente.", 503);
      try {
        const multipart = await env.MIND_VIDEOS.createMultipartUpload(reserved.key, { httpMetadata: { contentType: "video/mp4" } });
        const confirmed = await controlJson(env, "/create/confirm", { id: reserved.id, uploadId: multipart.uploadId, capabilityHash: hash });
        return json({ ...confirmed, fileName: filename });
      } catch {
        // Reservation remains held if R2/ledger state is uncertain. Expiry cleanup is fail-closed.
        return bad("Não foi possível iniciar o multipart. A reserva ficará protegida até a reconciliação automática.", 503);
      }
    }
    return json({ ...reserved, fileName: filename });
  }
  if (uploadMatch) {
    const id = uploadMatch[1];
    const action = uploadMatch[2] ?? "status";
    const capability = request.headers.get("x-upload-capability") ?? "";
    const hash = await secretHash(capability);
    const session = await controlJson(env, "/get?id=" + encodeURIComponent(id) + "&capabilityHash=" + encodeURIComponent(hash), undefined, "GET");
    if (action === "status" && request.method === "GET") return json(session);
    if (action.startsWith("parts/") && request.method === "PUT") {
      const partNumber = Number(uploadMatch[3]);
      const expected = expectedPartSize(Number(session.size), partNumber);
      const contentLength = Number(request.headers.get("content-length"));
      if (!request.body || !expected || partNumber > MAX_R2_PARTS || contentLength !== expected || session.status !== "reserved" || !session.uploadId) {
        return bad("Bloco inválido para esta reserva.", contentLength !== expected ? 413 : 409);
      }
      await controlJson(env, "/part/start", { id, partNumber, size: expected, capabilityHash: hash });
      let received = 0;
      const checked = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          received += chunk.byteLength;
          if (received > expected) throw new Error("O bloco excedeu o tamanho reservado.");
          controller.enqueue(chunk);
        },
        flush() { if (received !== expected) throw new Error("O bloco chegou incompleto."); },
      }));
      const upload = env.MIND_VIDEOS.resumeMultipartUpload(String(session.key), String(session.uploadId));
      try {
        const part = await upload.uploadPart(partNumber, checked);
        if (received !== expected || typeof part.etag !== "string") throw new Error("O bloco recebido não confere.");
        await controlJson(env, "/part", { id, partNumber, size: received, etag: part.etag, capabilityHash: hash });
        return json({ partNumber, confirmedBytes: received, etag: part.etag });
      } catch {
        await controlJson(env, "/part/fail", { id, partNumber, capabilityHash: hash }).catch(() => undefined);
        return bad("Falha ao receber o bloco. Ele pode ser reenviado com segurança.", 502);
      }
    }
    if (action === "complete" && request.method === "POST") {
      const started = await controlJson(env, "/complete/start", { id, capabilityHash: hash });
      if (started.status === "committed" || started.status === "completed") return json(started);
      let object = await env.MIND_VIDEOS.head(String(started.key));
      if (!object) {
        const upload = env.MIND_VIDEOS.resumeMultipartUpload(String(started.key), String(started.uploadId));
        try { await upload.complete(started.parts); }
        catch {
          object = await env.MIND_VIDEOS.head(String(started.key));
          if (!object) return bad("O R2 não confirmou todos os blocos. O estado foi preservado para retomada.", 502);
        }
      }
      object ??= await env.MIND_VIDEOS.head(String(started.key));
      if (!object || object.size !== Number(started.size)) {
        if (object) {
          await env.MIND_VIDEOS.delete(String(started.key));
          if (await env.MIND_VIDEOS.head(String(started.key))) return bad("O tamanho final divergiu; o objeto foi mantido contabilizado para revisão.", 503);
        }
        return bad("O tamanho final do R2 não corresponde à reserva.", 409);
      }
      return json(await controlJson(env, "/complete/confirm", { id, size: object.size, etag: object.httpEtag, capabilityHash: hash }));
    }
    if (action === "commit" && request.method === "POST") {
      await asJson(request);
      if (session.status === "committed") return json(session);
      await itemReference(env, admin, String(session.itemId), String(session.key), Number(session.size));
      return json(await controlJson(env, "/commit", { id, key: session.key, size: session.size, ownerId: admin.id, itemId: session.itemId, etag: session.etag, capabilityHash: hash }));
    }
    if (action === "cancel" && request.method === "POST") {
      if (session.status === "committed") return bad("Vídeo já publicado; exclua o item pela biblioteca.", 409);
      await controlJson(env, "/abort/start", { id, capabilityHash: hash });
      let abortConfirmed = !session.uploadId;
      if (session.uploadId) {
        try {
          await env.MIND_VIDEOS.resumeMultipartUpload(String(session.key), String(session.uploadId)).abort();
          abortConfirmed = true;
        } catch { /* A missing object does not prove multipart parts were released. */ }
      }
      if (await env.MIND_VIDEOS.head(String(session.key))) {
        await env.MIND_VIDEOS.delete(String(session.key));
        abortConfirmed = true;
      }
      if (await env.MIND_VIDEOS.head(String(session.key))) return bad("Não foi possível confirmar a remoção; o espaço continua reservado.", 503);
      if (!abortConfirmed) return bad("O R2 não confirmou a liberação das partes. A reserva permanece ativa para proteção do limite.", 503);
      await controlJson(env, "/abort/confirm", { id, confirmed: true, capabilityHash: hash });
      return new Response(null, { status: 204 });
    }
  }
  if (path === "/admin/videos/delete" && request.method === "POST") {
    const body = await asJson(request);
    const key = String(body.key ?? "");
    if (!R2_VIDEO_KEY.test(key)) return bad("Chave de vídeo inválida.");
    await noItemReference(env, admin, key);
    await env.MIND_VIDEOS.delete(key);
    if (await env.MIND_VIDEOS.head(key)) return bad("Não foi possível confirmar a remoção; o espaço permanece contabilizado.", 503);
    await controlJson(env, "/delete", { key });
    return new Response(null, { status: 204 });
  }
  if (path === "/admin/videos/publish" && request.method === "POST") {
    const body = await asJson(request), itemId = String(body.itemId ?? "");
    if (!UUID_PATTERN.test(itemId)) return bad("Item inválido.");
    const query = new URLSearchParams({
      select: "id,owner_id,kind,storage_path,file_size,video_storage_provider",
      id: "eq." + itemId, video_storage_provider: "eq.r2", kind: "eq.video", limit: "1",
    });
    const response = await fetch(env.SUPABASE_URL + "/rest/v1/mind_items?" + query, {
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: "Bearer " + admin.token }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return bad("Não foi possível reconciliar o item no Supabase.", 503);
    const row = (await response.json() as Array<Record<string, unknown>>)[0];
    if (!row || row.owner_id !== admin.id || typeof row.storage_path !== "string" || !R2_VIDEO_KEY.test(row.storage_path) ||
        !Number.isSafeInteger(Number(row.file_size)) || Number(row.file_size) < 1) return bad("O item não referencia um vídeo R2 válido.", 409);
    const object = await env.MIND_VIDEOS.head(row.storage_path);
    if (!object || object.size !== Number(row.file_size)) return bad("O objeto R2 não corresponde ao registro; permanece bloqueado.", 409);
    return json(await controlJson(env, "/publish", {
      key: row.storage_path, size: object.size, ownerId: admin.id, itemId,
      etag: object.httpEtag,
    }));
  }
  return bad("Rota administrativa não encontrada.", 404);
}

export class StorageControl {
  private state: any;
  private env: Env;
  constructor(state: any, env: Env) {
    this.state = state;
    this.env = env;
    state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS objects (key TEXT PRIMARY KEY, size INTEGER NOT NULL, published INTEGER NOT NULL DEFAULT 0, owner_id TEXT, item_id TEXT, etag TEXT, managed INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, owner_id TEXT NOT NULL, item_id TEXT NOT NULL, object_key TEXT NOT NULL, size INTEGER NOT NULL, capability_hash TEXT NOT NULL, status TEXT NOT NULL, upload_id TEXT, etag TEXT, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS parts (upload_id TEXT NOT NULL, part_number INTEGER NOT NULL, size INTEGER NOT NULL, etag TEXT NOT NULL, PRIMARY KEY (upload_id, part_number), FOREIGN KEY(upload_id) REFERENCES uploads(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS part_locks (upload_id TEXT NOT NULL, part_number INTEGER NOT NULL, PRIMARY KEY(upload_id, part_number));
      CREATE INDEX IF NOT EXISTS uploads_expiry_idx ON uploads(status, expires_at);
    `);
  }
  private sql(query: string, ...bindings: unknown[]) { return this.state.storage.sql.exec(query, ...bindings).toArray() as Array<Record<string, unknown>>; }
  private send(data: unknown, status = 200) { return json(data, status); }
  private fail(message: string, status = 400) { return this.send({ error: message }, status); }
  private initialized() { return this.sql("SELECT value FROM settings WHERE key='initialized'")[0]?.value === "1"; }
  private upload(id: string) { return this.sql("SELECT * FROM uploads WHERE id=?", id)[0]; }
  private validSecret(row: Record<string, unknown> | undefined, hash: string) {
    if (!row || typeof hash !== "string" || typeof row.capability_hash !== "string" || row.capability_hash.length !== hash.length) return false;
    let diff = 0; for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ String(row.capability_hash).charCodeAt(i);
    return diff === 0;
  }
  async fetch(request: Request) {
    const url = new URL(request.url), path = url.pathname;
    try {
      if (path === "/bootstrap/start" && request.method === "POST") {
        if (this.initialized()) return this.storage();
        this.state.storage.sql.exec("DELETE FROM objects WHERE managed=0; DELETE FROM settings WHERE key IN ('bootstrapping','bootstrap_error'); INSERT INTO settings(key,value) VALUES('bootstrapping','1') ON CONFLICT(key) DO UPDATE SET value='1';");
        return this.send({ ready: false, bootstrapping: true });
      }
      if (path === "/bootstrap/page" && request.method === "POST") {
        if (this.initialized() || !this.sql("SELECT value FROM settings WHERE key='bootstrapping'").length) return this.fail("Inventário não iniciado.", 409);
        const body = await request.json() as { objects?: Array<{ key?: string; size?: number }> };
        for (const object of body.objects ?? []) {
          if (typeof object.key !== "string" || !Number.isSafeInteger(object.size) || Number(object.size) < 0) return this.fail("Inventário R2 inválido.");
          this.sql("INSERT INTO objects(key,size,published,managed) VALUES(?,?,0,0) ON CONFLICT(key) DO UPDATE SET size=excluded.size, published=0, managed=0", object.key, object.size);
        }
        return this.send({ accepted: body.objects?.length ?? 0 });
      }
      if (path === "/bootstrap/finish" && request.method === "POST") {
        if (this.initialized()) return this.storage();
        const total = Number(this.sql("SELECT COALESCE(SUM(size),0) AS bytes FROM objects")[0]?.bytes ?? 0);
        if (!Number.isSafeInteger(total) || total > MAX_R2_STORAGE_BYTES) {
          this.sql("INSERT INTO settings(key,value) VALUES('bootstrap_error',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", `Inventário excede o teto: ${total} bytes.`);
          return this.fail("O bucket já ultrapassa 5 GB. Nenhum upload foi habilitado.", 409);
        }
        this.sql("INSERT INTO settings(key,value) VALUES('initialized','1') ON CONFLICT(key) DO UPDATE SET value='1'; DELETE FROM settings WHERE key IN ('bootstrapping','bootstrap_error');");
        return this.storage();
      }
      if (path === "/reserve" && request.method === "POST") {
        if (!this.initialized()) return this.fail("Inventário obrigatório do bucket ainda não foi concluído.", 503);
        const b = await request.json() as Record<string, unknown>;
        const [idem, cap, owner, item, key, size] = [b.idempotencyKey, b.capabilityHash, b.ownerId, b.itemId, b.key, b.size];
        if (typeof idem !== "string" || typeof cap !== "string" || !UUID_PATTERN.test(String(owner)) || !UUID_PATTERN.test(String(item)) || !R2_VIDEO_KEY.test(String(key)) ||
            !Number.isSafeInteger(size) || Number(size) < 1 || Number(size) > MAX_R2_STORAGE_BYTES) return this.fail("Reserva inválida.");
        const outcome = this.state.storage.transactionSync(() => {
          const existing = this.sql("SELECT * FROM uploads WHERE idempotency_key=?", idem)[0];
          if (existing) {
            if (existing.owner_id !== owner || existing.item_id !== item || existing.size !== size || !this.validSecret(existing, String(cap))) {
              return { error: "Chave de retomada já vinculada a outro envio.", status: 409 };
            }
            return { value: { id: existing.id, key: existing.object_key, size: existing.size, status: existing.status, uploadId: existing.upload_id } };
          }
          const occupied = Number(this.sql("SELECT COALESCE(SUM(size),0) AS bytes FROM objects")[0]?.bytes ?? 0);
          const reserved = Number(this.sql("SELECT COALESCE(SUM(size),0) AS bytes FROM uploads WHERE status IN ('reserved','creating','completing','completed','aborting')")[0]?.bytes ?? 0);
          if (!canReserve(occupied, reserved, Number(size))) return { error: "Armazenamento insuficiente: o teto de 5 GB seria ultrapassado.", status: 413 };
          const id = uuid();
          const createdAt = Date.now(), expiresAt = createdAt + R2_UPLOAD_TTL_MS;
          this.sql("INSERT INTO uploads(id,idempotency_key,owner_id,item_id,object_key,size,capability_hash,status,created_at,expires_at) VALUES(?,?,?,?,?,?,?,'reserved',?,?)", id, idem, owner, item, key, size, cap, createdAt, expiresAt);
          return { value: { id, key, size, status: "reserved", uploadId: null }, created: true, expiresAt };
        });
        if (outcome.error) return this.fail(outcome.error, outcome.status);
        if (outcome.created) await this.state.storage.setAlarm(Number(outcome.expiresAt));
        return this.send(outcome.value, outcome.created ? 201 : 200);
      }
      if (path === "/create/start" && request.method === "POST") {
        const b = await request.json() as { id: string; capabilityHash: string }, row = this.upload(String(b.id));
        if (!this.validSecret(row, b.capabilityHash)) return this.fail("Reserva não encontrada.", 404);
        if (row.status === "committed" || row.upload_id) return this.send({ id: row.id, key: row.object_key, size: row.size, status: row.status, uploadId: row.upload_id });
        if (row.status !== "reserved") return this.send({ id: row.id, status: row.status, create: false });
        this.sql("UPDATE uploads SET status='creating' WHERE id=? AND status='reserved'", row.id);
        return this.send({ id: row.id, key: row.object_key, size: row.size, status: "creating", create: true });
      }
      if (path === "/create/confirm" && request.method === "POST") {
        const b = await request.json() as { id: string; uploadId: string; capabilityHash: string }, row = this.upload(String(b.id));
        if (!this.validSecret(row, b.capabilityHash) || row.status !== "creating" || typeof b.uploadId !== "string" || b.uploadId.length > 512) return this.fail("Criação multipart inconclusiva.", 409);
        this.sql("UPDATE uploads SET upload_id=?, status='reserved' WHERE id=?", b.uploadId, row.id);
        return this.send({ id: row.id, key: row.object_key, size: row.size, uploadId: b.uploadId, status: "reserved" });
      }
      if (path === "/get" && request.method === "GET") {
        const row = this.upload(String(url.searchParams.get("id"))), hash = String(url.searchParams.get("capabilityHash") ?? "");
        if (!this.validSecret(row, hash)) return this.fail("Envio não encontrado.", 404);
        const parts = this.sql("SELECT part_number,size FROM parts WHERE upload_id=? ORDER BY part_number", row!.id).map(p => ({ partNumber: p.part_number, size: p.size }));
        return this.send({ id: row!.id, itemId: row!.item_id, key: row!.object_key, size: row!.size, status: row!.status, uploadId: row!.upload_id, parts, etag: row!.etag, expiresAt: row!.expires_at });
      }
      if (path === "/part" && request.method === "POST") {
        const b = await request.json() as Record<string, unknown>, row = this.upload(String(b.id));
        const expected = row ? expectedPartSize(Number(row.size), Number(b.partNumber)) : 0;
        if (!this.validSecret(row, String(b.capabilityHash)) || row!.status !== "reserved" || !expected || b.size !== expected || typeof b.etag !== "string" || b.etag.length > 256) return this.fail("Parte inválida para esta reserva.", 409);
        this.sql("INSERT INTO parts(upload_id,part_number,size,etag) VALUES(?,?,?,?) ON CONFLICT(upload_id,part_number) DO UPDATE SET size=excluded.size,etag=excluded.etag", row!.id, b.partNumber, b.size, b.etag);
        this.sql("DELETE FROM part_locks WHERE upload_id=? AND part_number=?", row!.id, b.partNumber);
        return this.send({ ok: true });
      }
      if (path === "/part/start" && request.method === "POST") {
        const b = await request.json() as Record<string, unknown>, row = this.upload(String(b.id));
        if (!this.validSecret(row, String(b.capabilityHash)) || row!.status !== "reserved" ||
            expectedPartSize(Number(row!.size), Number(b.partNumber)) !== b.size) return this.fail("Bloco não autorizado.", 409);
        try { this.sql("INSERT INTO part_locks(upload_id,part_number) VALUES(?,?)", row!.id, b.partNumber); }
        catch { return this.fail("Este bloco já está sendo enviado.", 409); }
        const expiresAt = Math.min(Number(row!.created_at) + R2_UPLOAD_TTL_MS, Date.now() + R2_UPLOAD_TTL_MS);
        this.sql("UPDATE uploads SET expires_at=? WHERE id=?", expiresAt, row!.id);
        await this.state.storage.setAlarm(expiresAt);
        return this.send({ ok: true });
      }
      if (path === "/part/fail" && request.method === "POST") {
        const b = await request.json() as { id: string; partNumber: number; capabilityHash: string }, row = this.upload(String(b.id));
        if (!this.validSecret(row, b.capabilityHash)) return this.fail("Envio não encontrado.", 404);
        this.sql("DELETE FROM part_locks WHERE upload_id=? AND part_number=?", row!.id, b.partNumber);
        return this.send({ ok: true });
      }
      if (path === "/complete/start" && request.method === "POST") {
        const b = await request.json() as { id: string; capabilityHash: string }, row = this.upload(String(b.id));
        if (!this.validSecret(row, b.capabilityHash)) return this.fail("Envio não encontrado.", 404);
        if (row!.status === "committed" || row!.status === "completed") return this.send({ id: row!.id, key: row!.object_key, size: row!.size, status: row!.status, etag: row!.etag });
        if (!(["reserved", "completing"].includes(String(row!.status))) || !row!.upload_id) return this.fail("Upload multipart indisponível.", 409);
        if (this.sql("SELECT part_number FROM part_locks WHERE upload_id=? LIMIT 1", row!.id).length) return this.fail("Há blocos ainda em trânsito.", 409);
        const parts = this.sql("SELECT part_number,size,etag FROM parts WHERE upload_id=? ORDER BY part_number", row!.id);
        const count = Math.ceil(Number(row!.size) / R2_PART_BYTES);
        if (count > MAX_R2_PARTS || parts.length !== count || parts.some((p, i) => p.part_number !== i + 1 || p.size !== expectedPartSize(Number(row!.size), i + 1))) return this.fail("O envio está incompleto; envie os blocos pendentes.", 409);
        const expiresAt = Math.min(Number(row!.created_at) + R2_UPLOAD_TTL_MS, Date.now() + R2_UPLOAD_TTL_MS);
        this.sql("UPDATE uploads SET status='completing',expires_at=? WHERE id=?", expiresAt, row!.id);
        await this.state.storage.setAlarm(expiresAt);
        return this.send({ id: row!.id, key: row!.object_key, size: row!.size, uploadId: row!.upload_id, status: "completing", parts: parts.map(p => ({ partNumber: p.part_number, etag: p.etag })) });
      }
      if (path === "/complete/confirm" && request.method === "POST") {
        const b = await request.json() as { id: string; size: number; etag: string; capabilityHash: string }, row = this.upload(String(b.id));
        if (!this.validSecret(row, b.capabilityHash) || !["completing", "completed"].includes(String(row!.status)) || b.size !== row!.size || typeof b.etag !== "string") return this.fail("Tamanho ou estado final inválido.", 409);
        this.sql("UPDATE uploads SET status='completed',etag=? WHERE id=?", b.etag, row!.id);
        return this.send({ id: row!.id, itemId: row!.item_id, key: row!.object_key, size: row!.size, status: "completed", etag: b.etag });
      }
      if (path === "/commit" && request.method === "POST") {
        const b = await request.json() as Record<string, unknown>, row = this.upload(String(b.id));
        if (!this.validSecret(row, String(b.capabilityHash)) || row!.object_key !== b.key || row!.size !== b.size || row!.owner_id !== b.ownerId || row!.item_id !== b.itemId) return this.fail("Publicação não corresponde à reserva.", 409);
        if (row!.status === "committed") return this.send({ id: row!.id, key: row!.object_key, size: row!.size, status: "committed" });
        if (row!.status !== "completed") return this.fail("O objeto ainda não foi concluído.", 409);
        this.sql("INSERT INTO objects(key,size,published,owner_id,item_id,etag,managed) VALUES(?,?,1,?,?,?,1) ON CONFLICT(key) DO UPDATE SET size=excluded.size,published=1,owner_id=excluded.owner_id,item_id=excluded.item_id,etag=excluded.etag,managed=1", row!.object_key, row!.size, row!.owner_id, row!.item_id, row!.etag);
        this.sql("UPDATE uploads SET status='committed' WHERE id=?", row!.id);
        return this.send({ id: row!.id, key: row!.object_key, size: row!.size, status: "committed" });
      }
      if (path === "/publish" && request.method === "POST") {
        const b = await request.json() as Record<string, unknown>;
        const row = this.sql("SELECT * FROM uploads WHERE object_key=?", String(b.key))[0];
        if (!row || row.owner_id !== b.ownerId || row.item_id !== b.itemId || row.size !== b.size ||
            !["completed", "committed"].includes(String(row.status))) return this.fail("Reserva concluída não corresponde ao registro.", 409);
        this.sql("INSERT INTO objects(key,size,published,owner_id,item_id,etag,managed) VALUES(?,?,1,?,?,?,1) ON CONFLICT(key) DO UPDATE SET size=excluded.size,published=1,owner_id=excluded.owner_id,item_id=excluded.item_id,etag=excluded.etag,managed=1", row.object_key, row.size, row.owner_id, row.item_id, b.etag);
        this.sql("UPDATE uploads SET status='committed' WHERE id=?", row.id);
        return this.send({ id: row.id, key: row.object_key, size: row.size, status: "committed" });
      }
      if (path === "/abort/start" && request.method === "POST") {
        const b = await request.json() as { id: string; capabilityHash: string }, row = this.upload(String(b.id));
        if (!this.validSecret(row, b.capabilityHash) || row!.status === "committed") return this.fail("Envio não pode ser cancelado.", 409);
        if (this.sql("SELECT part_number FROM part_locks WHERE upload_id=? LIMIT 1", row!.id).length) return this.fail("Um bloco ainda está sendo processado. Tente cancelar novamente em instantes.", 409);
        this.sql("UPDATE uploads SET status='aborting' WHERE id=?", row!.id);
        return this.send({ ok: true });
      }
      if (path === "/abort/confirm" && request.method === "POST") {
        const b = await request.json() as { id: string; confirmed: boolean; capabilityHash: string }, row = this.upload(String(b.id));
        if (!this.validSecret(row, b.capabilityHash) || row!.status !== "aborting" || b.confirmed !== true) return this.fail("Cancelamento não confirmado.", 409);
        this.sql("DELETE FROM parts WHERE upload_id=?", row!.id);
        this.sql("DELETE FROM part_locks WHERE upload_id=?", row!.id);
        this.sql("DELETE FROM uploads WHERE id=?", row!.id);
        this.sql("DELETE FROM objects WHERE key=? AND published=0", row!.object_key);
        return this.send({ ok: true });
      }
      if (path === "/storage" && request.method === "GET") return this.storage();
      if (path === "/published" && request.method === "GET") {
        const row = this.sql("SELECT size,published FROM objects WHERE key=?", String(url.searchParams.get("key")))[0];
        return this.send({ published: row?.published === 1, size: row?.size ?? null });
      }
      if (path === "/delete" && request.method === "POST") {
        const b = await request.json() as { key: string }, row = this.sql("SELECT key FROM objects WHERE key=?", b.key)[0];
        this.sql("DELETE FROM objects WHERE key=?", b.key);
        const pending = this.sql("SELECT id FROM uploads WHERE object_key=? AND status='completed'", b.key);
        for (const upload of pending) {
          this.sql("DELETE FROM parts WHERE upload_id=?", upload.id);
          this.sql("DELETE FROM uploads WHERE id=?", upload.id);
        }
        return this.send({ removed: true });
      }
      if (path === "/expire/confirm" && request.method === "POST") {
        const b = await request.json() as { id: string }, row = this.upload(String(b.id));
        if (!row || row.status === "committed" || Number(row.expires_at) > Date.now()) return this.fail("A reserva não pode expirar ainda.", 409);
        this.sql("DELETE FROM parts WHERE upload_id=?", row.id);
        this.sql("DELETE FROM part_locks WHERE upload_id=?", row.id);
        this.sql("DELETE FROM uploads WHERE id=?", row.id);
        this.sql("DELETE FROM objects WHERE key=? AND published=0", row.object_key);
        return this.send({ ok: true });
      }
      if (path === "/alarm/expired" && request.method === "GET") {
        return this.send(this.sql("SELECT id,object_key,size,status,upload_id FROM uploads WHERE status IN ('reserved','creating','completing','completed','aborting') AND expires_at<=?", Date.now()));
      }
      return this.fail("Operação interna inexistente.", 404);
    } catch {
      return this.fail("Falha segura no ledger de armazenamento.", 503);
    }
  }
  private storage() {
    if (!this.initialized()) return this.send({ ready: false, usedBytes: null, reservedBytes: null, availableBytes: null, maxBytes: MAX_R2_STORAGE_BYTES }, 503);
    const occupied = Number(this.sql("SELECT COALESCE(SUM(size),0) AS bytes FROM objects")[0]?.bytes ?? 0);
    const reserved = Number(this.sql("SELECT COALESCE(SUM(size),0) AS bytes FROM uploads WHERE status IN ('reserved','creating','completing','completed','aborting')")[0]?.bytes ?? 0);
    const counts = this.sql("SELECT COUNT(*) AS total, SUM(CASE WHEN published=0 THEN 1 ELSE 0 END) AS pending FROM objects")[0];
    const ready = Number.isSafeInteger(occupied) && Number.isSafeInteger(reserved) && occupied + reserved <= MAX_R2_STORAGE_BYTES;
    return this.send({ ready, usedBytes: occupied, reservedBytes: reserved, availableBytes: Math.max(0, MAX_R2_STORAGE_BYTES - occupied - reserved), maxBytes: MAX_R2_STORAGE_BYTES, objectCount: counts?.total ?? 0, unpublishedOrOrphanCount: counts?.pending ?? 0 }, ready ? 200 : 503);
  }
  async alarm() {
    const response = await this.fetch(new Request("https://mind-storage.internal/alarm/expired", { method: "GET" }));
    const expired = await response.json() as Array<{ id: string; object_key: string; status: string; upload_id: string | null }>;
    let uncertain = false;
    for (const row of expired) {
      try {
        const hadObject = !!(await this.env.MIND_VIDEOS.head(row.object_key));
        let abortConfirmed = !row.upload_id;
        if (row.upload_id) {
          try { await this.env.MIND_VIDEOS.resumeMultipartUpload(row.object_key, row.upload_id).abort(); abortConfirmed = true; }
          catch { abortConfirmed = hadObject; }
        }
        if (hadObject) await this.env.MIND_VIDEOS.delete(row.object_key);
        if (await this.env.MIND_VIDEOS.head(row.object_key)) continue;
        if (!abortConfirmed) { uncertain = true; continue; }
        await this.fetch(new Request("https://mind-storage.internal/expire/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id }) }));
      } catch { /* Reservation remains, so new uploads fail closed. */ }
    }
    const next = this.sql("SELECT MIN(expires_at) AS at FROM uploads WHERE status IN ('reserved','creating','completing','completed','aborting')")[0]?.at;
    if (typeof next === "number") await this.state.storage.setAlarm(uncertain || next <= Date.now() ? Date.now() + 60 * 60 * 1000 : next);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      const origin = request.headers.get("origin") ?? "";
      if (!configuredOrigins(env).has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: {
        ...Object.fromEntries(corsHeaders(request, env)),
        "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key, X-Upload-Capability",
        "Access-Control-Max-Age": "600",
      } });
    }
    try {
      let response: Response;
      if (url.pathname.startsWith("/admin/")) response = await adminRoute(request, env, url);
      else if ((request.method === "GET" || request.method === "HEAD") && url.pathname.startsWith("/media/")) {
        const key = url.pathname.slice("/media/".length).split("/").map(segment => decodeURIComponent(segment)).join("/");
        response = await publicMedia(request, env, key);
      } else if (url.pathname === "/health" && request.method === "GET") response = json({ ok: true, service: "2t-mind-r2" });
      else response = bad("Rota não encontrada.", 404);
      return withCors(response, request, env);
    } catch (error) {
      const status = Number((error as { status?: number })?.status);
      return withCors(bad(error instanceof Error ? error.message : "Falha na solicitação.", status >= 400 && status <= 599 ? status : 500), request, env);
    }
  },
};
