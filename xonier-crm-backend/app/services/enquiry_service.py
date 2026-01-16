
from app.repositories.enquiry_repository import EnquiryRepository
from typing import Dict,Any, List
from beanie import PydanticObjectId
from app.utils.custom_exception import AppException
from app.db.db import Client
from app.utils.enquiry_id_generator import generate_enquiry_id
from fastapi.encoders import jsonable_encoder
from app.schemas.enquiry_schema import EnquiryRegisterSchema
from pydantic import ValidationError
from pymongo.errors import BulkWriteError

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

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message="internal server error")

        finally:
            await session.end_session()

    async def bulk_create(self, createdBy: PydanticObjectId, payload: Dict[str, Any]):
        enquiries = payload.get("enquiries")

        if not enquiries or not isinstance(enquiries, list):
            raise AppException(400, "Invalid bulk enquiry payload")

        valid_docs: List[Dict[str, Any]] = []
        failed_rows: List[Dict[str, Any]] = []

        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    for index, row in enumerate(enquiries):
                        try:
                           
                            validated = EnquiryRegisterSchema(**row)

                            enquiry_id = generate_enquiry_id()
                            
                            is_exist = await self.repo.find_one(
                                {
                                    "fullName": validated.fullName,
                                    "email": validated.email,
                                    "projectType": validated.projectType,
                                },
                                session=session,
                            )

                            if is_exist:
                                failed_rows.append({
                                    "row": index + 1,
                                    "error": "Duplicate enquiry",
                                    "data": row,
                                })
                                continue

                            valid_docs.append({
                                **validated.model_dump(),
                                "createdBy": createdBy,
                                "enquiry_id": enquiry_id,
                            })

                        except ValidationError as ve:
                            failed_rows.append({
                                "row": index + 1,
                                "error": ve.errors(),
                                "data": row,
                            })

                   
                    if not valid_docs:
                        raise AppException(
                            400,
                            "No valid enquiries found in bulk upload, already exist"
                        )
           
                    result = await self.repo.bulk_create(valid_docs, session=session)


                    return {
                        "insertedCount": len(valid_docs),
                        "failedCount": len(failed_rows),
                        "failedRows": failed_rows,
                    }

                except AppException:
                    raise

                except BulkWriteError as bwe:
                    raise AppException(
                        400,
                        "Bulk insert failed due to duplicate or invalid data"
                    )

                except Exception as e:
                    raise AppException(500, "Internal server error")

                


    async def get_by_id(self, id: PydanticObjectId):
        try:

            result = await self.repo.find_by_id(id, ["createdBy", "assignTo"])

            if not result:
                raise AppException(400, "Enquiry not found")
            
            return result.model_dump(mode="json")


        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    
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

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def update(self, updatedBy: PydanticObjectId, id:PydanticObjectId, payload: Dict[str, Any])->bool:
        session = await self.client.start_session()
        try:
            session.start_transaction()

            is_exist = await self.repo.find_by_id(id, None, session=session)

            if not is_exist:
                raise AppException(404, "Enquiry not found")
            
            newPayload: Dict[str, Any] = {
                **payload,
                "updatedBy": updatedBy
            }

            print("payload: ", payload)
            
            update = await self.repo.update(id=id,data=newPayload, session=session)


            if not update:
                raise AppException(400, "Enquiry update failed")
            
            await session.commit_transaction()
            
            return True

        except AppException:
            
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message="internal server error")

        finally:
            await session.end_session()


    async def delete(self, id: PydanticObjectId)->bool:
        try:
            result = await self.repo.delete_by_id(id)

            if not result:
                raise AppException(400, "Enquiry not delete")
            
            return True


        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")