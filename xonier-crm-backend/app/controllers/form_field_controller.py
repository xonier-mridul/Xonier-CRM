
from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.form_field_service import FormFieldService

class FormFieldController:
    def __init__(self):
        self.service = FormFieldService()

    async def get_all(self,request: Request):
        try:
            user = request.state.user

            result = await self.service.get_all()
            
            return successResponse(status_code=200, message="Form fields fetched successfully", data=result)


        except AppException as e:
            raise e
        

    async def get_leads_fields(self, request: Request):
        try:
            user = request.state.user

            result = await self.service.get_leads_fields()
            
            return successResponse(status_code=200, message="Form fields fetched successfully", data=result)

        except AppException as e:
            raise e
        

    async def get_deals_fields(self, request: Request):
        try:
            user = request.state.user

            result = await self.service.get_deal_fields()
            
            return successResponse(status_code=200, message="Form fields fetched successfully", data=result)

        except AppException as e:
            raise e