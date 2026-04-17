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
        

    async def mark_complete(self, subtaskId: str, request: Request):
        try:
            user = request.state.user

            result = await self.service.mark_complete(subtaskId, user)

            message = result.get("message")

            return successResponse(200, f"{message or "Sub task mark completed"}")


        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def get_all_subtasks(self, taskId: str, request: Request, filters: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.get_all_subtasks(taskId, user, filters)
            return successResponse(200, "Sub tasks fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_subtask_by_id(self, subtaskId: str, request: Request):
        try:
            user = request.state.user
            result = await self.service.get_subtask_by_id(subtaskId, user)
            return successResponse(200, "Sub task fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def update_subtask(self, subtaskId: str, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            await self.service.update_subtask(subtaskId, payload, user)
            return successResponse(200, "Sub task updated successfully")

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

        

    async def delete_subtask(self, id: str, request: Request):
        try:
            user = request.state.user
            await self.service.delete_subtask(id, user)

            return successResponse(200, "Sub task deleted successfully")
        
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}") 