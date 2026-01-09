
from app.repositories.base_repository import BaseRepository
from app.db.models.user_roles_model import UserRoleModel
from beanie import PydanticObjectId
from motor.motor_asyncio import AsyncIOMotorClientSession

class UserRoleRepository(BaseRepository):

    def __init__(self):
        super().__init__(UserRoleModel)


  
