import { apiUrl } from "../config";
import type { CapabilitiesResult, LinkResolveResponse, LinkResolveStatus, UtilityCapabilities } from "./types";

function isCapabilities(value: unknown): value is UtilityCapabilities {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return ["utilities_enabled", "link_resolver_enabled", "background_remover_enabled"]
    .every(key => typeof candidate[key] === "boolean");
}

export async function loadUtilityCapabilities(signal?: AbortSignal): Promise<CapabilitiesResult> {
  try {
    const response = await fetch(apiUrl("/api/utilities/capabilities"), {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal,
    });
    if (response.status === 404) return { state: "disabled" };
    if (!response.ok) return { state: "unavailable" };
    const payload: unknown = await response.json();
    return isCapabilities(payload)
      ? { state: "enabled", capabilities: payload }
      : { state: "unavailable" };
  } catch {
    if (signal?.aborted) return { state: "unavailable" };
    return { state: "unavailable" };
  }
}

const linkResolveStatuses: readonly LinkResolveStatus[] = [
  "resolved",
  "invalid_url",
  "blocked_url",
  "timeout",
  "redirect_loop",
  "redirect_limit",
  "tls_error",
  "unresolved",
  "service_unavailable",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isHTTPCode(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 100 && Number(value) <= 599;
}

export function isLinkResolveResponse(value: unknown): value is LinkResolveResponse {
  if (!isRecord(value)) return false;
  const redirects = value.redirects;
  const security = value.security;
  if (
    !linkResolveStatuses.includes(value.status as LinkResolveStatus) ||
    typeof value.original_url !== "string" || value.original_url.length > 2048 ||
    !(value.final_url === null || (typeof value.final_url === "string" && value.final_url.length <= 2048)) ||
    !(value.final_status_code === null || isHTTPCode(value.final_status_code)) ||
    !Number.isInteger(value.redirect_count) || Number(value.redirect_count) < 0 || Number(value.redirect_count) > 8 ||
    !Array.isArray(redirects) || redirects.length > 8 || value.redirect_count !== redirects.length ||
    !isRecord(security) || typeof security.https !== "boolean" ||
    !Array.isArray(security.warnings) || !security.warnings.every(item => typeof item === "string" && item.length <= 500) ||
    typeof security.reputation_checked !== "boolean"
  ) return false;

  if (!redirects.every(item => isRecord(item) && typeof item.url === "string" && item.url.length > 0 && item.url.length <= 2048 && isHTTPCode(item.status_code))) {
    return false;
  }
  return value.status !== "resolved" || (typeof value.final_url === "string" && isHTTPCode(value.final_status_code));
}

export class UtilityApiError extends Error {
  constructor(readonly kind: "disabled" | "http" | "invalid_response", readonly status?: number) {
    super(kind);
    this.name = "UtilityApiError";
  }
}

export async function resolveUtilityLink(url: string, signal: AbortSignal): Promise<LinkResolveResponse> {
  const response = await fetch(apiUrl("/api/utilities/links/resolve"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ url }),
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal,
  });

  if (response.status === 404) throw new UtilityApiError("disabled", response.status);
  if (!response.ok) throw new UtilityApiError("http", response.status);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new UtilityApiError("invalid_response", response.status);
  }
  if (!isLinkResolveResponse(payload)) throw new UtilityApiError("invalid_response", response.status);
  return payload;
}
