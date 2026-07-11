from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.core.notification_enum import (
    NOTIFICATION_TYPE,
    NOTIFICATION_ENTITY_TYPE,
    NOTIFICATION_STATUS,
    NOTIFICATION_PRIORITY,
)
from beanie import PydanticObjectId


class CreateNotificationSchema(BaseModel):
    recipientId: str
    senderId: Optional[str] = None
    type: NOTIFICATION_TYPE
    entityType: NOTIFICATION_ENTITY_TYPE
    entityId: Optional[str] = None
    title: str
    body: str
    priority: Optional[NOTIFICATION_PRIORITY] = NOTIFICATION_PRIORITY.LOW
    metadata: Optional[Dict[str, Any]] = None


class CreateBulkNotificationSchema(BaseModel):
    recipientIds: List[str] = Field(..., min_length=1)
    senderId: Optional[str] = None
    type: NOTIFICATION_TYPE
    entityType: NOTIFICATION_ENTITY_TYPE
    entityId: Optional[str] = None
    title: str
    body: str
    priority: Optional[NOTIFICATION_PRIORITY] = NOTIFICATION_PRIORITY.LOW
    metadata: Optional[Dict[str, Any]] = None


class MarkAsReadSchema(BaseModel):
    notificationIds: List[str] = Field(..., min_length=1)


class NotificationFilterSchema(BaseModel):
    status: Optional[NOTIFICATION_STATUS] = None
    type: Optional[NOTIFICATION_TYPE] = None
    entityType: Optional[NOTIFICATION_ENTITY_TYPE] = None
    isRead: Optional[bool] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)