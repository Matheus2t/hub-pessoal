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
  return addCspSource(addCspSource(addCspSource(html, "connect-src", url), "frame-src", url), "media-src", url);
}

function writeIndex() {
  const html = readFileSync("frontend/index.html", "utf8");
  writeFileSync("dist/index.html", buildIndexContent(html));
}

if (require.main === module) writeIndex();

module.exports = { addCspSource, buildIndexContent, writeIndex };
