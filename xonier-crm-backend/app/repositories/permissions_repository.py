from motor.motor_asyncio import AsyncIOMotorClientSession
from app.repositories.base_repository import BaseRepository
from app.db.models.permissions_model import PermissionModel
from beanie import PydanticObjectId
from typing import List, Dict
from fastapi.encoders import jsonable_encoder


class PermissionRepository(BaseRepository):
    def __init__(self):
        super().__init__(PermissionModel)

    async def get_permissions_code(
        self, ids: List[PydanticObjectId], projections: Dict[str, int] = None,
        session: AsyncIOMotorClientSession = None, *, active_only: bool = False,
    ):
        if active_only:
            if not ids:
                return set()
            documents = await self.model.get_pymongo_collection().find(
                {"_id": {"$in": ids}, "is_active": {"$ne": False}, "deleted_at": None},
                {"code": 1},
                session=session,
            ).to_list(length=len(ids))
            return {document["code"] for document in documents}

        data = await self.get_all_without_pagination({"_id": {"$in":ids}}, None, projections, session)
       
        permissions = set()
        data = jsonable_encoder(data)
        for items in data:
           
           permissions.add(items["code"])

        return permissions
