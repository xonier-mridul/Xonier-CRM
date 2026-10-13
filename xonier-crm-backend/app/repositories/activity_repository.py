from typing import Optional
from beanie import PydanticObjectId

from app.db.models.activity_model import ActivityModel
from app.repositories.base_repository import BaseRepository
from app.core.enums import ACTIVITY_ENTITY_TYPE


class ActivityRepository(BaseRepository):
    def __init__(self):
        super().__init__(ActivityModel)

    async def get_by_entity(
        self,
        entityType: ACTIVITY_ENTITY_TYPE,
        entityId: PydanticObjectId,
        page: int = 1,
        limit: int = 10,
    ):
        filters = {
            "entityType": entityType,
            "entityId": entityId,
        }

        return await self.get_all(
            page=page,
            limit=limit,
            filters=filters,
            populate=["userId"],
            sort=["-createdAt"],
        )