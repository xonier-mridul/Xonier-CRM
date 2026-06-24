from typing import Dict, Any, List
from app.utils.custom_exception import AppException
from app.repositories.event_repository import EventRepository
from fastapi.encoders import jsonable_encoder
from bson import ObjectId
from app.utils.validate_admin import validate_admin
from datetime import datetime, timezone
from app.core.enums import ACTIVITY_ENTITY_TYPE, ACTIVITY_ACTION
from app.repositories.activity_repository import ActivityRepository
from app.utils.activity_payload import activity_payload
from app.db.db import Client
from app.schemas.project.calender_project import CALENDER_LOOKUPS, CALENDER_PROJECT


from beanie import PydanticObjectId
class EventService:
    def __init__(self):
        self.repo = EventRepository()
        self.activityRepo = ActivityRepository()
        self.client = Client


    async def create(self, payload:Dict[str, Any], user:Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    is_exist = await self.repo.find_one({"title": payload["title"], "eventType": payload["eventType"], "start": payload["start"], "createdBy": user["_id"]})

                    if is_exist:
                        raise AppException("400", "This event is already exist, please create different title or date")
                    
                    new_payload = {
                        **payload,
                        "createdBy": user["_id"]
                    }

                    event = await self.repo.create(new_payload, session)
                    if not event:
                        raise AppException(400, "Event creation failed")
                    
                    activities_payload = activity_payload(userId=PydanticObjectId(user["_id"]), entityType=ACTIVITY_ENTITY_TYPE.EVENT, entityId=PydanticObjectId(event.id), action=ACTIVITY_ACTION.CREATED, title="Create Event", metadata={"title": event.title, "eventType": event.eventType, "start": event.start, "isAllDay": event.isAllDay, "priority": event.priority})

                    await self.activityRepo.create(activities_payload, session)

                    return event.model_dump(mode="json")

                except AppException as e:
                    raise e

                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
        

    async def bulk_create(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    created_events = []
                    duplicate_events = []
                    failed_events = []

                    events = payload.get("events", [])

                    if not events:
                        raise AppException(422, "Events field cannot be empty")

                    existing_filters = [
                        {
                            "title": item["title"],
                            "eventType": item["eventType"],
                            "start": item["start"],
                            "createdBy.$id": ObjectId(user["_id"])
                        }
                        for item in events
                    ]

                    existing_records = await self.repo.find_many({"$or": existing_filters})

                    existing_set = {
                        (doc.title, doc.eventType, doc.start.isoformat())
                        for doc in existing_records
                    }

                    to_insert = []

                    for item in events:
                        start = item["start"]
                        key = (item["title"], item["eventType"], start.isoformat() if isinstance(start, datetime) else start)

                        if key in existing_set:
                            duplicate_events.append({
                                "title": item["title"],
                                "eventType": item["eventType"],
                                "start": item["start"],
                                "reason": "Event already exists with same title, type and start date"
                            })
                            continue

                        to_insert.append({
                            **item,
                            "createdBy": PydanticObjectId(user["_id"])
                        })

                    if to_insert:
                        try:
                            inserted_ids = await self.repo.bulk_create(docs=to_insert, session=session)
                            created_events = [str(id) for id in inserted_ids]
                        except Exception as e:
                            failed_events = [
                                {"title": item.get("title"), "reason": str(e)}
                                for item in to_insert
                            ]

                    if created_events:
                        activity = activity_payload(
                            userId=PydanticObjectId(user["_id"]),
                            entityType=ACTIVITY_ENTITY_TYPE.EVENT,
                            action=ACTIVITY_ACTION.CREATED,
                            title="Bulk create events",
                            perform=len(created_events),
                            metadata={
                                "totalInserted": len(created_events),
                                "totalDuplicated": len(duplicate_events),
                                "totalFailed": len(failed_events)
                            }
                        )
                        await self.activityRepo.create(data=activity, session=session)

                    return {
                        "inserted": len(created_events),
                        "duplicates": len(duplicate_events),
                        "failed": len(failed_events),
                        "duplicateRecords": duplicate_events,
                        "failedRecords": failed_events
                    }

                except AppException:
                    raise

                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                
                
    
    async def get_all(self):
        try:
            
            result = await self.repo.get_all_with_lookup(page=1, limit=1100, lookups=CALENDER_LOOKUPS, project=CALENDER_PROJECT)

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
            
            
            is_admin = validate_admin(user["userRole"])
            is_creator = False

            event = await self.repo.find_by_id(id=PydanticObjectId(id), populate=["createdBy"])

            if not event:
                raise AppException(404, "Event not found against the event object Id")

            if str(event.createdBy.id) == user["_id"]:
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