
from fastapi import Request
from typing import Dict, Any
from app.utils.custom_exception import AppException

from app.utils.custom_response import successResponse
from app.services.custom_form_field_service import CustomFormFieldService


class CustomFormFieldController:
    def __init__(self):
        self.service = CustomFormFieldService()

    async def create(self, request:Request, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.create(user=user, payload=payload)

            return successResponse(status_code=200, message=f"{payload["name"]} field created successfully", data=result)



        except AppException as e:
            raise e
        

    async def get_all_by_creator(self, request:Request):
        try:
            user = request.state.user

            result = await self.service.get_all_by_creator(user=user)

            return successResponse(status_code=200, message=f" field fetched successfully", data=result)




        except AppException as e:
            raise e
        

    async def delete(self, request:Request, id:str):
        try:
            user = request.state.user

            await self.service.delete(user=user, id=id)

            return successResponse(status_code=200, message=f" field delete successfully")


        except AppException as e:
            raise e



        

