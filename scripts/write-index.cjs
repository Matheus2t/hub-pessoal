/* Keep Mente's CSP limited to the configured Supabase project's exact origin. */
const { readFileSync, writeFileSync } = require("node:fs");

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
  const enabled = /^(true|1|yes)$/i.test(env.MIND_CLOUD_ENABLED ?? "") &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) &&
    key.startsWith("sb_publishable_");
  if (!enabled) return html;
  const projectHost = new URL(url).hostname;
  const storageOrigin = "https://" + projectHost.replace(/\.supabase\.co$/, ".storage.supabase.co");
  let output = addCspSource(addCspSource(addCspSource(addCspSource(html, "connect-src", url), "connect-src", storageOrigin), "frame-src", url), "media-src", url);
  const r2Worker = (env.MIND_R2_WORKER_URL ?? "").trim().replace(/\/$/, "");
  if (/^(true|1|yes)$/i.test(env.MIND_R2_ENABLED ?? "")) {
    let r2Origin = "";
    try {
      const parsed = new URL(r2Worker);
      if (parsed.protocol === "https:" && parsed.origin === r2Worker && parsed.pathname === "/") r2Origin = parsed.origin;
    } catch { /* Invalid R2 configuration fails closed and does not widen CSP. */ }
    if (r2Origin) {
      output = addCspSource(addCspSource(output, "connect-src", r2Origin), "media-src", r2Origin);
    }
  }
  return output;
}

function writeIndex() {
  const html = readFileSync("frontend/index.html", "utf8");
  writeFileSync("dist/index.html", buildIndexContent(html));
}

if (require.main === module) writeIndex();

module.exports = { addCspSource, buildIndexContent, writeIndex };
