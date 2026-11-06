"""Call v1 wire protocol. Credentials travel in the first frame, never in URLs."""
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, SecretStr, TypeAdapter, field_validator, model_validator


class Message(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    @field_validator("name", check_fields=False)
    @classmethod
    def clean_name(cls, value):
        if not value.strip():
            raise ValueError("A name is required")
        return value.strip()


Name = Annotated[str, Field(min_length=1, max_length=40, pattern=r"^[^\x00-\x1f\x7f]+$")]
Identifier = Annotated[str, Field(pattern=r"^[a-f0-9]{32}$")]
DeviceToken = Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{43}$")]
ChannelPassword = Annotated[SecretStr, Field(min_length=1, max_length=128)]


class Create(Message):
    type: Literal["create"]
    name: Name
    admin: SecretStr | None = None  # Older clients may still send it; private rooms are owner-key-free.


class Join(Message):
    type: Literal["join"]
    name: Name
    room: Identifier
    invite: SecretStr


class Resume(Message):
    type: Literal["resume"]
    room: Identifier
    participant: Identifier
    credential: SecretStr


class ChannelInfo(Message):
    type: Literal["channel_info"]
    room: Identifier


class ChannelJoin(Message):
    type: Literal["channel_join"]
    room: Identifier
    name: Name
    device: DeviceToken
    password: ChannelPassword | None = None
    reentry: Annotated[str, Field(pattern=r"^[1-9][0-9]{0,11}\.[a-f0-9]{64}$")] | None = Field(default=None, repr=False)

    @model_validator(mode="after")
    def one_proof(self):
        if self.password is not None and self.reentry is not None:
            raise ValueError("Provide only one access proof")
        return self


class ChannelAdmin(Message):
    type: Literal["channel_admin"]
    admin: SecretStr
    action: Literal["status", "create", "rename", "rotate", "kick", "block", "unblock", "password"]
    name: Name | None = None
    target: Identifier | Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")] | None = None
    password: ChannelPassword | None = None

    @model_validator(mode="after")
    def valid_action(self):
        needs_name = self.action in ("create", "rename")
        needs_target = self.action in ("kick", "block", "unblock")
        if needs_name != (self.name is not None) or needs_target != (self.target is not None):
            raise ValueError("Invalid channel action fields")
        if self.target and len(self.target) != (64 if self.action == "unblock" else 32):
            raise ValueError("Invalid channel action target")
        if self.action == "password" and self.password is None:
            raise ValueError("A new password is required")
        if self.password is not None and self.action not in ("create", "password"):
            raise ValueError("Invalid password field")
        return self


class Simple(Message):
    type: Literal["ping", "leave", "close", "rtc_config"]


class MediaState(Message):
    type: Literal["media"]
    active: bool
    microphone: bool
    camera: bool = False


class ScreenControl(Message):
    type: Literal["screen"]
    action: Literal["claim", "start", "release"]
    request: Identifier
    generation: Annotated[int, Field(ge=1)] | None = None
    audio: bool = False
    parallel: bool = False

    @model_validator(mode="after")
    def valid_control(self):
        if self.action == "start" and self.generation is None:
            raise ValueError("A granted generation is required")
        if self.action == "claim" and self.generation is not None:
            raise ValueError("The server assigns the generation")
        if self.action != "start" and self.audio:
            raise ValueError("Audio state belongs to an active screen")
        if self.action != "claim" and self.parallel:
            raise ValueError("Parallel support is declared when claiming a screen")
        return self


Mid = Annotated[str, Field(pattern=r"^[a-zA-Z0-9_-]{1,32}$")]


class MediaRoles(Message):
    microphone: Mid
    screenAudio: Mid
    screenVideo: Mid
    camera: Mid

    @model_validator(mode="after")
    def unique_mids(self):
        if len(set(self.model_dump().values())) != 4:
            raise ValueError("Each media role needs its own MID")
        return self


class EpochSignal(Message):
    target: Identifier
    epoch: Annotated[int, Field(ge=1)]
    targetEpoch: Annotated[int, Field(ge=1)]


class Admission(Message):
    type: Literal["admit", "reject"]
    target: Identifier


class Ice(Message):
    candidate: Annotated[str, Field(max_length=2048)]
    sdpMid: Annotated[str, Field(max_length=256)] | None = None
    sdpMLineIndex: Annotated[int, Field(ge=0, le=255)] | None = None
    usernameFragment: Annotated[str, Field(max_length=256)] | None = None


class SdpSignal(EpochSignal):
    type: Literal["offer", "answer"]
    sdp: Annotated[str, Field(min_length=1, max_length=24576)]
    roles: MediaRoles


class IceSignal(EpochSignal):
    type: Literal["ice"]
    candidate: Ice | None


Handshake = TypeAdapter(Annotated[Create | Join | Resume | ChannelInfo | ChannelJoin | ChannelAdmin, Field(discriminator="type")])
Action = TypeAdapter(Annotated[Simple | MediaState | ScreenControl | Admission | SdpSignal | IceSignal, Field(discriminator="type")])
