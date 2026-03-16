
from fastapi import Request
from typing import Dict, Any

from app.services.email_template_service import EmailTemplateService
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse


class EmailTemplateController:
    def __init__(self):
        self.service = EmailTemplateService()

    async def create(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.create(payload=payload, user=user)
            return successResponse(
                data=result,
                message="Email template created successfully",
                status_code=201
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
            return successResponse(
                status_code=200,
                data=result,
                message="Email templates fetched successfully"
            )
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))

    async def get_by_id(self, request: Request, id: str):
        try:
            user = request.state.user
            result = await self.service.get_by_id(id=id, user=user)
            return successResponse(
                status_code=200,
                data=result,
                message="Email template fetched successfully"
            )
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))

    async def update(self, request: Request, id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.update(id=id, payload=payload, user=user)
            return successResponse(
                status_code=200,
                data=result,
                message="Email template updated successfully"
            )
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))

    async def soft_delete(self, request: Request, id: str):
        try:
            user = request.state.user
            result = await self.service.soft_delete(id=id, user=user)
            return successResponse(
                status_code=200,
                data=result,
                message="Email template deleted successfully"
            )
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))

    async def render_preview(self, request: Request, id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.render_preview(
                id=id,
                variables=payload.get("variables", {}),
                user=user
            )
            return successResponse(
                status_code=200,
                data=result,
                message="Template rendered successfully"
            )
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))
        
    
  
    async def bulk_delete(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
            result = await self.service.bulk_delete(
                ids=payload["ids"],
                user=user
            )
            return successResponse(
                data=result,
                message=f"{result['deleted_count']} template(s) deleted successfully"
            )
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, str(e))