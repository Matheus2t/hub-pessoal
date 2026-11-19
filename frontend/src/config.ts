declare global {
  var __2T_API_BASE_URL__: string | undefined;
}

export const API_BASE_URL = globalThis.__2T_API_BASE_URL__ ?? "";
export const apiUrl = (path: string) => `${API_BASE_URL}${path}`;
