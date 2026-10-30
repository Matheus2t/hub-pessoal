type RuntimeConfig = typeof globalThis & { __2T_API_BASE_URL__?: string };

const runtime = globalThis as RuntimeConfig;
export const API_BASE_URL = runtime.__2T_API_BASE_URL__ ?? '';
export const apiUrl = (path: string) => `${API_BASE_URL}${path}`;
