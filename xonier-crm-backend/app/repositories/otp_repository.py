
from app.repositories.base_repository import BaseRepository
from app.db.models.otp_model import OtpModel
from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorClientSession

class OtpRepository(BaseRepository):
    def __init__(self):
        super().__init__(OtpModel)

    async def find_latest_otp(self, filters: Dict[str, Any], session:AsyncIOMotorClientSession = None):
        query =  self.model.find(filters, session=session).sort(-self.model.createdAt).limit(1).first_or_none()

        return await query


    