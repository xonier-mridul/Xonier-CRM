from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.repositories.event_repository import EventRepository
from fastapi.encoders import jsonable_encoder
from bson import ObjectId
from app.utils.validate_admin import validate_admin
from datetime import datetime, timezone

from beanie import PydanticObjectId
class EventService:
    def __init__(self):
        self.repo = EventRepository()


    async def create(self, payload:Dict[str, Any], user:Dict[str, Any]):
        try:
           is_exist = await self.repo.find_one({"title": payload["title"], "eventType": payload["eventType"], "start": payload["start"], "createdBy": user["_id"]})

           if is_exist:
               raise AppException("400", "This event is already exist, please create different title or date")
           
           new_payload = {
               **payload,
               "createdBy": user["_id"]
           }

           event = await self.repo.create(new_payload)
           if not event:
               raise AppException(400, "Event creation failed")

           return event.model_dump(mode="json")

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
    
    async def get_all(self):
        try:

            result = await self.repo.get_all_without_pagination(populate=["createdBy"])

            if not result:
                raise AppException(400, "Event data not found")
            
            return jsonable_encoder(result)



        except AppException as e:
            raise e
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
    async def update(self, id:str, user:Dict[str, Any], payload:Dict[str, Any])->bool:
        try:
            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid Event object id")
            
            print("err")
            is_admin = validate_admin(user["userRole"])
            is_creator = False

            event = await self.repo.find_by_id(id=PydanticObjectId(id), populate=["createdBy"])

            if not event:
                raise AppException(404, "Event not found against the event object Id")

            if str(event.createdBy.id) == id:
                is_creator = True

            if not is_admin and not is_creator:
                raise AppException(403, "Permission denied, you are not admin or creator")
            
            new_payload = {
                **payload,
                "updatedBy": user["_id"],
                "updatedAt": datetime.now(timezone.utc)
            }
             
            update = await self.repo.update(id=PydanticObjectId(id), data=new_payload)

            if not update:
                raise AppException(400, f"{payload["title"]} updation failed")
            
            return True


        
        except AppException as e:
            raise e
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
        

    async def delete(self,user: Dict[str, Any], eventId: str)->bool:
        try:
            if not ObjectId.is_valid(eventId):
                raise ValueError("Invalid Event object id")
            
            is_admin = False
            is_creator = False

            isExist = await self.repo.find_by_id(PydanticObjectId(eventId), populate=["createdBy"])

            if not isExist:
                raise AppException(404, "Event not found against this Id")
            
            isExist = isExist.model_dump(mode="json")
            
            if isExist["createdBy"]["id"] == user["_id"]:
                is_creator = True

            if not is_admin and not is_creator:
                raise AppException(403, "Permission denied, you are not authorized to perform this task")
            
            delete = await self.repo.delete_by_id(id=PydanticObjectId(eventId))

            if not delete:
                raise AppException(400, "Event deletion failed")
            
            return True


        except AppException as e:
            raise e
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")