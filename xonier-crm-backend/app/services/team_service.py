from app.utils.custom_exception import AppException
from beanie import PydanticObjectId
from typing import Dict, Any
from pymongo.errors import DuplicateKeyError

from app.repositories.team_repository import TeamRepository
from app.repositories.user_repository import UserRepository
from app.utils.slug_generator import generate_slug
from fastapi.encoders import jsonable_encoder
from app.db.db import Client
from app.core.constants import MANGER_CODE
from bson import DBRef, ObjectId

class TeamService:
    def __init__(self):
        self.repo = TeamRepository()
        self.userRepo = UserRepository()
        self.client = Client


    async def get_all(self, page: int = 1, limit:int = 10, filters: Dict[str, Any] = {}):
        try:
            query = {}
            
            if "name" in filters:
                query.update({"name": filters["name"]})

            if "slug" in filters:
                query.update({"slug": filters["slug"]})

            if "active" in filters:
                query.update({"isActive": filters["active"]})

            result = await self.repo.get_all(page, limit, query,["members", "category", "createdBy", "manager"], None, ["-createdAt"])

            if not result:
                raise AppException(400, "Failed to fetch teams data")

            
            return jsonable_encoder(result)


        except AppException:
            raise 

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")


    async def create(self, payload: Dict[str, Any], createdBy:PydanticObjectId):
        async with await self.client.start_session() as session:
          async with session.start_transaction():
            try:

                slug = generate_slug(payload["name"])
                
                is_exist = await self.repo.find_by_slug(slug, None, session)

                if is_exist:
                    raise AppException(400, "team exist, please use different name")
                
                new_payload: Dict[str, Any] = {
                    **payload,
                    "slug": slug,
                    "createdBy": createdBy
                }

                rr = any(item in payload["members"] for item in payload["manager"])

                if rr:
                    raise AppException(400, "Manager user also selected in members list, please remove it")

                team = await self.repo.create(new_payload, session)

                if not team:
                    raise AppException(400, "Team creation failed")
                
                return jsonable_encoder(team)
            

            except AppException:
                raise

            except Exception as e:
                    raise AppException(status_code=500, message="internal server error")

    
    async def get_by_id(self, id: PydanticObjectId):
        try:
           result = await self.repo.find_by_id(id, ["members", "category", "manager", "createdBy"])

           if not result:
               raise AppException(404, "Team not found")
           
           return result.model_dump(mode="json")


        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")


    async def update(self, id: str, payload: Dict[str, Any], updatedBy: PydanticObjectId) -> bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    is_exist = await self.repo.find_by_id(id=PydanticObjectId(id), session=session)
 
                    if not is_exist:
                        raise AppException(404, "Team not found")
 
                    managers = payload.get("manager", [])
                    members = payload.get("members", [])
 
                    for manager_id in managers:
                        if not ObjectId.is_valid(manager_id):
                            raise AppException(400, f"Invalid manager ObjectId: {manager_id}")
 
                    for member_id in members:
                        if not ObjectId.is_valid(member_id):
                            raise AppException(400, f"Invalid member ObjectId: {member_id}")
 
                    rr = any(item in members for item in managers)
 
                    if rr:
                        raise AppException(400, "Manager user also selected in members list, please remove it")
 
                    manager_dbrefs = [
                        DBRef(collection="users", id=ObjectId(manager_id))
                        for manager_id in managers
                    ]
 
                    member_dbrefs = [
                        DBRef(collection="users", id=ObjectId(member_id))
                        for member_id in members
                    ]
 
                    slug = generate_slug(payload["name"])
 
                    updated_payload = {
                        **payload,
                        "slug": slug,
                        "manager": manager_dbrefs,
                        "members": member_dbrefs,
                        "updatedBy": updatedBy,
                    }
 
                    update = await self.repo.update(id=PydanticObjectId(id), data=updated_payload, session=session)
 
                    if not update:
                        raise AppException(400, "Team not updated")
 
                    return True
 
                except AppException:
                    raise
 
                except DuplicateKeyError:
                    raise AppException(
                        status_code=409,
                        message="Team with this name already exists"
                    )
 
                except Exception as e:
                    raise AppException(status_code=500, message=f"internal server error: {e}")
 


    
    async def delete(self, id: str)->bool:
        try:
            is_exist = await self.repo.find_by_id(PydanticObjectId(id))

            if not is_exist:
                raise AppException(404, "Team not found related this id")

            result = await self.repo.delete_by_id(PydanticObjectId(id))

            if not result:
                raise AppException(400, "Team deletion failed")
            
            return True
        
        except AppException:
            raise

        except Exception as e:
                    raise AppException(status_code=500, message=f"internal server error: {e}")