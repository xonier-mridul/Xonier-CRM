
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.repositories.telephone_repository import TelephoneRepository
from pymongo.errors import DuplicateKeyError
from app.core.enums import PHONE_NUMBER_STATUS
from fastapi.encoders import jsonable_encoder
import re

class TelephoneService:
    def __init__(self):
        self.repository = TelephoneRepository()

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

            query = {"status": PHONE_NUMBER_STATUS.ACTIVE}

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
              
         
              

