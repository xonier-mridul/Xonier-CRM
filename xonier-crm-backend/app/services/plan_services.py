from typing import Dict, Any
from app.db.db import Client
from app.utils.custom_exception import AppException
from app.repositories.plan_repository import PlanRepository
from app.repositories.activity_repository import ActivityRepository
from app.utils.activity_payload import activity_payload
from beanie import PydanticObjectId
from app.core.enums import ACTIVITY_ENTITY_TYPE, ACTIVITY_ACTION, PLAN_STATUS
from pymongo.errors import DuplicateKeyError
from fastapi_cache import FastAPICache
from bson import ObjectId, DBRef
from datetime import datetime, timezone
from app.db.models.user_model import UserModel
from app.core.tenant import system_query


class PlanService:
    def __init__(self):
        self.client = Client
        self.repo = PlanRepository()
        self.activityRepo = ActivityRepository()



    async def _plan_is_valid(self, id:str):
        plan = await self.repo.find_by_id(PydanticObjectId(id), ["createdBy"])

        if not plan:
            raise AppException(404, "Plan data not found")
                    
        if plan.status == PLAN_STATUS.DELETED.value:
            raise AppException(400, "Plan is deleted")
        
        return plan


    async def create(self, payload: Dict[str, Any], user:Dict[str,Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    is_exist = await self.repo.find({"name": payload["name"]})
                    if is_exist:
                        raise AppException(400, "Plan already exist, please choose different name")
                    
                    new_paylaod = {
                        **payload,
                        "createdBy": user["_id"],
                    }
                    
                    create = await self.repo.create(data=new_paylaod, session=session)
                    if not create:
                        raise AppException(400, "Plan creation failed")
                    
                    result = create.model_dump(mode="json")
                    
                    activity_data = activity_payload(userId=PydanticObjectId(user["_id"]), action=ACTIVITY_ACTION.CREATED.value, entityType=ACTIVITY_ENTITY_TYPE.PLAN.value, title=f"{payload["name"]} plan create", entityId=PydanticObjectId(result["id"]), metadata={"plan name": result["name"], "price": {**result["price"]}, "currency": result["currency"], "features": [*result["features"]]} )

                    await self.activityRepo.create(data=activity_data, session=session)

                    return result
                    


                except AppException as e:
                    raise e
                
                except DuplicateKeyError as e:
                    raise AppException(400, "Plan already exist")
                

                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
        

    async def getAll(self, filters: Dict[str, Any]):
        try:
            page: int = int(filters.get("page", 1) or 1)
            limit: int = int(filters.get("limit", 10) or 10)

            query = {"status": PLAN_STATUS.ACTIVE}

            if "search" in filters and filters.get("search", "").strip():
                regex_data = {"$regex": filters["search"].strip(), "$options": "i"}
                query.update({
                    "$or": [
                        {"name": regex_data},
                        {"description": regex_data},
                    ]
                })

           
            if "status" in filters and filters["status"]:
                query["status"] = filters["status"]

            
            if "visibility" in filters and filters["visibility"]:
                query["visibility"] = filters["visibility"]

            
            if "currency" in filters and filters["currency"]:
                query["currency"] = filters["currency"]

            

            result = await self.repo.get_all_nested(
                page=page,
                limit=limit,
                filters=query,
                populate=["createdBy", "features.feature"],
                sort=["-createdAt"],
            )

            return result

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def getById(self, id: str, user: Dict[str, Any]):
        try:
            
            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid plan object id")
            
            plan = await self.repo.find_by_id(PydanticObjectId(id), ["createdBy"])

            if not plan:
                raise AppException(404, "Plan data not found")
            
            if plan.status == PLAN_STATUS.DELETED.value:
                raise AppException(400, "Plan is deleted")
            
            if plan.features:
                for plan_feature in plan.features:
                    
                    if plan_feature.feature and hasattr(plan_feature.feature, "fetch"):
                        plan_feature.feature = await plan_feature.feature.fetch()
            
            
            
            return plan.model_dump(mode="json")



        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        


    async def update(self, id:str, payload:Dict[str, Any], user: Dict[str,Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(id):
                        raise AppException(400, "Invalid plan object id")
                    
                    with system_query():
                        plan = await self.repo.find_by_id(PydanticObjectId(id), ["createdBy"])

                    if not plan:
                        raise AppException(404, "Plan data not found")
                    
                    if plan.status == PLAN_STATUS.DELETED.value:
                        raise AppException(400, "Plan is deleted")
                    
   
                    new_payload = {
                        **payload,
                        "updatedAt": datetime.now(timezone.utc)
                    }
                    with system_query():
                        await self.repo.update(id=PydanticObjectId(id), data=new_payload, session=session)

                    
                    pp =  activity_payload(PydanticObjectId(user["_id"]), entityType=ACTIVITY_ENTITY_TYPE.PLAN.value, action=ACTIVITY_ACTION.UPDATED, title="Update plan", entityId=PydanticObjectId(plan.id), metadata={**payload})

                    with system_query():
                        await self.activityRepo.create(data=pp, session=session)

                    return True


                except AppException as e:
                    raise e
                
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                
    
    async def delete(self, id: str, user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(id):
                        raise AppException(400, "Invalid plan object id")

                    plan = await self._plan_is_valid(id=id)

                    user_doc = await UserModel.get(PydanticObjectId(user["_id"]), session=session)
                    if not user_doc:
                        raise AppException(404, "User not found")

                    plan.deletedAt = datetime.now(timezone.utc)
                    plan.deletedBy = user_doc
                    plan.status = PLAN_STATUS.DELETED.value

                    await plan.save(session=session)

                    plan_dict = plan.model_dump(mode="json")

                    pp = activity_payload(
                        PydanticObjectId(user["_id"]),
                        entityType=ACTIVITY_ENTITY_TYPE.PLAN.value,
                        action=ACTIVITY_ACTION.DELETE.value,
                        title="Delete plan",
                        entityId=PydanticObjectId(plan_dict["id"]),
                        metadata={
                            "plan name": plan_dict["name"],
                            "price": {**plan_dict["price"]},
                            "discount": plan_dict.get("discount"),
                            "currency": plan_dict["currency"],
                        }
                    )

                    await self.activityRepo.create(data=pp, session=session)

                    return plan_dict

                except AppException as e:
                    raise e

                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")