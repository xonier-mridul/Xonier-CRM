from motor.motor_asyncio import AsyncIOMotorClientSession
from app.repositories.base_repository import BaseRepository
from app.db.models.permissions_model import PermissionModel
from beanie import PydanticObjectId
from typing import List, Dict


class PermissionRepository(BaseRepository):
    def __init__(self):
        super().__init__(PermissionModel)

    async def get_permissions_code(self, role_ids: List[PydanticObjectId], projections: Dict[str, int] = {"code": 1, "module": 1, "action": 1 }, session: AsyncIOMotorClientSession = None):
        data = await self.get_all_without_pagination({"_id": {"$in":role_ids}}, None, projections, session)
        
        permissions = set()
        for items in data:
           permissions.add(items["code"])
        print("permissions data: ", permissions)
        return permissions
