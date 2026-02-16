
from fastapi import Request
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.invoice_service import InvoiceService
from fastapi.responses import StreamingResponse

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
        

    async def download_invoice(self, id: str, request: Request):
       
        try:
            user = request.state.user
            
            result = await self.service.download_invoice(id, user)

            return StreamingResponse(
                result["pdf_buffer"],
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={result['filename']}",
                    "Content-Type": "application/pdf"
                }
            )

        except AppException as e:
            raise e
        
        except Exception as e:
            print("Invoice download controller error:", e)
            raise AppException(
                status_code=500,
                message="Failed to download invoice"
            )

