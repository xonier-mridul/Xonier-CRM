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
        

    async def getAll(self, request: Request):
        try:
            filters = request.query_params
            user = request.state.user

            result = await self.service.getAll(user=user, filters=filters)

            return successResponse(200, "Enquiry data fetched successfully", result)


        except AppException as e:
            raise e
        
    async def get_by_id(self, request: Request, quoteId: str):
        try:
            user = request.state.user

            result = await self.service.get_by_id(user=user, quoteId=quoteId)

            return successResponse(200, "Enquiry data fetched successfully", result)
            

        
        except AppException as e:
            raise e
        
    async def update(self, id:str, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.update(quoteId=id, payload=payload, user=user)


            return successResponse(200, "Quotation updated successfully successfully", result)


        except AppException as e:
            raise e
        
    async def update_status(self, id:str, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.update_status(quoteId=id, payload=payload, user=user)

            return successResponse(200, f"Quotation status update to {result["quotationStatus"]} successfully successfully", result)


        except AppException as e:
            raise e

        
        

    async def resend(self, id:str, request:Request):
        try:
            user = request.state.user

            await self.service.resend(quoteId=id, user=user) 

            return successResponse(200, "Quotation resend successfully")


        except AppException as e:
            raise e


    async def delete(self, quoteId: str, request: Request):
        try:
            user = request.state.user
            result = await self.service.delete(quoteId, user)

            return successResponse(200, f"Quotation delete successfully")

        except AppException as e:
            raise e

         