"""Call v1 wire protocol. Credentials travel in the first frame, never in URLs."""
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, SecretStr, TypeAdapter, field_validator


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


class Create(Message):
    type: Literal["create"]
    name: Name
    admin: SecretStr


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


class Simple(Message):
    type: Literal["ping", "leave", "close", "rtc_config"]


class MediaState(Message):
    type: Literal["media"]
    active: bool
    microphone: bool


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


class IceSignal(EpochSignal):
    type: Literal["ice"]
    candidate: Ice | None


Handshake = TypeAdapter(Annotated[Create | Join | Resume, Field(discriminator="type")])
Action = TypeAdapter(Annotated[Simple | MediaState | Admission | SdpSignal | IceSignal, Field(discriminator="type")])
