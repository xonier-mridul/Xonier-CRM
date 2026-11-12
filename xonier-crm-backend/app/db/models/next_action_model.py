from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import PydanticObjectId
from pydantic import Field
from pymongo import IndexModel

from app.db.models.base_model import BaseDocument


class NextActionModel(BaseDocument):
    entityType: Literal["lead", "deal"]
    entityId: PydanticObjectId
    kind: Literal["call", "email", "meeting", "task", "whatsapp", "other"]
    title: str
    dueAt: datetime
    ownerId: PydanticObjectId
    createdById: PydanticObjectId
    completedAt: Optional[datetime] = None
    remindedAt: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "next_actions"
        indexes = [
            IndexModel([("companyId", 1), ("entityType", 1), ("entityId", 1), ("dueAt", 1)]),
            IndexModel([("companyId", 1), ("ownerId", 1), ("completedAt", 1), ("dueAt", 1)]),
        ]
