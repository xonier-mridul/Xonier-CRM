from typing import List, Optional
from app.db.models.deal_model import DealModel
from motor.motor_asyncio import AsyncIOMotorClientSession
from app.repositories.base_repository import BaseRepository
from beanie import PydanticObjectId

class DealRepository(BaseRepository):
    def __init__(self):
        super().__init__(DealModel)

    async def update(self, id, data, session=None):
        # Stage changes from both the board and quotation workflows use this path.
        # Evaluate against the stored stage in the same atomic write.
        if "dealStage" not in data:
            return await super().update(id, data, session=session)
        fields = {key: {"$literal": value} for key, value in data.items()}
        fields["stageEnteredAt"] = {
            "$cond": [
                {"$ne": ["$dealStage", {"$literal": data["dealStage"]}]},
                "$$NOW",
                {"$ifNull": ["$stageEnteredAt", None]},
            ],
        }
        result = await self.model.get_pymongo_collection().update_one(
            self.model._inject_scope({"_id": id}), [{"$set": fields}], session=session,
        )
        return bool(result.matched_count)

    async def find_by_lead(self,leadId: PydanticObjectId, populate: Optional[List[str]] = None, session: Optional[AsyncIOMotorClientSession] = None):
       
        return await self.find_one({"lead_id.$id": leadId})
