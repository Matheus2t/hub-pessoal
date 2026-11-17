export interface UtilityCapabilities {
  utilities_enabled: boolean;
  link_resolver_enabled: boolean;
  background_remover_enabled: boolean;
}

export type CapabilitiesResult =
  | { state: "enabled"; capabilities: UtilityCapabilities }
  | { state: "disabled" }
  | { state: "unavailable" };

export type LinkResolveStatus =
  | "resolved"
  | "invalid_url"
  | "blocked_url"
  | "timeout"
  | "redirect_loop"
  | "unresolved"
  | "service_unavailable";

export interface LinkResolveRequest {
  url: string;
}

export interface RedirectHop {
  url: string;
  status_code: number;
}

export interface LinkSecurity {
  https: boolean;
  warnings: string[];
  reputation_checked: boolean;
}

export interface LinkResolveResponse {
  status: LinkResolveStatus;
  original_url: string;
  final_url: string | null;
  redirect_count: number;
  redirects: RedirectHop[];
  security: LinkSecurity;
}

export type BackgroundJobState =
  | "created"
  | "uploaded"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "expired"
  | "cancelled";

export interface CreateBackgroundJobRequest {
  file_name: string;
  content_type: string;
  size_bytes: number;
}

export interface CreateBackgroundJobResponse {
  job_id: string;
  status: "created";
  expires_at: string;
}

export interface TemporaryUploadRequest {
  job_id: string;
}

export interface TemporaryUploadResponse {
  job_id: string;
  upload_url: string;
  expires_at: string;
  method: "PUT";
  required_headers: Record<string, string>;
}

export interface ConfirmUploadRequest {
  job_id: string;
  sha256: string;
}

export interface ConfirmUploadResponse {
  job_id: string;
  status: "uploaded";
}

export interface StartBackgroundJobRequest {
  job_id: string;
}

export interface StartBackgroundJobResponse {
  job_id: string;
  status: "queued";
}

export interface BackgroundJobStatusResponse {
  job_id: string;
  status: BackgroundJobState;
  progress_percent: number | null;
  failure_code: string | null;
}

export interface BackgroundJobDownloadResponse {
  job_id: string;
  download_url: string;
  expires_at: string;
  file_name: string;
  content_type: string;
}

export interface CancelBackgroundJobResponse {
  job_id: string;
  status: "cancelled";
}

export interface DeleteBackgroundJobResponse {
  job_id: string;
  deleted: boolean;
}
