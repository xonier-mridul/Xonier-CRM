from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.task_category_service import TaskCategoryService
from typing import Dict, Any
 
 
class TaskCategoryController:
    def __init__(self):
        self.service = TaskCategoryService()
 
    async def create_task_category(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.create_task_category(payload, user)
            return successResponse(201, "Task category created successfully", result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_all_task_categories(self, request: Request):
        try:
            user = request.state.user
            filters = dict(request.query_params)
            result = await self.service.get_all_task_categories(filters, user)
            return successResponse(200, "Task categories fetched successfully", result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_task_category_by_id(self, request: Request, category_id: str):
        try:
            user = request.state.user
            result = await self.service.get_task_category_by_id(category_id, user)
            return successResponse(200, "Task category fetched successfully", result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def update_task_category(self, request: Request, category_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            await self.service.update_task_category(category_id, payload, user)
            return successResponse(200, "Task category updated successfully", None)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def toggle_active(self, request: Request, category_id: str):
        try:
            user = request.state.user
            result = await self.service.toggle_active(category_id, user)
            status_text = "activated" if result["isActive"] else "deactivated"
            return successResponse(200, f"Task category {status_text} successfully", result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def delete_task_category(self, request: Request, category_id: str):
        try:
            user = request.state.user
            await self.service.delete_task_category(category_id, user)
            return successResponse(200, "Task category deleted successfully", None)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")