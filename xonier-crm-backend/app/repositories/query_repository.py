# app/repositories/query_repository.py

from app.repositories.base_repository import BaseRepository
from app.db.models.query_model import QueryModel
from beanie import PydanticObjectId
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClientSession
from datetime import datetime


class QueryRepository(BaseRepository):
    def __init__(self):
        super().__init__(QueryModel)

    # ─── Get All With Filters & Pagination ───────────────────────────────────
    async def get_all_queries(
        self,
        page: int = 1,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        filters = filters or {}
        return await self.get_all(
            page=page,
            limit=limit,
            filters=filters,
            sort=["-created_at"]
        )

    # ─── Soft Delete ──────────────────────────────────────────────────────────
    async def soft_delete(
        self,
        query_id: PydanticObjectId,
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> bool:
        doc = await self.find_one({"_id": query_id, "deleted_at": None})
        if not doc:
            return False

        await self.update(
            id=query_id,
            data={"deleted_at": datetime.utcnow()},
            session=session
        )
        return True

    # ─── Bulk Delete ──────────────────────────────────────────────────────────
    async def bulk_soft_delete(
        self,
        ids: List[PydanticObjectId],
        session: Optional[AsyncIOMotorClientSession] = None
    ) -> int:
        result = await self.bulk_update_by_ids(
            ids=ids,
            data={"deleted_at": datetime.utcnow()},
            session=session
        )
        return result