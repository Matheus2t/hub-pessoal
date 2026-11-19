from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field


class StrictContract(BaseModel):
    model_config = ConfigDict(extra="forbid")


class UtilityCapabilities(StrictContract):
    utilities_enabled: bool
    link_resolver_enabled: bool
    background_remover_enabled: bool


LinkResolveStatus = Literal[
    "resolved",
    "invalid_url",
    "blocked_url",
    "timeout",
    "redirect_loop",
    "redirect_limit",
    "tls_error",
    "unresolved",
    "service_unavailable",
]


class RedirectHop(StrictContract):
    url: str
    status_code: int = Field(ge=100, le=599)


class LinkSecurity(StrictContract):
    https: bool
    warnings: list[str] = Field(default_factory=list)
    reputation_checked: bool = False


class LinkResolveRequest(StrictContract):
    url: str = Field(min_length=1, max_length=2048)


class LinkResolveResponse(StrictContract):
    status: LinkResolveStatus
    original_url: str
    final_url: str | None = None
    final_status_code: int | None = Field(default=None, ge=100, le=599)
    redirect_count: int = Field(ge=0)
    redirects: list[RedirectHop] = Field(default_factory=list)
    security: LinkSecurity


BackgroundJobState = Literal[
    "created", "uploaded", "queued", "processing", "completed", "failed", "expired", "cancelled"
]


class CreateBackgroundJobRequest(StrictContract):
    file_name: str = Field(min_length=1, max_length=255)
    content_type: str = Field(min_length=1, max_length=128)
    size_bytes: int = Field(gt=0)


class CreateBackgroundJobResponse(StrictContract):
    job_id: str = Field(min_length=1)
    status: Literal["created"]
    expires_at: datetime


class TemporaryUploadRequest(StrictContract):
    job_id: str = Field(min_length=1)


class TemporaryUploadResponse(StrictContract):
    job_id: str = Field(min_length=1)
    upload_url: AnyHttpUrl
    expires_at: datetime
    method: Literal["PUT"]
    required_headers: dict[str, str] = Field(default_factory=dict)


class ConfirmUploadRequest(StrictContract):
    job_id: str = Field(min_length=1)
    sha256: str = Field(pattern=r"^[a-fA-F0-9]{64}$")


class ConfirmUploadResponse(StrictContract):
    job_id: str = Field(min_length=1)
    status: Literal["uploaded"]


class StartBackgroundJobRequest(StrictContract):
    job_id: str = Field(min_length=1)


class StartBackgroundJobResponse(StrictContract):
    job_id: str = Field(min_length=1)
    status: Literal["queued"]


class BackgroundJobStatusResponse(StrictContract):
    job_id: str = Field(min_length=1)
    status: BackgroundJobState
    progress_percent: int | None = Field(default=None, ge=0, le=100)
    failure_code: str | None = None


class BackgroundJobDownloadResponse(StrictContract):
    job_id: str = Field(min_length=1)
    download_url: AnyHttpUrl
    expires_at: datetime
    file_name: str = Field(min_length=1, max_length=255)
    content_type: str = Field(min_length=1, max_length=128)


class CancelBackgroundJobResponse(StrictContract):
    job_id: str = Field(min_length=1)
    status: Literal["cancelled"]


class DeleteBackgroundJobResponse(StrictContract):
    job_id: str = Field(min_length=1)
    deleted: bool
