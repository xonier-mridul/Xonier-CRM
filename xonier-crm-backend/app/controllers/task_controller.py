from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.task_service import TaskService
from typing import Dict, Any
 
 
class TaskController:
    def __init__(self):
        self.service = TaskService()
 
    async def create_task(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.create_task(payload, user)
            return successResponse(201, "Task created successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def create_remark(self,taskId:str, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.create_remark(taskId, payload, user)
            return successResponse(201, "Task remark created successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def get_remarks(self, taskId: str, request:Request):
        try:
            user = request.state.user
            filters = dict(request.query_params)

            result = await self.service.get_remarks(taskId=taskId, filters=filters, user=user)

            return successResponse(200, "Remarks fetched successfully", result)
        
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
        
 
    async def get_all_tasks(self, request: Request):
        try:
            user = request.state.user
            filters = dict(request.query_params)
            result = await self.service.get_all_tasks(filters, user)
            return successResponse(200, "Tasks fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_kanban_board(self, request: Request, category_id: str):
        try:
            user = request.state.user
            filters = dict(request.query_params)
            result = await self.service.get_kanban_board(category_id, user, filters)
            return successResponse(200, "Kanban board fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_task_by_id(self, request: Request, task_id: str):
        try:
            user = request.state.user
            result = await self.service.get_task_by_id(task_id, user)
            return successResponse(200, "Task fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_my_tasks(self, request: Request):
        try:
            user = request.state.user
            filters = dict(request.query_params)
            result = await self.service.get_my_tasks(filters, user)
            return successResponse(200, "My tasks fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_tasks_by_entity(self, request: Request, entity_type: str, entity_id: str):
        try:
            user = request.state.user
            result = await self.service.get_tasks_by_entity(entity_type, entity_id, user)
            return successResponse(200, "Tasks fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def update_task(self, request: Request, task_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            await self.service.update_task(task_id, payload, user)
            return successResponse(200, "Task updated successfully", None)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def update_remarks_acknowledge(self, request: Request, remarkId: str, payload:Dict[str, Any]):
        try:
            user = request.state.user
            await self.service.update_remarks_acknowledge(remarkId, payload, user)

            return successResponse(200, f"Remark status updated")


        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
 
    async def update_task_status(self, request: Request, task_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.update_task_status(task_id, payload, user)
            return successResponse(200, "Task status updated successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def move_task(self, request: Request, task_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            await self.service.move_task(task_id, payload, user)
            return successResponse(200, "Task moved successfully", None)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def reorder_tasks(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.reorder_tasks(payload, user)
            return successResponse(200, f"Reordered {result['reorderedCount']} tasks successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def assign_task(self, request: Request, task_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            await self.service.assign_task(task_id, payload, user)
            return successResponse(200, "Task assigned successfully", None)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def add_watcher(self, request: Request, task_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            await self.service.add_watcher(task_id, payload, user)
            return successResponse(200, "Watcher added successfully", None)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def remove_watcher(self, request: Request, task_id: str, watcher_id: str):
        try:
            user = request.state.user
            await self.service.remove_watcher(task_id, watcher_id, user)
            return successResponse(200, "Watcher removed successfully", None)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def bulk_assign_tasks(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.bulk_assign_tasks(payload, user)
            return successResponse(200, f"{result['updatedCount']} tasks assigned successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def bulk_update_status(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.bulk_update_status(payload, user)
            return successResponse(200, f"{result['updatedCount']} tasks updated successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def delete_task(self, request: Request, task_id: str):
        try:
            user = request.state.user
            await self.service.delete_task(task_id, user)
            return successResponse(200, "Task deleted successfully", None)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_task_activity(self, request: Request, task_id: str):
        try:
            user = request.state.user
            result = await self.service.get_task_activity(task_id, user)
            return successResponse(200, "Task activity fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_due_today(self, request: Request):
        try:
            user = request.state.user
            result = await self.service.get_due_today(user)
            return successResponse(200, "Due today tasks fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_overdue_tasks(self, request: Request):
        try:
            user = request.state.user
            result = await self.service.get_overdue_tasks(user)
            return successResponse(200, "Overdue tasks fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def get_all_deleted(self, request: Request):
        try:
            
            user = request.state.user
            filters = request.query_params
            result = await self.service.get_all_deleted(user=user, filters=filters)

            return successResponse(200, "All deleted task get successfully", result)

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
    async def get_user_task_stats(
        self,
        request: Request,
        user_id: str,
        filters: Dict[str, Any]
    ):
        try:
            user = request.state.user
            result = await self.service.get_user_task_stats(
                user_id=user_id,
                filters=filters,
                user=user
            )
            return successResponse(
                status_code=200,
                message="User task stats fetched successfully",
                data=result
            )
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def delete_remark(self, remarkId: str, request: Request):
        try:
            user = request.state.user

            result = await self.service.delete_remark(remarkId=remarkId, user=user)

            return successResponse(200, "Mark deleted successfully")

        except AppException as e:
            raise e
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")