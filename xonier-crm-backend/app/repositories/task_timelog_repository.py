from app.db.models.task_timelog_model import TaskTimeLogModel
from app.repositories.base_repository import BaseRepository
from typing import List, Any, Optional
from beanie import PydanticObjectId
from motor.motor_asyncio import AsyncIOMotorClientSession
from bson import ObjectId
# 95400

class TaskTimeLogRepository(BaseRepository):
    def __init__(self):
        super().__init__(TaskTimeLogModel)

    async def find_by_taskId(self,taskId: str, populate: Optional[List[str]] = None, session: Optional[AsyncIOMotorClientSession] = None):
       return  await self.find(filter={"task.$id": ObjectId(taskId)}, populate=populate, session=session)