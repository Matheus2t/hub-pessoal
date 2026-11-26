/* Keep Mente's CSP limited to the configured Supabase project's exact origin. */
const { readFileSync, writeFileSync } = require("node:fs");

function hasAnonymousJwtRole(key) {
  try {
    const payload = key.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role === "anon";
  } catch {
    return false;
  }
}

function addCspSource(html, directiveName, source) {
  const pattern = new RegExp(`(${directiveName}\\s+[^;]*)(;)`);
  let found = false;
  const output = html.replace(pattern, (_whole, directive, semicolon) => {
    found = true;
    const sources = directive.trim().split(/\s+/);
    return sources.includes(source) ? directive + semicolon : directive + " " + source + semicolon;
  });
  if (!found) throw new Error(`CSP directive ${directiveName} is missing from frontend/index.html`);
  return output;
}

function buildIndexContent(html, env = process.env) {
  const url = (env.MIND_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
  const key = (env.MIND_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  const hosted = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && key.startsWith("sb_publishable_");
  const local = !/^(true|1|yes)$/i.test(env.VERCEL ?? "") &&
    /^(true|1|yes)$/i.test(env.MIND_LOCAL_SUPABASE_ENABLED ?? "") &&
    /^http:\/\/127\.0\.0\.1:54321$/.test(url) && hasAnonymousJwtRole(key);
  const enabled = /^(true|1|yes)$/i.test(env.MIND_CLOUD_ENABLED ?? "") && (hosted || local);
  if (!enabled) return html;
  if (local) {
    let output = addCspSource(addCspSource(html, "connect-src", url), "frame-src", url);
    if (/^(true|1|yes)$/i.test(env.MIND_GOOGLE_DRIVE_ENABLED ?? "")) {
      output = addCspSource(addCspSource(output, "connect-src", "https://www.googleapis.com"), "frame-src", "https://drive.google.com");
    }
    return output;
  }
  const projectHost = new URL(url).hostname;
  const storageOrigin = "https://" + projectHost.replace(/\.supabase\.co$/, ".storage.supabase.co");
  let output = addCspSource(addCspSource(addCspSource(addCspSource(html, "connect-src", url), "connect-src", storageOrigin), "frame-src", url), "media-src", url);
  if (/^(true|1|yes)$/i.test(env.MIND_GOOGLE_DRIVE_ENABLED ?? "")) {
    output = addCspSource(addCspSource(output, "connect-src", "https://www.googleapis.com"), "frame-src", "https://drive.google.com");
  }
  return output;
}

function writeIndex() {
  const html = readFileSync("frontend/index.html", "utf8");
  writeFileSync("dist/index.html", buildIndexContent(html));
}

if (require.main === module) writeIndex();

module.exports = { addCspSource, buildIndexContent, writeIndex };
