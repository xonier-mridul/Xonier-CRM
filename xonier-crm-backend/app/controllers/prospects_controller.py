
from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.prospects_service import ProspectsService
from typing import Dict, Any

class ProspectsController:
    def __init__(self):
        self.service = ProspectsService()

    async def get_all_active(self, request: Request):
        try:
            filters = request.query_params
            user = request.state.user

            result = await self.service.get_all_active(filters=filters, user=user)

            return successResponse(status_code=200, message="All active prospects get successfully", data=result)




        except AppException as e:
            raise e
        
    
    async def get_by_id(self,id: str, request: Request):
        try:
            user = request.state.user

            result = await self.service.get_by_id(id, user)

            return successResponse(200, f"{result["enquiry_id"]} fetched successfully", result)
        
        except AppException as e:
            raise e
        

    async def bulk_assign(self, request: Request, payload: Dict[str, Any]):
        try:

            user = request.state.user

            result = await self.service.bulk_assign(user, payload)

            

            return successResponse(200, f"{result["modifiedCount"]} bulk lead assign successfully to {result["user"]}")

        except AppException as e:
            raise e