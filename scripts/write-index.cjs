/* Keep connect-src restricted to this Supabase project's exact hostname. */
const { readFileSync, writeFileSync } = require("node:fs");
const html = readFileSync("frontend/index.html", "utf8");
const url = (process.env.MIND_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const key = (process.env.MIND_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
const enabled = /^(true|1|yes)$/i.test(process.env.MIND_CLOUD_ENABLED ?? "") &&
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) &&
  key.startsWith("sb_publishable_");
const output = enabled
  ? html.replace(/(connect-src [^;]*)(;)/, (_whole, directive, semicolon) => directive + " " + url + semicolon)
  : html;
writeFileSync("dist/index.html", output);
