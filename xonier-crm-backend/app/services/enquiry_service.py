
from app.repositories.enquiry_repository import EnquiryRepository
from typing import Dict,Any
from beanie import PydanticObjectId
from app.utils.custom_exception import AppException
from app.db.db import Client
from app.utils.enquiry_id_generator import generate_enquiry_id
from fastapi.encoders import jsonable_encoder

class EnquiryService:
    def __init__(self):
        self.repo = EnquiryRepository()
        self.client = Client

    async def create(self, createdBy: PydanticObjectId,  payload: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()

            enquiry_id:str = generate_enquiry_id()

            is_exist = await self.repo.find_by_enquiry_id(enquiry_id, None, None, session=session)

            is_enquiry_exist = await self.repo.find_one({"fullName": payload["fullName"], "email": payload["email"], "projectType": payload["projectType"]}, None, None, session=session)

            if is_exist or is_enquiry_exist:
                raise AppException(400, "Enquiry already exist")

            new_payload = {
                **payload, "createdBy" : createdBy, "enquiry_id": enquiry_id
            }

            new_enquiry = await self.repo.create(data=new_payload, session=session)

            if not new_enquiry:
                raise AppException(400, "Enquiry creation failed")
            
            await session.commit_transaction()

            return new_enquiry.model_dump(mode="json")


        except AppException:
            await session.abort_transaction()
            raise 

        finally:
            await session.end_session()


    async def get_by_id(self, id: PydanticObjectId):
        try:

            result = await self.repo.find_by_id(id, ["createdBy", "assignTo"])

            if not result:
                raise AppException(400, "Enquiry not found")
            
            return result.model_dump(mode="json")


        except AppException:
            raise

    
    async def get_all(self, page:int = 1, limit: int = 10, filters: Dict[str, Any] = {}):
        try:
           
            query = {}

            if "enquiry_id" in filters:
               query.update("enquiry_id", filters["enquiry_id"])

            if "fullName" in filters:
                query.update("fullName", filters["fullName"])

            if "email" in filters:
                query.update("email", filters["email"])

            if "phone" in filters:
                query.update("phone", filters["phone"])

            if "companyName" in filters:
                query.update("companyName", filters["companyName"])

            if "projectType" in filters:
                query.update("projectType", filters["projectType"])

            if "priority" in filters:
                query.update("priority", filters["priority"])

            result = await self.repo.get_all(page, limit, query, ["assignTo", "createdBy"])

            if not result:
                raise AppException(404, "Enquiry data not found")
            
            return jsonable_encoder(result, exclude={"password"})
        
        except AppException:
            raise


    async def delete(self, id: PydanticObjectId)->bool:
        try:
            result = await self.repo.delete_by_id(id)

            if not result:
                raise AppException(400, "Enquiry not delete")
            
            return True


        except AppException:
            raise