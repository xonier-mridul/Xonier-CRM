
from app.repositories.base_repository import BaseRepository
from app.db.models.team_model import TeamModel
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClientSession
from beanie import PydanticObjectId


class TeamRepository(BaseRepository):
    def __init__(self):
        super().__init__(TeamModel)

    async def find_by_slug(self, slug: str, populate:Optional[List[str]] = None , session: Optional[AsyncIOMotorClientSession] = None):
        result = await self.find_one({"slug": slug}, None, populate, session)
        return result 
    
    async def find_by_category(self, categoryId: PydanticObjectId, populate:Optional[List[str]] = None , session: Optional[AsyncIOMotorClientSession] = None ):
        print("error one")
        result = await self.find_one({"category.$id": categoryId}, None, populate, session=session)
        return result
