from motor.motor_asyncio import AsyncIOMotorClientSession
from app.repositories.base_repository import BaseRepository
from app.db.models.permissions_model import PermissionModel
from beanie import PydanticObjectId
from typing import List, Dict
from fastapi.encoders import jsonable_encoder


class PermissionRepository(BaseRepository):
    def __init__(self):
        super().__init__(PermissionModel)

    async def get_permissions_code(self, ids: List[PydanticObjectId], projections: Dict[str, int] = None, session: AsyncIOMotorClientSession = None):
        data = await self.get_all_without_pagination({"_id": {"$in":ids}}, None, projections, session)
       
        permissions = set()
        data = jsonable_encoder(data)
        for items in data:
           
           permissions.add(items["code"])
        print("permissions data: ", permissions)
        return permissions
