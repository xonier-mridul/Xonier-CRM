from typing import List, Optional
from app.db.models.deal_model import DealModel
from motor.motor_asyncio import AsyncIOMotorClientSession
from app.repositories.base_repository import BaseRepository
from beanie import PydanticObjectId
from bson import DBRef, ObjectId
from app.services.stage_automation_service import apply_deal_rules

class DealRepository(BaseRepository):
    def __init__(self):
        super().__init__(DealModel)

    async def update(self, id, data, session=None):
        # Stage changes from both the board and quotation workflows use this path.
        # Evaluate against the stored stage in the same atomic write.
        if "dealStage" not in data:
            return await super().update(id, data, session=session)
        if session is None:
            from app.db.db import Client
            async with await Client.start_session() as own_session:
                async with own_session.start_transaction():
                    return await self.update(id, data, session=own_session)
        collection = self.model.get_pymongo_collection()
        old = await collection.find_one(self.model._inject_scope({"_id": id}), session=session)
        if not old:
            return False
        target_stage = getattr(data["dealStage"], "value", data["dealStage"])
        fields = {key: {"$literal": value} for key, value in data.items()}
        fields["dealStage"] = {"$literal": target_stage}
        fields["stageEnteredAt"] = {
            "$cond": [
                {"$ne": ["$dealStage", {"$literal": target_stage}]},
                "$$NOW",
                {"$ifNull": ["$stageEnteredAt", None]},
            ],
        }
        result = await collection.update_one(
            self.model._inject_scope({"_id": id}), [{"$set": fields}], session=session,
        )
        if result.matched_count and old.get("dealStage") != target_stage:
            actor = data.get("updatedBy") or old.get("createdBy")
            if isinstance(actor, DBRef):
                actor = actor.id
            elif isinstance(actor, dict):
                actor = actor.get("id") or actor.get("$id")
            if not actor or not ObjectId.is_valid(str(actor)):
                actor = old.get("createdBy", {}).get("id") if isinstance(old.get("createdBy"), dict) else None
            await apply_deal_rules({**old, "assignedTo": data.get("assignedTo", old.get("assignedTo"))}, target_stage, actor, session)
        return bool(result.matched_count)

    async def find_by_lead(self,leadId: PydanticObjectId, populate: Optional[List[str]] = None, session: Optional[AsyncIOMotorClientSession] = None):
       
        return await self.find_one({"lead_id.$id": leadId})
