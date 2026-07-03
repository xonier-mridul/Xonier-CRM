from beanie import Link, PydanticObjectId
from pydantic import Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from app.db.models.base_model import BaseDocument
from app.db.models.user_model import UserModel
from app.core.notification_enum import (
    NOTIFICATION_TYPE,
    NOTIFICATION_ENTITY_TYPE,
    NOTIFICATION_STATUS,
    NOTIFICATION_PRIORITY,
)
from pymongo import IndexModel


class NotificationModel(BaseDocument):
    recipientId: Link[UserModel]
    senderId: Optional[Link[UserModel]] = None

    type: NOTIFICATION_TYPE
    entityType: NOTIFICATION_ENTITY_TYPE
    entityId: Optional[PydanticObjectId] = None

    title: str
    body: str

    status: NOTIFICATION_STATUS = NOTIFICATION_STATUS.UNREAD
    priority: NOTIFICATION_PRIORITY = NOTIFICATION_PRIORITY.LOW

    metadata: Optional[Dict[str, Any]] = None

    isRead: bool = False
    readAt: Optional[datetime] = None

    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "notifications"
        indexes = [
            IndexModel([("recipientId", 1)], name="idx_recipient"),
            IndexModel([("recipientId", 1), ("status", 1)], name="idx_recipient_status"),
            IndexModel([("recipientId", 1), ("isRead", 1)], name="idx_recipient_read"),
            IndexModel([("entityType", 1), ("entityId", 1)], name="idx_entity"),
            IndexModel([("companyId", 1)], name="idx_company"),
            IndexModel([("createdAt", -1)], name="idx_created_desc"),
        ]