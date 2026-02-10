
from fastapi import Request
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.invoice_service import InvoiceService

class InvoiceController:
    def __init__(self):
        self.service = InvoiceService()

    async def getAll(self, request: Request):
        try:
            filters = request.query_params
            user = request.state.user

            result = await self.service.getAll(filters=filters, user=user)

            return successResponse(200, "All invoice fetched successfully", result)


        except AppException as e:
            raise e
        

    async def get_by_id(self, id: str, request: Request):
        try:
            user = request.state.user

            result = await self.service.get_by_id(id=id, user=user)

            return successResponse(200, f"{result["invoiceId"]} Invoice fetched successfully", result)


        except AppException as e:
            raise e
        

    async def download_invoice(id:str, request: Request):
        try:
            user = request.state.user

        except AppException as e:
            raise e
