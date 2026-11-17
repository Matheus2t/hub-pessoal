import { apiUrl } from "../config";
import type { CapabilitiesResult, UtilityCapabilities } from "./types";

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
