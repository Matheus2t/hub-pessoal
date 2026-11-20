/** 2T Mente: Supabase GoTrue session. No service-role key or password is stored. */
declare global {
  var __2T_MIND_SUPABASE_URL__: string | undefined;
  var __2T_MIND_SUPABASE_KEY__: string | undefined;
  var __2T_MIND_CLOUD_ENABLED__: boolean | undefined;
  var __2T_MIND_LOCAL_MODE_ENABLED__: boolean | undefined;
  var __2T_MIND_GOOGLE_DRIVE_ENABLED__: boolean | undefined;
  var __2T_API_BASE_URL__: string | undefined;
}

interface CloudSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id: string;
}

const SESSION_KEY = "2t-mind-supabase-session-v1";
export function mindCloudEnabled(): boolean {
  return globalThis.__2T_MIND_CLOUD_ENABLED__ === true;
}
/** Public production builds without cloud must not masquerade local drafts as a shared library. */
export function mindLocalModeEnabled(): boolean {
  return globalThis.__2T_MIND_LOCAL_MODE_ENABLED__ === true;
}
export function mindGoogleDriveEnabled(): boolean {
  return mindCloudEnabled() && globalThis.__2T_MIND_GOOGLE_DRIVE_ENABLED__ === true;
}
function config() {
  const rawUrl = globalThis.__2T_MIND_SUPABASE_URL__ ?? "";
  const key = globalThis.__2T_MIND_SUPABASE_KEY__ ?? "";
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) ||
      !key.startsWith("sb_publishable_")) {
    throw new Error("A configuração administrativa da Mente não está disponível.");
  }
  return { url: url.origin, key };
}
function readSession(): CloudSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CloudSession>;
    if (typeof parsed.access_token !== "string" || typeof parsed.refresh_token !== "string" ||
        typeof parsed.user_id !== "string" || typeof parsed.expires_at !== "number") return null;
    return parsed as CloudSession;
  } catch { return null; }
}
function storeSession(value: CloudSession | null) {
  if (value) sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
  else sessionStorage.removeItem(SESSION_KEY);
}
function fromTokenResponse(value: unknown): CloudSession {
  const v = value as Record<string, unknown> | null;
  const user = v && typeof v.user === "object" ? v.user as Record<string, unknown> : null;
  if (!v || typeof v.access_token !== "string" || typeof v.refresh_token !== "string" ||
      typeof v.expires_in !== "number" || !user || typeof user.id !== "string") {
    throw new Error("Resposta de autenticação inválida.");
  }
  return {
    access_token: v.access_token, refresh_token: v.refresh_token,
    expires_at: Date.now() + Math.max(0, v.expires_in - 30) * 1000,
    user_id: user.id,
  };
}
async function authRequest(path: string, init: RequestInit) {
  const { url, key } = config();
  return fetch(url + path, {
    cache: "no-store", referrerPolicy: "no-referrer",
    ...init,
    headers: { apikey: key, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}
async function refresh(session: CloudSession): Promise<CloudSession> {
  const response = await authRequest("/auth/v1/token?grant_type=refresh_token", {
    method: "POST", body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!response.ok) {
    storeSession(null);
    throw new Error("Sua sessão expirou. Faça login novamente.");
  }
  const fresh = fromTokenResponse(await response.json());
  storeSession(fresh);
  return fresh;
}
async function tokenSession(): Promise<CloudSession> {
  const old = readSession();
  if (!old) throw new Error("É necessário entrar na sua conta.");
  return Date.now() >= old.expires_at ? refresh(old) : old;
}
/** TUS must use the project's direct Storage hostname, not the API gateway. */
export function mindTusEndpoint(): string {
  const { url } = config();
  const host = new URL(url).hostname;
  const projectRef = host.slice(0, -".supabase.co".length);
  return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`;
}
/** Called for every TUS request so resumed uploads use the latest short-lived token. */
export async function mindStorageHeaders(forceRefresh = false): Promise<Record<string, string>> {
  let session: CloudSession;
  if (forceRefresh) {
    const current = readSession();
    if (!current) throw new Error("É necessário entrar na sua conta.");
    session = await refresh(current);
  } else session = await tokenSession();
  const { key } = config();
  return { apikey: key, Authorization: "Bearer " + session.access_token };
}
/** Every request is authorized independently by Supabase RLS and Storage policies. */
export async function mindApi(path: string, init: RequestInit = {}): Promise<Response> {
  const session = await tokenSession();
  const { url, key } = config();
  return fetch(url + path, {
    cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
    ...init,
    headers: { apikey: key, Authorization: "Bearer " + session.access_token, ...(init.headers ?? {}) },
  });
}
/** Public catalog requests never carry an administrator session or token. */
export async function mindPublicApi(path: string): Promise<Response> {
  const { url, key } = config();
  return fetch(url + path, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", headers: { apikey: key, Accept: "application/json" } });
}

/** Admin-only FastAPI request; Google and Supabase secrets are never sent by this client. */
export async function mindBackendApi(path: string, init: RequestInit = {}): Promise<Response> {
  if (!path.startsWith("/api/mind-drive/") || path.includes("..")) throw new Error("Rota administrativa inválida.");
  const session = await tokenSession();
  const rawBase = globalThis.__2T_API_BASE_URL__ ?? "";
  const base = new URL(rawBase || location.origin, location.origin);
  const localDevApi = location.hostname === "localhost" && base.hostname === "localhost" && base.protocol === "http:";
  if (base.origin !== location.origin && !localDevApi) throw new Error("A API administrativa não está na origem esperada.");
  return fetch(base.origin + path, {
    cache: "no-store", credentials: "include", referrerPolicy: "no-referrer", ...init,
    headers: { Authorization: "Bearer " + session.access_token, ...(init.headers ?? {}) },
  });
}

export function publicMindPdfUrl(storagePath: string): string {
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}(?:-[0-9a-f-]{36})?\.pdf$/i.test(storagePath)) throw new Error("Caminho de PDF inválido.");
  const { url } = config();
  return url + "/storage/v1/object/public/mind-pdfs/" + storagePath;
}

export function publicMindVideoUrl(storagePath: string): string {
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}(?:-[0-9a-f-]{36})?\.mp4$/i.test(storagePath)) throw new Error("Caminho de vídeo inválido.");
  const { url } = config();
  return url + "/storage/v1/object/public/mind-videos/" + storagePath;
}
export function publicMindDrivePreviewUrl(fileId: string): string {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) throw new Error("Identificador de vídeo inválido.");
  return "https://drive.google.com/file/d/" + fileId + "/preview";
}
export function publicMindDriveViewUrl(fileId: string): string {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) throw new Error("Identificador de vídeo inválido.");
  return "https://drive.google.com/file/d/" + fileId + "/view";
}

export function safeMindPdfFileName(value: string): string {
  const name = value.normalize("NFC").replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 180);
  return name || "documento.pdf";
}

async function validateAdmin(session: CloudSession): Promise<boolean> {
  const [identity, admin] = await Promise.all([
    mindApi("/auth/v1/user"),
    mindApi("/rest/v1/rpc/mind_is_admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
  ]);
  if (!identity.ok || !admin.ok) return false;
  const user = await identity.json() as { id?: string };
  return user.id === session.user_id && (await admin.json()) === true;
}
export async function restoreMindSession(): Promise<boolean> {
  if (!mindCloudEnabled() || !readSession()) return false;
  try { return await validateAdmin(await tokenSession()); }
  catch { return false; }
}
export async function signInMind(email: string, password: string): Promise<void> {
  if (!mindCloudEnabled()) throw new Error("Login administrativo indisponível.");
  const response = await authRequest("/auth/v1/token?grant_type=password", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error("Não foi possível entrar. Confira suas credenciais.");
  const session = fromTokenResponse(await response.json());
  storeSession(session);
  const allowed = await validateAdmin(session);
  if (!allowed) {
    await signOutMind();
    throw new Error("Esta conta não possui permissão de administrador da 2T.");
  }
}
export async function signOutMind(): Promise<void> {
  const session = readSession();
  storeSession(null);
  if (!session) return;
  try {
    await authRequest("/auth/v1/logout", {
      method: "POST", headers: { Authorization: "Bearer " + session.access_token },
    });
  } catch { /* Local logout must always complete, including offline. */ }
}
export function clearMindSession(): void { storeSession(null); }
