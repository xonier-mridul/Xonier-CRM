
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.get_team_members import GetTeamMembers
from app.utils.validate_admin import validate_admin
from app.repositories.note_repository import NoteRepository
from app.core.enums import NOTE_VISIBILITY, NOTE_STATUS, NOTES_ENTITIES
from fastapi.encoders import jsonable_encoder
from bson import ObjectId
from beanie import PydanticObjectId
from app.utils.cache_key_generator import cache_key_generator, cache_key_generator_by_id, cache_key_generator_with_id
from fastapi_cache import FastAPICache
from app.core.constants import NOTE_CACHE_NAMESPACE, NOTE_PRIVATE_CACHE_NAMESPACE
import json
from datetime import datetime, timezone

class NoteService:
    def __init__(self):
        self.getTemMember = GetTeamMembers()
        self.noteRepo = NoteRepository()


    async def create(self, payload: Dict[str, Any], user: Dict[str, Any]):
        try:

            is_admin:bool = validate_admin(user["userRole"])

            is_exist = await self.noteRepo.find_one({"title": payload["title"], "entityType": payload["entityType"], "entityId": payload["entityId"]})


            if is_exist:
                raise AppException(400, "Note is exist with this title, entity and entity Id, please use different title, entity or entity Id")
            
            new_payload ={
                **payload,
                "createdBy": user["_id"],
                "byAdmin": True if is_admin else False
            }
            
            result = await self.noteRepo.create(data=new_payload)

            if not result:
                raise AppException(400, "Note creation failed")
            

            await FastAPICache.get_backend().clear(namespace=NOTE_CACHE_NAMESPACE)
            await FastAPICache.get_backend().clear(namespace=NOTE_PRIVATE_CACHE_NAMESPACE)

            
            return result.model_dump(mode="json")


        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def get_all_active(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = int(filters.get("page") or 1)
            limit = int(filters.get("limit") or 10)

            is_admin: bool = validate_admin(user["userRole"])

            query = {
                "status": NOTE_STATUS.ACTIVE.value
            }

            visibility_conditions = []

            if is_admin:
               
                visibility_conditions = [
                    {"visibility": NOTE_VISIBILITY.PUBLIC.value},
                    {
                        "$and": [
                            {"visibility": NOTE_VISIBILITY.PRIVATE.value},
                            {"createdBy.$id": user["_id"]}
                        ]
                    }
                ]

            else:
                members = await self.getTemMember.get_team_members(user["_id"])

                visibility_conditions = [
                    {"createdBy.$id": user["_id"]},
                    {"visibility": NOTE_VISIBILITY.PUBLIC.value},
                    {
                        "$and": [
                            {"visibility": NOTE_VISIBILITY.TEAM.value},
                            {"createdBy.$id": {"$in": members}} if members else {}
                        ]
                    }
                ]


            query["$or"] = visibility_conditions


            if "pinned" in filters:
                query["isPinned"] = filters["pinned"]

            if "entityType" in filters:
                query["entityType"] = filters["entityType"]

            if "entityId" in filters:
                query["entityId"] = filters["entityId"]


            cache_key = cache_key_generator_with_id(prefix=NOTE_CACHE_NAMESPACE, filters=query, page=int(page), limit=int(limit), userId=user["_id"])

            cache = await FastAPICache.get_backend().get(cache_key)

            if cache:
                print("going")
                return json.loads(cache)
            


            result = await self.noteRepo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["createdBy"]
            )

            if not result:
                raise AppException(404, "Notes data not found")
            
            result = jsonable_encoder(result)

            await FastAPICache.get_backend().set(key=cache_key, value=json.dumps(result), expire=360)

            return result

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def get_private_notes_by_creator(
    self,
    filters: Dict[str, Any],
    user: Dict[str, Any]
    ):
        try:
            page = int(filters.get("page") or 1)
            limit = int(filters.get("limit") or 10)

            print("one")
            query = {
                "status": NOTE_STATUS.ACTIVE.value,
                "visibility": NOTE_VISIBILITY.PRIVATE.value,
                "createdBy.$id": PydanticObjectId(user["_id"]),
            }


            if "entityType" in filters:
                query["entityType"] = filters["entityType"]

            if "entityId" in filters:
                query["entityId"] = filters["entityId"]

            if "pinned" in filters:
                query["isPinned"] = filters["pinned"]

            cache_query = {
                k: (
                    str(v)
                    if isinstance(v, PydanticObjectId)
                    else (
                        [
                            str(item) if isinstance(item, PydanticObjectId) else item
                            for item in v
                        ]
                        if isinstance(v, list)
                        else (
                            {
                                nk: (
                                    [
                                        str(i) if isinstance(i, PydanticObjectId) else i
                                        for i in nv
                                    ]
                                    if isinstance(nv, list)
                                    else (
                                        str(nv)
                                        if isinstance(nv, PydanticObjectId)
                                        else nv
                                    )
                                )
                                for nk, nv in v.items()
                            }
                            if isinstance(v, dict)
                            else v
                        )
                    )
                )
                for k, v in query.items()
            }

            cache_key = cache_key_generator_with_id(prefix=NOTE_PRIVATE_CACHE_NAMESPACE, filters=cache_query, page=int(page), limit=int(limit), userId=user["_id"])
           
            cache = await FastAPICache.get_backend().get(key=cache_key)

            if cache:
                return json.loads(cache)
            
            result = await self.noteRepo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["createdBy"]
            )



            if not result:
                raise AppException(404, "Private notes not found")
            
            result = jsonable_encoder(result)
            
            await FastAPICache.get_backend().set(key=cache_key, value=json.dumps(result), expire=360)
         
            return result

        except AppException as e:
            
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

        

    async def update_pinned_status(self, id:str, user: Dict[str, Any]):
        try:

            if not ObjectId.is_valid(id):
               raise AppException(400, "Invalid note object id")
            
            is_admin: bool = validate_admin(user["userRole"])
            is_creator: bool = False
            
            note = await self.noteRepo.find_by_id(id=PydanticObjectId(id), populate=["createdBy"])

            if not note:
                raise AppException(404, "Note not found against the Id")
            

            if note.createdBy == user["_id"]:
                is_creator = True

            if not is_admin and not is_creator:
                raise AppException(403, "Permission denied")


            note.isPinned = False if note.isPinned else True

            await note.save()

            await FastAPICache.get_backend().clear(namespace=NOTE_CACHE_NAMESPACE)
            await FastAPICache.get_backend().clear(namespace=NOTE_PRIVATE_CACHE_NAMESPACE)

            return note.model_dump(mode="json")
        
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def soft_delete(self, id:str, user: Dict[str, Any])->bool:
        try:
            if not ObjectId.is_valid(id):
               raise AppException(400, "Invalid note object id")
            
            is_admin: bool = validate_admin(user["userRole"])
            is_creator: bool = False


            note = await self.noteRepo.find_by_id(id=PydanticObjectId(id), populate=["createdBy"])
            if not note:
                raise AppException(404, "Note not found against the Id")
            
            if note.createdBy == user["_id"]:
                is_creator = True

            if not is_admin and not is_creator:
                raise AppException(403, "Permission denied")
            
            if note.status == NOTE_STATUS.DELETE:
                raise AppException(400, "Not already deleted")
            

            new_payload = {
                "status": NOTE_STATUS.DELETE,
                "deletedAt": datetime.now(timezone.utc)
            }
            

            soft_delete = await self.noteRepo.update(id=PydanticObjectId(id), data=new_payload)

            if not soft_delete:
                raise AppException(400, "Note deletion failed")
            
            return True



        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

        


