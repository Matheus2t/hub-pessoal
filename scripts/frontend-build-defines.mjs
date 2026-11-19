const isEnabled = (name) => /^(1|true|yes)$/i.test(process.env[name] ?? "");

export function frontendBuildDefines({ publicBuild = false, devServer = false } = {}) {
  const localPreview = !publicBuild;
  const publicLinkResolver = publicBuild && isEnabled("LINK_RESOLVER_PUBLIC_UI_ENABLED");
  const apiBase = publicBuild
    ? ""
    : process.env.TWO_T_API_BASE_URL || (devServer ? "http://localhost:8000" : "");

  return {
    "globalThis.__2T_API_BASE_URL__": JSON.stringify(apiBase),
    "globalThis.__2T_UTILITIES_ENABLED__": JSON.stringify((localPreview && isEnabled("UTILITIES_ENABLED")) || publicLinkResolver),
    "globalThis.__2T_LINK_RESOLVER_ENABLED__": JSON.stringify((localPreview && isEnabled("LINK_RESOLVER_ENABLED")) || publicLinkResolver),
    "globalThis.__2T_BACKGROUND_REMOVER_ENABLED__": JSON.stringify(localPreview && isEnabled("BACKGROUND_REMOVER_ENABLED")),
    "globalThis.__2T_LINK_RESOLVER_PUBLIC_UI_ENABLED__": JSON.stringify(publicLinkResolver),
  };
}
