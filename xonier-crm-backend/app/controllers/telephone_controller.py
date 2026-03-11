from fastapi import Request
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.telephone_service import TelephoneService

class TelephoneController:
    def __init__(self):
        self.service = TelephoneService()

    async def register(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.register(payload, user)

            return successResponse(201, f"{result["phoneNumber"]} created successfully")


        except AppException as e:
            raise e
        

    async def get_all_active(self, request: Request):
        try:

            filters = dict(request.query_params)

            result = await self.service.get_all_active(filters=filters)

            return successResponse(200, "Active phone number fetched successfully", result)
        


        except AppException as e:
            raise e
        

    async def update_status(self, request: Request, id:str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            
            result = await self.service.update_status(id=id, payload=payload, user=user)

            return successResponse(200, f"{result["phoneNumber"]} status updated to {result["status"]} successfully", result)

        except AppException as e:
            raise e
        

    async def soft_delete(self, request: Request, id:str):
        try:
            user = request.state.user

            result = await self.service.soft_delete(id=id, user=user)
            number = result.get("phoneNumber") or ""
            return successResponse(200, f"{number} number deleted successfully", result)

        
        except AppException as e:
            raise e


        
    