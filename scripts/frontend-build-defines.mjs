const isEnabled = (name) => /^(1|true|yes)$/i.test(process.env[name] ?? "");

export function frontendBuildDefines({ publicBuild = false, devServer = false } = {}) {
  const localPreview = !publicBuild;
  const publicLinkResolver = publicBuild && isEnabled("LINK_RESOLVER_PUBLIC_UI_ENABLED");
  const supabaseUrl = (process.env.MIND_SUPABASE_URL ?? "").trim();
  const supabaseKey = (process.env.MIND_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  const mindCloud = isEnabled("MIND_CLOUD_ENABLED") &&
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(supabaseUrl) &&
    supabaseKey.startsWith("sb_publishable_");
  const mindGoogleDrive = mindCloud && isEnabled("MIND_GOOGLE_DRIVE_ENABLED");
  const apiBase = publicBuild
    ? ""
    : process.env.TWO_T_API_BASE_URL || (devServer ? "http://localhost:8000" : "");

  return {
    "globalThis.__2T_MIND_CLOUD_ENABLED__": JSON.stringify(mindCloud),
    "globalThis.__2T_MIND_GOOGLE_DRIVE_ENABLED__": JSON.stringify(mindGoogleDrive),
    "globalThis.__2T_MIND_LOCAL_MODE_ENABLED__": JSON.stringify(!publicBuild),
    "globalThis.__2T_MIND_SUPABASE_URL__": JSON.stringify(mindCloud ? supabaseUrl.replace(/\/$/, "") : ""),
    "globalThis.__2T_MIND_SUPABASE_KEY__": JSON.stringify(mindCloud ? supabaseKey : ""),
    "globalThis.__2T_API_BASE_URL__": JSON.stringify(apiBase),
    "globalThis.__2T_UTILITIES_ENABLED__": JSON.stringify((localPreview && isEnabled("UTILITIES_ENABLED")) || publicLinkResolver),
    "globalThis.__2T_LINK_RESOLVER_ENABLED__": JSON.stringify((localPreview && isEnabled("LINK_RESOLVER_ENABLED")) || publicLinkResolver),
    "globalThis.__2T_BACKGROUND_REMOVER_ENABLED__": JSON.stringify(localPreview && isEnabled("BACKGROUND_REMOVER_ENABLED")),
    "globalThis.__2T_LINK_RESOLVER_PUBLIC_UI_ENABLED__": JSON.stringify(publicLinkResolver),
  };
}
