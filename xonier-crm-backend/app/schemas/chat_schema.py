"""Public chat commands; company/sender/room IDs always come from the server."""
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Command(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ConversationCreate(Command):
    kind: Literal["dm", "group", "channel"]
    name: str = Field(default="", max_length=80)
    description: str = Field(default="", max_length=500)
    visibility: Literal["private", "public"] = "private"
    memberIds: list[str] = Field(default_factory=list, max_length=99)

    @model_validator(mode="after")
    def validate_kind(self):
        if self.kind != "channel" and self.visibility != "private":
            raise ValueError("Only channels can be public")
        if self.kind != "dm" and not self.name:
            raise ValueError("A group/channel name is required")
        return self


class MessageCreate(Command):
    clientId: UUID
    text: str = Field(default="", max_length=10000)
    attachmentIds: list[str] = Field(default_factory=list, max_length=5)
    parentId: str | None = None

    @model_validator(mode="after")
    def require_content(self):
        if not self.text and not self.attachmentIds:
            raise ValueError("Write a message or attach a file")
        return self


class MessageEdit(Command):
    text: str = Field(min_length=1, max_length=10000)
    version: int = Field(ge=1)


class ReadPosition(Command):
    seq: int = Field(ge=0)


class MemberAdd(Command):
    userIds: list[str] = Field(min_length=1, max_length=99)


class Reaction(Command):
    emoji: Literal["👍", "❤️", "😂", "🎉", "👀", "✅"]


class FileUpload(Command):
    name: str = Field(min_length=1, max_length=180)
    contentType: Literal[
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "application/pdf", "text/plain", "text/csv", "video/mp4", "audio/mpeg",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ]
    size: int = Field(gt=0)


class CallCreate(Command):
    kind: Literal["voice", "video"]
