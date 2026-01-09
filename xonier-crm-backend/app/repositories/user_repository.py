from app.repositories.base_repository import BaseRepository
from app.db.models.user_model import UserModel
from motor.motor_asyncio import AsyncIOMotorClientSession
from typing import Dict

class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__(UserModel)

    async def find_user_by_hashMail(self,hashMail: str, projections: Dict[str, int] = None, session: AsyncIOMotorClientSession = None ):
        result = await self.find_one({"hashedEmail": hashMail}, projections, None,  session)
        return result
