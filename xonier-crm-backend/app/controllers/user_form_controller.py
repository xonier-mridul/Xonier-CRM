from fastapi import Request
from app.utils.custom_response import successResponse
from app.utils.custom_exception import AppException
from typing import Dict, Any
from app.services.user_form_service import UserFormService

class UserFormController:
    def __init__(self):
        self.service = UserFormService()

    async def create(self, request: Request, payload: Dict[str, Any] ):
        try:
           user = request.state.user
           
           result = await self.service.create(payload=payload, userId=user["_id"])

           return successResponse(status_code=201, message="Form field created successfully", data=result)

        except AppException as e:
            raise e
        
    
    async def get_lead_by_user_id(self, request: Request):
        try:
           user = request.state.user
           
           result = await self.service.get_lead_by_user_id(user["_id"])
           return successResponse(status_code=200, message="form fields fetched successfully", data=result)
        except AppException as e:
            raise e
        
    async def get_deal_by_user_id(self, request: Request):
        try:
           user = request.state.user
           
           result = await self.service.get_deal_by_user_id(user["_id"])
           return successResponse(status_code=200, message="form fields fetched successfully", data=result)
        except AppException as e:
            raise e
        

    async def update(self, request: Request, id:str, payload: Dict[str, Any]):
        try:
           
           user = request.state.user
           await self.service.update(user["_id"], id, payload)

           return successResponse(status_code=200, message="Form field updated successfully")

        except AppException as e:
            raise e