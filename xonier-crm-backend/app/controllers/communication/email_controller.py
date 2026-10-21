from fastapi import Request
from typing import Dict, Any
from app.services.communication.email_service import EmailService
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse


class EmailController:
    def __init__(self):
        self.service = EmailService()

    def request_key(self, request):
        value = request.headers.get("idempotency-key", "")
        if len(value) > 128 or (value and not value.strip()):
            raise AppException(422, "Idempotency-Key must be a nonblank value of at most 128 characters")
        return value

    async def send_email(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            if request.headers.get("idempotency-key"):
                payload["_request_key"] = "send:" + self.request_key(request)
            result = await self.service.send_email(payload=payload, user=user)
            return successResponse(data=result, message="Email queued for delivery", status_code=201)
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))

    async def send_bulk_email(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            if request.headers.get("idempotency-key"):
                payload["_request_key"] = "bulk:" + self.request_key(request)
            result = await self.service.send_bulk_email(payload=payload, user=user)
            return successResponse(
                data=result,
                message=f"Bulk email accepted. {result['queued_count']}/{result['total']} queued for delivery"
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
            if request.headers.get("idempotency-key"):
                payload["_request_key"] = f"resend:{id}:" + self.request_key(request)
            result = await self.service.resend_email(id=id, payload=payload, user=user)
            return successResponse(data=result, message="Email queued for redelivery")
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
