
from fastapi import Request
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.lead_service import LeadService


class LeadController:
    def __init__(self):
        self.service = LeadService()


    async def create(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.create(payload=payload, createdBy=user["_id"])
            return successResponse(201, f"{result.get("fullName")} query created successfully", result)


        except AppException as e:
            raise e
        
    async def get_all(self, request: Request):
        try:
            filters = request.query_params
            user_data = request.state.user
            
            result = await self.service.get_all(filters=filters, user=user_data)
            return successResponse(200, "Leads data fetched successfully", result)

        except AppException as e:
            raise e
        
    async def get_all_by_user(self, request: Request):
        try:
            filters = request.query_params
            user_data = request.state.user
            
            result = await self.service.get_all_by_user(filters=filters, user=user_data)
            return successResponse(200, "User leads data fetched successfully", result)

        except AppException as e:
            raise e
        
    async def get_won_leads(self, request: Request):
        try:
            user = request.state.user
            filters = request.query_params

            result = await self.service.get_won_leads(filters=filters ,user=user)
            return successResponse(200, "Leads data fetched successfully", result)

        except AppException as e:
            raise e
        
    async def get_by_id(self, request: Request, id: str):
        try:
            user = request.state.user
            result = await self.service.get_by_id(id=id, user=user)

            return successResponse(200, f"{result["lead_id"]} lead fetched successfully", result)
        

        except AppException as e:
            raise e
        
    async def update(self,request: Request, id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.update(leadId=id, payload=payload, user=user)
            return successResponse(200, f"lead updated successfully")

        except AppException as e:
            raise e

        
    async def delete(self, request: Request, id:str):
        try:

            user = request.state.user
            await self.service.delete(id, user)

            return successResponse(200, "Lead deleted successfully")
        
        
        except AppException as e:
            raise e 
        
