from fastapi import Request
from typing import Dict, Any
from app.services.communication.email_service import EmailService
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse


class EmailController:
    def __init__(self):
        self.service = EmailService()

    async def send_email(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.send_email(payload=payload, user=user)
            return successResponse(data=result, message="Email sent successfully", status_code=201)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))

    async def send_bulk_email(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.send_bulk_email(payload=payload, user=user)
            return successResponse(
                data=result,
                message=f"Bulk email completed. {result['success_count']}/{result['total']} sent successfully"
            )
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))

    async def get_all(self, request: Request):
        try:
            user = request.state.user
            filters = dict(request.query_params)
            result = await self.service.get_all(filters=filters, user=user)
            return successResponse(data=result, message="Email history fetched successfully")
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))

    async def get_by_id(self, request: Request, id: str):
        try:
            user = request.state.user
            result = await self.service.get_by_id(id=id, user=user)
            return successResponse(data=result, message="Email fetched successfully")
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))

    async def resend_email(self, request: Request, id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.resend_email(id=id, payload=payload, user=user)
            return successResponse(data=result, message="Email resent successfully")
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))

    async def update(self, request: Request, id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.update(id=id, payload=payload, user=user)
            return successResponse(data=result, message="Email updated successfully")
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))

    async def delete(self, request: Request, id: str):
        try:
            user = request.state.user
            result = await self.service.delete(id=id, user=user)
            return successResponse(data=result, message="Email deleted successfully")
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))

    async def bulk_delete(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.bulk_delete(ids=payload["ids"], user=user)
            return successResponse(
                data=result,
                message=f"{result['deleted_count']} email(s) deleted successfully"
            )
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))