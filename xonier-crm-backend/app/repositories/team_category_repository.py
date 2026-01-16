
from app.db.models.team_category_model import TeamCategoryModel
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClientSession
from app.repositories.base_repository import BaseRepository

class TeamCategoryRepository(BaseRepository):
    def __init__(self):
        super().__init__(TeamCategoryModel)

    
    async def find_by_slug(self, slug:str, populate: Optional[List[str]] = None, session: Optional[AsyncIOMotorClientSession] = None):
        result = await self.find_one({"slug": slug}, None, populate, session)
        return result