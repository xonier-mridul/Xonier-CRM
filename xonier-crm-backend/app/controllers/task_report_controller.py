# controllers/task_report_controller.py
from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.task_report_service import TaskReportService
from typing import Dict, Any


class TaskReportController:
    def __init__(self):
        self.service = TaskReportService()

    async def submit_morning_agenda(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.submit_morning_agenda(payload, user)
            return successResponse(201, "Morning agenda submitted and report created successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def update_morning_agenda(self, request: Request, report_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.update_morning_agenda(report_id, payload, user)
            return successResponse(200, "Morning agenda updated successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def submit_evening_report(self, request: Request, report_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.submit_evening_report(report_id, payload, user)
            return successResponse(200, "Evening report submitted successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def update_evening_report(self, request: Request, report_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.update_evening_report(report_id, payload, user)
            return successResponse(200, "Evening report updated successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def review_task_report(self, request: Request, report_id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.review_task_report(report_id, payload, user)
            return successResponse(200, "Report reviewed successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_all_reports(self, request: Request, filters: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.get_all_reports(user, filters)
            return successResponse(200, "Task reports fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_my_reports(self, request: Request, filters: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.get_my_reports(user, filters)
            return successResponse(200, "Your reports fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_report_by_id(self, request: Request, report_id: str):
        try:
            user = request.state.user
            result = await self.service.get_report_by_id(report_id, user)
            return successResponse(200, "Task report fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
    

    async def get_reports_by_user_ids(self, request: Request, filters: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.get_reports_by_user_ids(user, filters)
            return successResponse(200, "Task reports fetched successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def delete_task_report(self, request: Request, report_id: str):
        try:
            user = request.state.user
            result = await self.service.delete_task_report(report_id, user)
            return successResponse(200, "Task report deleted successfully", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")