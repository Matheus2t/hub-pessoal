export interface UtilityFeatureFlags {
  utilities: boolean;
  linkResolver: boolean;
  backgroundRemover: boolean;
}

export interface UtilityAccess extends UtilityFeatureFlags {
  loopback: boolean;
}

type RuntimeFlags = typeof globalThis & {
  __2T_UTILITIES_ENABLED__?: boolean;
  __2T_LINK_RESOLVER_ENABLED__?: boolean;
  __2T_BACKGROUND_REMOVER_ENABLED__?: boolean;
};

export function isLoopbackHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") return true;
  const octets = host.split(".").map(Number);
  return octets.length === 4 && octets[0] === 127 && octets.every(value => Number.isInteger(value) && value >= 0 && value <= 255);
}

export function resolveUtilityAccess(hostname: string, flags: UtilityFeatureFlags): UtilityAccess {
  const loopback = isLoopbackHostname(hostname);
  const utilities = loopback && flags.utilities;
  return {
    loopback,
    utilities,
    linkResolver: utilities && flags.linkResolver,
    backgroundRemover: utilities && flags.backgroundRemover,
  };
}

export function frontendUtilityAccess(hostname?: string): UtilityAccess {
  const currentHost = hostname ?? (typeof window === "undefined" ? "" : window.location.hostname);
  return resolveUtilityAccess(currentHost, {
    utilities: (globalThis as RuntimeFlags).__2T_UTILITIES_ENABLED__ === true,
    linkResolver: (globalThis as RuntimeFlags).__2T_LINK_RESOLVER_ENABLED__ === true,
    backgroundRemover: (globalThis as RuntimeFlags).__2T_BACKGROUND_REMOVER_ENABLED__ === true,
  });
}

export const utilitiesCatalogEnabled = () => frontendUtilityAccess().utilities;
export const linkResolverPreviewEnabled = () => frontendUtilityAccess().linkResolver;
export const backgroundRemoverPreviewEnabled = () => frontendUtilityAccess().backgroundRemover;
