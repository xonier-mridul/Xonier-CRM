from fastapi import Request
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.quotation_service import QuotationService

class QuotationController:
    def __init__(self):
        self.service = QuotationService()

    async def create(self, request: Request, payload: Dict[str, Any]):
        try:

            user = request.state.user

            result = await self.service.create(user=user, payload=payload)

            return successResponse(200, "Enquiry created successfully", result)

        except AppException as e:
            raise e