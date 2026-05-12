
from app.repositories.base_repository import BaseRepository
from app.db.models.subscription_model import SubscriptionModel
from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClientSession
from beanie import PydanticObjectId
from app.core.enums import SUBSCRIPTION_STATUS


class SubscriptionRepository(BaseRepository):
    def __init__(self):
        super().__init__(SubscriptionModel)

    async def find_active_by_company(
        self,
        company_id: PydanticObjectId,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> Optional[SubscriptionModel]:
        return await self.find_one(
            filter={
                "companyId": company_id,
                "status": {"$in": [
                    SUBSCRIPTION_STATUS.ACTIVE,
                    SUBSCRIPTION_STATUS.TRIAL,
                ]},
                "deletedAt": None,
            },
            session=session,
        )

    async def find_by_company(
        self,
        company_id: PydanticObjectId,
        session: Optional[AsyncIOMotorClientSession] = None,
    ):
        return await self.find_many(
            filters={"companyId": company_id, "deletedAt": None},
            session=session,
        )