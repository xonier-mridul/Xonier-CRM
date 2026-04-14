from fastapi import Request
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.sub_task_service import SubTaskService

class SubTaskController:
    def __init__(self):
        self.service = SubTaskService()


    
    async def create_subtask(self,taskId:str, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            
            result = await self.service.create_subtask(taskId=taskId, payload=payload, user=user)

            return successResponse(200, "Sub task created successfully", result)


        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")