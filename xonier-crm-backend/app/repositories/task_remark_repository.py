from app.repositories.base_repository import BaseRepository
from app.db.models.task_remark_model import TaskRemarkModel
from motor.motor_asyncio import AsyncIOMotorClientSession
from typing import List, Any
from beanie import PydanticObjectId

class TaskRemarkRepository(BaseRepository):
    def __init__(self):
        super().__init__(TaskRemarkModel)


    async def get_by_taskId(self, taskId: str, populate:List[str] = [], session:AsyncIOMotorClientSession = None ):
        result = await self.find(filter={"task.$id": PydanticObjectId(taskId), "deletedAt": None}, populate=populate, session=session)
        return result

    

        
        