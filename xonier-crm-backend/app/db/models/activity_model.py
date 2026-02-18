from beanie import Document, Link
from pydantic import Field
from beanie import PydanticObjectId
from datetime import datetime, timezone
from typing import Optional, Dict
from app.core.enums import ACTIVITY_ENTITY_TYPE, ACTIVITY_ACTION
from pymongo import IndexModel
from app.db.models.user_model import UserModel


class ActivityModel(Document):
    userId: Link[UserModel]
    entityType: ACTIVITY_ENTITY_TYPE
    entityId: Optional[PydanticObjectId] = None

    perform: int = 1

    action: ACTIVITY_ACTION
    title: str                   
    description: Optional[str] = None

    metadata: Optional[Dict] = None

    createdAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "activities"
        indexes = [
            IndexModel([("userId", 1)], name="userId"),
            IndexModel([("entityType",1)], name="entityType"),
            IndexModel([("createdAt", -1)], name="createdAt")
        ]
