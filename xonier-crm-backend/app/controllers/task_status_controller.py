from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.task_status_service import TaskStatusService
from typing import Dict, Any
 
 
class TaskStatusController:
    def __init__(self):
        self.service = TaskStatusService()
 
    async def create_task_status(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.create_task_status(payload, user)
            return successResponse(201, "Task status created successfully", result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def bulk_create_task_statuses(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.bulk_create_task_statuses(payload, user)
            return successResponse(201, result["message"], result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_all_task_statuses(self, request: Request):
        try:
            user = request.state.user
            filters = dict(request.query_params)
            result = await self.service.get_all_task_statuses(filters, user)
            return successResponse(200, "Task statuses fetched successfully", result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_statuses_by_category(self, request: Request, category_id: str):
        try:
            user = request.state.user
            result = await self.service.get_statuses_by_category(category_id, user)
            return successResponse(200, "Task statuses fetched successfully", result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_task_status_by_id(self, request: Request, status_id: str):
        try:
            user = request.state.user
            result = await self.service.get_task_status_by_id(status_id, user)
            return successResponse(200, "Task status fetched successfully", result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def update_task_status(self, request: Request, status_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            await self.service.update_task_status(status_id, payload, user)
            return successResponse(200, "Task status updated successfully", None)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def reorder_task_statuses(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.reorder_task_statuses(payload, user)
            return successResponse(200, f"Reordered {result['reorderedCount']} statuses successfully", result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def delete_task_status(self, request: Request, status_id: str):
        try:
            user = request.state.user
            await self.service.delete_task_status(status_id, user)
            return successResponse(200, "Task status deleted successfully", None)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def get_all_deleted_statuses(self, request: Request):
        try:
            
            user = request.state.user
            filters = dict(request.query_params)
            result = await self.service.get_all_deleted_statuses(filters, user)
            return successResponse(200, "Deleted task statuses fetched successfully", result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def permanent_delete_task_status(self, request: Request, status_id: str):
        try:
            user = request.state.user
            await self.service.permanent_delete_task_status(status_id, user)
            return successResponse(200, "Task status permanently deleted successfully", None)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
 
 
 