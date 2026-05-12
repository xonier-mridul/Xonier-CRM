
from app.repositories.base_repository import BaseRepository
from app.db.models.user_roles_model import UserRoleModel
from beanie import PydanticObjectId
from motor.motor_asyncio import AsyncIOMotorClientSession
from typing import Optional
from app.core.constants import COMPANY_ADMIN_CODE

class UserRoleRepository(BaseRepository):

    def __init__(self):
        super().__init__(UserRoleModel)


    async def get_company_admin_role(self, session: Optional[AsyncIOMotorClientSession] = None):
        return await self.find_one(filter={"code": COMPANY_ADMIN_CODE}, session=session)


  
