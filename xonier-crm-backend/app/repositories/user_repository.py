from app.repositories.base_repository import BaseRepository
from app.db.models.user_model import UserModel
from motor.motor_asyncio import AsyncIOMotorClientSession
from typing import Dict, List, Optional
from bson import ObjectId
from beanie import PydanticObjectId
from app.core.constants import MANGER_CODE

class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__(UserModel)

    async def find_user_by_hashMail(self,hashMail: str, projections: Optional[Dict[str, int]] = None, populate: Optional[List[str]] = None,  session: Optional[AsyncIOMotorClientSession] = None ):
        result = await self.find_one({"hashedEmail": hashMail}, projections, populate,  session)
        return result
    
    async def find_by_role(self, roleId: str , projections: Optional[Dict[str, int]] = None, populate: Optional[List[str]] = None, session: Optional[AsyncIOMotorClientSession]=None):

        result = await self.get_all(filters={"userRole.$id": {"$in":[PydanticObjectId(roleId)]}}, populate=populate, session=session)
        return result
    

    
    async def check_is_manager(self, userId: PydanticObjectId):
        user = await self.find_by_id(id=userId, populate=["userRole"])
        user = user.model_dump(mode="json")
        for item in user["userRole"]:
            if item["code"] == MANGER_CODE:

              return {"success": True, "user": user}
            
        return {"success": False, "user": user}
