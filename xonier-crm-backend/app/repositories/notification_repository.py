from app.repositories.base_repository import BaseRepository
from app.db.models.notification_model import NotificationModel
from beanie import PydanticObjectId
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone


class NotificationRepository(BaseRepository):
    def __init__(self):
        super().__init__(NotificationModel)

    async def mark_as_read(self, notification_ids: List[PydanticObjectId], recipient_id: PydanticObjectId) -> int:
        result = await self.model.find(
            {
                "_id": {"$in": notification_ids},
                "recipientId.$id": recipient_id,
            }
        ).update(
            {
                "$set": {
                    "isRead": True,
                    "status": "read",
                    "readAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc),
                }
            }
        )
        return result.modified_count

    async def mark_all_as_read(self, recipient_id: PydanticObjectId) -> int:
        result = await self.model.find(
            {
                "recipientId.$id": recipient_id,
                "isRead": False,
            }
        ).update(
            {
                "$set": {
                    "isRead": True,
                    "status": "read",
                    "readAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc),
                }
            }
        )
        return result.modified_count

    async def archive_notification(self, notification_id: PydanticObjectId, recipient_id: PydanticObjectId) -> int:
        result = await self.model.find(
            {
                "_id": notification_id,
                "recipientId.$id": recipient_id,
            }
        ).update(
            {
                "$set": {
                    "status": "archived",
                    "updatedAt": datetime.now(timezone.utc),
                }
            }
        )
        return result.modified_count

    async def get_unread_count(self, recipient_id: PydanticObjectId) -> int:
        return await self.model.find(
            {
                "recipientId.$id": recipient_id,
                "isRead": False,
            }
        ).count()

    async def get_paginated(
        self,
        recipient_id: PydanticObjectId,
        page: int = 1,
        limit: int = 20,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        import math

        base_filter: Dict[str, Any] = {"recipientId.$id": recipient_id}

        if filters:
            base_filter.update(filters)

        skip = (page - 1) * limit

        docs = (
            await self.model.find(base_filter)
            .sort([("createdAt", -1)])
            .skip(skip)
            .limit(limit)
            .to_list()
        )

        total = await self.model.find(base_filter).count()
        total_pages = math.ceil(total / limit)

        return {
            "data": [doc.model_dump(mode="json") for doc in docs],
            "page": page,
            "totalPages": total_pages,
            "limit": limit,
            "total": total,
        }

    async def delete_all_for_recipient(self, recipient_id: PydanticObjectId) -> int:
        docs = await self.model.find({"recipientId.$id": recipient_id}).to_list()
        count = len(docs)
        for doc in docs:
            await doc.delete()
        return count