from fastapi import Request
from app.utils.custom_response import successResponse
from fastapi.encoders import jsonable_encoder
from app.services.task_timelog_service import TimeLogService
from app.utils.custom_exception import AppException
from typing import Optional


class TimeLogController:
    def __init__(self):
        self.service = TimeLogService()

    

    async def start(self, request: Request, task_id: str):
        try:
            user = request.state.user
            result = await self.service.start(task_id, user)
            return successResponse(
                status_code=201,
                message= "Successfully started",
                data=jsonable_encoder(result)
                
            )
        except AppException as e:
            raise
        except Exception as e:
            return AppException(
                status_code=500,
                message=f"Internal server error: {e}",
            )

    
    async def pause(self, request: Request, log_id: str):
        try:
            user = request.state.user
            result = await self.service.pause(log_id, user)
            return successResponse(
                status_code=200,
                message= "Successfully paused",
                data=jsonable_encoder(result)
                
            )
        except AppException as e:
            raise
        except Exception as e:
            return AppException(
                status_code=500,
                message=f"Internal server error: {e}",
            )

    
    async def resume(self, request: Request, log_id: str):
        try:
            user = request.state.user
            result = await self.service.resume(log_id, user)
            return successResponse(
                status_code=200,
                message= "Successfully resume",
                data=jsonable_encoder(result)
                
            )
        except AppException as e:
            raise
        except Exception as e:
            return AppException(
                status_code=500,
                message=f"Internal server error: {e}",
            )

    

    async def stop(self, request: Request, log_id: str, note: Optional[str] = None):
        try:
            user = request.state.user
            result = await self.service.stop(log_id, user, note)
            return successResponse(
                status_code=200,
                message="successfully stopped",
                data=jsonable_encoder(result)
            )
        except AppException as e:
            raise
        except Exception as e:
            return AppException(
                status_code=500,
                message=f"Internal server error: {e}",
            )

    

    async def get_by_task(self, request: Request, task_id: str):
        try:
            result = await self.service.get_by_task(task_id)
            return successResponse(
                status_code=200,
                message="successfully get task by id",
                data=jsonable_encoder(result)
                
            )
        except AppException as e:
            raise
        except Exception as e:
            return AppException(
                status_code=500,
                message=f"Internal server error: {e}",
            )

    

    async def get_active_timer(self, request: Request, task_id: str):
        try:
            user = request.state.user
            result = await self.service.get_active_timer(task_id, user)
            return successResponse(
                status_code=200,
                message= "Successfully get timer",
                data=jsonable_encoder(result) if result else None
                
            )
        except AppException as e:
            raise
        except Exception as e:
            return AppException(
                status_code=500,
                message=f"Internal server error: {e}",
            )