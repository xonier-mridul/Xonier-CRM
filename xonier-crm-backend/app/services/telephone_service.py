
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.repositories.telephone_repository import TelephoneRepository
from app.repositories.user_repository import UserRepository
from pymongo.errors import DuplicateKeyError
from app.core.enums import PHONE_NUMBER_STATUS
from fastapi.encoders import jsonable_encoder
import re
from bson import ObjectId, DBRef
from beanie import PydanticObjectId
from app.core.enums import PHONE_NUMBER_STATUS
from datetime import datetime, timezone

class TelephoneService:
    def __init__(self):
        self.repository = TelephoneRepository()
        self.userRepo = UserRepository()

    async def register(self, payload: Dict[str, Any], user:Dict[str, Any]):
        try:

            payload ={ 
                **payload,
                "createdBy": user["_id"]
            }

            result = await self.repository.create(payload)

            if not result:
                raise AppException(400, "Telephone creation failed")
            
            return result.model_dump(mode="json")



        except AppException as e:
            raise e
        
        except DuplicateKeyError as e:
                    raise AppException(status_code=409, message=f"telephone number already exist {e}")

        
        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error: {e}")
        

    async def get_all_active(self, filters:Dict[str, Any]):
        try:
            page= filters.get("page") or 1
            limit = filters.get("limit") or 10

            query = {"$or": [{"status": PHONE_NUMBER_STATUS.ACTIVE.value}, {"status": PHONE_NUMBER_STATUS.INACTIVE.value}]}

            if "number" in filters:
                number = re.escape(str(filters["number"]))
                query.update({"phoneNumber": {"$regex": number, "$options": "i"}})


            result = await self.repository.get_all(page=int(page), limit=int(limit), filters=query, populate=["createdBy"], sort=["-createdAt"])

            if not result:
                 raise AppException(404, "Active phone numbers not found")
            

            return jsonable_encoder(result)

            

                  
             
        except AppException as e:
            raise e

        
        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error: {e}")
              
         
    async def update_status(self, id:str, payload: Dict[str, Any], user: Dict[str, Any])->bool:
        try:
             
            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid telephone object id")
            
            lead = await self.repository.find_by_id(id=PydanticObjectId(id))

            if not lead:
                raise AppException(404, "Telephone number not found against id")

            if lead.status == PHONE_NUMBER_STATUS.DELETED.value:
                raise AppException(400, "Operation denied, Telephone number is deleted")
            
            lead.status = payload["status"]
            lead.updatedAt = datetime.now(timezone.utc)
            # lead.updatedBy = DBRef(collection="telephones", id=PydanticObjectId(user["_id"]))

            await lead.save()

            return lead.model_dump(mode="json")


        except AppException as e:
            raise e

        
        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error: {e}")
              


    async def soft_delete(self, id:str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid telephone object id")
            
            number = await self.repository.find_by_id(id=PydanticObjectId(id))

            if not number:
                raise AppException(404, "Telephone number not found against id")
            
            print("number: ", number.status, PHONE_NUMBER_STATUS.DELETED)
            if number.status == PHONE_NUMBER_STATUS.DELETED.value:
                raise AppException(400, "Operation denied, Telephone number already deleted")
            
            is_exist = await self.userRepo.find_user_with_phone(phoneId=str(number.id), populate=["assignedPhoneNumber"])

            if is_exist:
                raise AppException(400, "Number is already used by users, please remove it from users, deletion failed")
            
            payload = {"status": PHONE_NUMBER_STATUS.DELETED.value, "deletedAt": datetime.now(timezone.utc), "deletedBy": user["_id"]}
            update = await self.repository.update(id=PydanticObjectId(id), data=payload)

            if not update:
                raise AppException(400, "Phone number deletion failed")
            
            return number.model_dump(mode="json")


        except AppException as e:
            raise e

        
        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error: {e}")

        
              

