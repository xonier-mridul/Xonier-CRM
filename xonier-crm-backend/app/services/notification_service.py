from typing import Dict, Any, List, Optional
from beanie import PydanticObjectId
from app.utils.custom_exception import AppException
from app.repositories.notification_repository import NotificationRepository
from app.core.notification_enum import (
    NOTIFICATION_TYPE,
    NOTIFICATION_ENTITY_TYPE,
    NOTIFICATION_PRIORITY,
)
from app.utils.notification_payload import build_notification_payload, build_bulk_notification_payloads
from app.db.db import Client


class NotificationService:
    def __init__(self):
        self.repo = NotificationRepository()
        self.client = Client

    async def send(
        self,
        recipient_id: PydanticObjectId,
        notification_type: NOTIFICATION_TYPE,
        entity_type: NOTIFICATION_ENTITY_TYPE,
        variables: Optional[Dict[str, Any]] = None,
        sender_id: Optional[PydanticObjectId] = None,
        entity_id: Optional[PydanticObjectId] = None,
        priority: Optional[NOTIFICATION_PRIORITY] = None,
        metadata: Optional[Dict[str, Any]] = None,
        session=None,
    ) -> Dict[str, Any]:
        try:
            payload = build_notification_payload(
                recipient_id=recipient_id,
                notification_type=notification_type,
                entity_type=entity_type,
                variables=variables,
                sender_id=sender_id,
                entity_id=entity_id,
                priority=priority,
                metadata=metadata,
            )
            notification = await self.repo.create(payload, session)
            return notification.model_dump(mode="json")

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Failed to send notification: {e}")

    async def send_bulk(
        self,
        recipient_ids: List[PydanticObjectId],
        notification_type: NOTIFICATION_TYPE,
        entity_type: NOTIFICATION_ENTITY_TYPE,
        variables: Optional[Dict[str, Any]] = None,
        sender_id: Optional[PydanticObjectId] = None,
        entity_id: Optional[PydanticObjectId] = None,
        priority: Optional[NOTIFICATION_PRIORITY] = None,
        metadata: Optional[Dict[str, Any]] = None,
        session=None,
    ) -> Dict[str, Any]:
        try:
            if not recipient_ids:
                raise AppException(422, "recipient_ids cannot be empty")

            payloads = build_bulk_notification_payloads(
                recipient_ids=recipient_ids,
                notification_type=notification_type,
                entity_type=entity_type,
                variables=variables,
                sender_id=sender_id,
                entity_id=entity_id,
                priority=priority,
                metadata=metadata,
            )

            inserted_ids = await self.repo.bulk_create(payloads, session)

            return {"sent": len(inserted_ids)}

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Failed to send bulk notifications: {e}")

    async def get_my_notifications(
        self,
        user: Dict[str, Any],
        page: int = 1,
        limit: int = 20,
        status: Optional[str] = None,
        notification_type: Optional[str] = None,
        entity_type: Optional[str] = None,
        is_read: Optional[bool] = None,
    ) -> Dict[str, Any]:
        try:
            filters: Dict[str, Any] = {}

            if status:
                filters["status"] = status

            if notification_type:
                filters["type"] = notification_type

            if entity_type:
                filters["entityType"] = entity_type

            if is_read is not None:
                filters["isRead"] = is_read

            result = await self.repo.get_paginated(
                recipient_id=PydanticObjectId(user["_id"]),
                page=page,
                limit=limit,
                filters=filters,
            )

            return result

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_unread_count(self, user: Dict[str, Any]) -> Dict[str, Any]:
        try:
            count = await self.repo.get_unread_count(PydanticObjectId(user["_id"]))
            return {"unreadCount": count}

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def mark_as_read(self, user: Dict[str, Any], notification_ids: List[str]) -> Dict[str, Any]:
        try:
            object_ids = [PydanticObjectId(nid) for nid in notification_ids]

            modified = await self.repo.mark_as_read(
                notification_ids=object_ids,
                recipient_id=PydanticObjectId(user["_id"]),
            )

            return {"updated": modified}

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def mark_all_as_read(self, user: Dict[str, Any]) -> Dict[str, Any]:
        try:
            modified = await self.repo.mark_all_as_read(PydanticObjectId(user["_id"]))
            return {"updated": modified}

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def archive(self, user: Dict[str, Any], notification_id: str) -> Dict[str, Any]:
        try:
            from bson import ObjectId

            if not ObjectId.is_valid(notification_id):
                raise AppException(400, "Invalid notification id")

            modified = await self.repo.archive_notification(
                notification_id=PydanticObjectId(notification_id),
                recipient_id=PydanticObjectId(user["_id"]),
            )

            if not modified:
                raise AppException(404, "Notification not found")

            return {"archived": True}

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def delete_notification(self, user: Dict[str, Any], notification_id: str) -> bool:
        try:
            from bson import ObjectId

            if not ObjectId.is_valid(notification_id):
                raise AppException(400, "Invalid notification id")

            notification = await self.repo.find_one(
                {
                    "_id": PydanticObjectId(notification_id),
                    "recipientId.$id": PydanticObjectId(user["_id"]),
                }
            )

            if not notification:
                raise AppException(404, "Notification not found")

            await self.repo.delete_by_id(PydanticObjectId(notification_id))

            return True

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def clear_all(self, user: Dict[str, Any]) -> Dict[str, Any]:
        try:
            deleted = await self.repo.delete_all_for_recipient(PydanticObjectId(user["_id"]))
            return {"deleted": deleted}

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")