import { readFileSync } from "node:fs";

const FRONTEND_ENV = {
  MIND_CLOUD_ENABLED: "true",
  MIND_LOCAL_SUPABASE_ENABLED: "true",
  MIND_SUPABASE_URL: "http://127.0.0.1:54321",
  TWO_T_API_BASE_URL: "http://localhost:8000",
  MIND_GOOGLE_DRIVE_ENABLED: "true",
};

const BACKEND_KEYS = new Set([
  "MIND_GOOGLE_DRIVE_ENABLED",
  "MIND_SUPABASE_URL",
  "MIND_SUPABASE_PUBLISHABLE_KEY",
  "MIND_SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_DRIVE_CLIENT_ID",
  "GOOGLE_DRIVE_CLIENT_SECRET",
  "GOOGLE_DRIVE_REDIRECT_URI",
  "MIND_GOOGLE_TOKEN_ENCRYPTION_KEY",
  "MIND_GOOGLE_DRIVE_ALLOWED_ORIGINS",
  "API_CORS_ORIGINS",
]);

function enabled(value) {
  return /^(1|true|yes)$/i.test(value ?? "");
}

function decodeRole(key) {
  try {
    return JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")).role;
  } catch {
    return null;
  }
}

export function parseBackendEnv(text) {
  const values = {};
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || !BACKEND_KEYS.has(match[1])) continue;
    let value = match[2].trim();
    const quote = value[0];
    if (quote === "'" || quote === '"') {
      const end = value.lastIndexOf(quote);
      const trailing = end <= 0 ? "" : value.slice(end + 1).trim();
      if (end <= 0 || (trailing && !trailing.startsWith("#"))) continue;
      value = value.slice(1, end);
      if (quote === '"') value = value.replace(/\\([\\"nrt])/g, (_all, escaped) => ({ "\\": "\\", '"': '"', n: "\n", r: "\r", t: "\t" })[escaped]);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    values[match[1]] = value;
  }
  return values;
}

/** Returns frontend-safe loopback settings only; server credentials never leave this function. */
export function localMindFrontendEnv({ backendEnv = {}, processEnv = {} } = {}) {
  if (enabled(processEnv.VERCEL)) return null;
  for (const name of ["MIND_CLOUD_ENABLED", "MIND_LOCAL_SUPABASE_ENABLED", "MIND_GOOGLE_DRIVE_ENABLED"]) {
    if (processEnv[name] !== undefined && !enabled(processEnv[name])) return null;
  }

  const config = { ...backendEnv, ...processEnv };
  if (!enabled(config.MIND_GOOGLE_DRIVE_ENABLED)) return null;
  if (!new Set(["http://kong:8000", "http://127.0.0.1:54321"]).has((config.MIND_SUPABASE_URL ?? "").replace(/\/$/, ""))) return null;
  if (decodeRole(config.MIND_SUPABASE_PUBLISHABLE_KEY ?? "") !== "anon") return null;
  if (!config.MIND_SUPABASE_SERVICE_ROLE_KEY || !config.GOOGLE_DRIVE_CLIENT_ID ||
      !config.GOOGLE_DRIVE_CLIENT_SECRET || !config.MIND_GOOGLE_TOKEN_ENCRYPTION_KEY) return null;
  if (config.GOOGLE_DRIVE_REDIRECT_URI !== "http://localhost:8000/api/mind-drive/google/callback") return null;

  const requiredOrigins = ["http://localhost:3000"];
  for (const name of ["API_CORS_ORIGINS", "MIND_GOOGLE_DRIVE_ALLOWED_ORIGINS"]) {
    const origins = new Set((config[name] ?? "").split(",").map(origin => origin.trim().replace(/\/$/, "")));
    if (!requiredOrigins.every(origin => origins.has(origin))) return null;
  }
  if (processEnv.TWO_T_API_BASE_URL && processEnv.TWO_T_API_BASE_URL !== FRONTEND_ENV.TWO_T_API_BASE_URL) return null;
  if (processEnv.MIND_SUPABASE_URL && processEnv.MIND_SUPABASE_URL !== FRONTEND_ENV.MIND_SUPABASE_URL) return null;
  if (processEnv.MIND_SUPABASE_PUBLISHABLE_KEY && processEnv.MIND_SUPABASE_PUBLISHABLE_KEY !== config.MIND_SUPABASE_PUBLISHABLE_KEY) return null;

  return {
    ...FRONTEND_ENV,
    MIND_SUPABASE_PUBLISHABLE_KEY: config.MIND_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function loadLocalMindFrontendEnv({ envFile = "backend/.env", processEnv = process.env } = {}) {
  let text;
  try {
    text = readFileSync(envFile, "utf8");
  } catch {
    return null;
  }
  const frontendEnv = localMindFrontendEnv({ backendEnv: parseBackendEnv(text), processEnv });
  if (frontendEnv) Object.assign(processEnv, frontendEnv);
  return frontendEnv;
}
