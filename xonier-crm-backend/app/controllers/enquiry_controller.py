from fastapi import Request
from app.services.enquiry_service import EnquiryService
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.schemas.enquiry_schema import EnquiryRegisterSchema
from beanie import PydanticObjectId
from typing import Dict, Any, List


class EnquiryController:
    def __init__(self):
        self.service = EnquiryService()

    
    async def get_all(self, request: Request):
        try:
            filters = request.query_params

            result = await self.service.get_all(int(filters["page"]), int(filters["limit"]), filters={**filters})

            return successResponse(status_code=200, message="All enquiries fetched successfully", data=result)

        except AppException as e:
            raise e
        
    async def get_by_id(self, request: Request, id: str):
        try:
            result = await self.service.get_by_id(PydanticObjectId(id))

            return successResponse(status_code=200, message="Inquiry get successfully", data=result)

        except AppException as e:
            raise e
      
    async def create(self, request: Request, payload: Dict[str, Any]):

        try:
           user = request.state.user

           result = await self.service.create(PydanticObjectId(user["_id"]), payload)

           return successResponse(201, "Enquiry created successfully", result)

        except AppException as e:
            raise e
        
    async def bulk_create(self, request: Request, payload: Dict[str, Any]):

        try:
           user = request.state.user

           print("paylaod : ", payload)

           result = await self.service.bulk_create(PydanticObjectId(user["_id"]), payload)

           return successResponse(201, "Bulk enquiry created successfully", result)

        except AppException as e:
            raise e
        
    
    async def update(self, request: Request, id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.update(PydanticObjectId(user["_id"]), PydanticObjectId(id), payload)
            return successResponse(201, "Enquiry updated successfully")


        except AppException as e:
            raise e
            
    
        

    async def delete(self, request:Request, id: str):
        try:
            user = request.state.user

            result = await self.service.delete(PydanticObjectId(id))

            return successResponse(200, "Enquiry deleted successfully")

        except AppException as e:
            raise e
