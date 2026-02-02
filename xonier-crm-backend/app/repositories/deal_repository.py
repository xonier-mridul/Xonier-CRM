from typing import List, Optional
from app.db.models.deal_model import DealModel
from motor.motor_asyncio import AsyncIOMotorClientSession
from app.repositories.base_repository import BaseRepository
from beanie import PydanticObjectId

class DealRepository(BaseRepository):
    def __init__(self):
        super().__init__(DealModel)

    async def find_by_lead(self,leadId: PydanticObjectId, populate: Optional[List[str]] = None, session: Optional[AsyncIOMotorClientSession] = None):
        print("lead id: ", leadId)
        return await self.find_one({"lead_id.$id": leadId})