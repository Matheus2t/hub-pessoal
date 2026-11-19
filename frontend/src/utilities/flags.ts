export interface UtilityFeatureFlags {
  utilities: boolean;
  linkResolver: boolean;
  backgroundRemover: boolean;
}

export interface UtilityAccess extends UtilityFeatureFlags {
  loopback: boolean;
}

declare global {
  var __2T_UTILITIES_ENABLED__: boolean | undefined;
  var __2T_LINK_RESOLVER_ENABLED__: boolean | undefined;
  var __2T_BACKGROUND_REMOVER_ENABLED__: boolean | undefined;
  var __2T_LINK_RESOLVER_PUBLIC_UI_ENABLED__: boolean | undefined;
}

export function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") return true;
  const octets = host.split(".").map(Number);
  return octets.length === 4 && octets[0] === 127 && octets.every(value => Number.isInteger(value) && value >= 0 && value <= 255);
}

export function resolveUtilityAccess(
  hostname: string,
  flags: UtilityFeatureFlags,
  publicLinkResolver = false,
): UtilityAccess {
  const loopback = isLoopbackHostname(hostname);
  const publicMode = !loopback && publicLinkResolver;
  const utilities = (loopback || publicMode) && flags.utilities;
  return {
    loopback,
    utilities,
    linkResolver: utilities && flags.linkResolver,
    backgroundRemover: loopback && utilities && flags.backgroundRemover,
  };
}

export function frontendUtilityAccess(hostname?: string): UtilityAccess {
  const currentHost = hostname ?? (typeof window === "undefined" ? "" : window.location.hostname);
  return resolveUtilityAccess(currentHost, {
    utilities: globalThis.__2T_UTILITIES_ENABLED__ === true,
    linkResolver: globalThis.__2T_LINK_RESOLVER_ENABLED__ === true,
    backgroundRemover: globalThis.__2T_BACKGROUND_REMOVER_ENABLED__ === true,
  }, globalThis.__2T_LINK_RESOLVER_PUBLIC_UI_ENABLED__ === true);
}

export const utilitiesCatalogEnabled = () => frontendUtilityAccess().utilities;
export const linkResolverPreviewEnabled = () => frontendUtilityAccess().linkResolver;
export const backgroundRemoverPreviewEnabled = () => frontendUtilityAccess().backgroundRemover;
