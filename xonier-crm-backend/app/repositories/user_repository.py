from app.repositories.base_repository import BaseRepository
from app.db.models.user_model import UserModel
from motor.motor_asyncio import AsyncIOMotorClientSession
from typing import Dict, List, Optional

class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__(UserModel)

    async def find_user_by_hashMail(self,hashMail: str, projections: Optional[Dict[str, int]] = None, populate: Optional[List[str]] = None,  session: Optional[AsyncIOMotorClientSession] = None ):
        result = await self.find_one({"hashedEmail": hashMail}, projections, populate,  session)
        return result
