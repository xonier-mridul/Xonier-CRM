
from fastapi import Request
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.deal_service import DealService


class DealController:
    def __init__(self):
        self.service = DealService()

    async def create(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.create(payload, user["_id"])

            return successResponse(201, "Deal created successfully", result)


        except AppException as e:
            raise e
        

    async def get_all(self,request: Request):
        try:
            filters = request.query_params

            user = request.state.user

            result = await self.service.get_all(filters=filters, user=user)
            return successResponse(200, "All deal data fetched successfully", result)


        except AppException as e:
            raise e
        
    
    async def get_by_id(self, request:Request, id:str):
        try:
            user = request.state.user

            result = await self.service.get_by_id(dealId=id, user=user)
            return successResponse(200, "Deal data fetched successfully", result)


        except AppException as e:
            raise e
        


    async def update(self, id:str, request: Request, payload: Dict[str, Any]):
        try:
           user = request.state.user
           await self.service.update(id=id, user=user, payload=payload)
           return successResponse(200, f"{payload["dealName"]} updated successfully")
 

        except AppException as e:
            raise e
        

    async def delete(self, id:str, request: Request):
        try:
            user = request.state.user
            result = await self.service.delete(id, user)
            return successResponse(200, f"{result["dealName"]} deleted successfully")


        except AppException as e:
            raise e