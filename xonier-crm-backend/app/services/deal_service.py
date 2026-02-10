from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.repositories.deal_repository import DealRepository
from app.utils.enquiry_id_generator import generate_enquiry_id
from beanie import PydanticObjectId
from pymongo.errors import DuplicateKeyError
from fastapi.encoders import jsonable_encoder
from bson import ObjectId
from app.core.constants import SUPER_ADMIN_CODE, DEAL_CACHE_NAMESPACE, DEAL_CACHE_NAMESPACE_BY_ID, LEAD_CACHE_NAMESPACE
from app.db.db import Client
from app.repositories.lead_repository import LeadRepository
from app.core.crypto import Encryption
from app.utils.cache_key_generator import cache_key_generator, cache_key_generator_by_id, cache_key_generator_with_id
from fastapi_cache import FastAPICache
import json
from app.core.enums import SALES_STATUS

from app.utils.get_team_members import GetTeamMembers


class DealService:
    def __init__(self):
        self.repo = DealRepository()
        self.client= Client
        self.leadRepo = LeadRepository()
        self.encryption = Encryption()
        self.getTeamMem = GetTeamMembers()

    async def create(self, payload: Dict[str, Any], createdBy: str):
        async with await self.client.start_session() as session:
          async with session.start_transaction():
            try:
                lead_id = payload["lead_id"]
                is_exist = await self.repo.find_by_lead(
                    leadId=PydanticObjectId(lead_id)
                )

                if is_exist:
                    raise AppException(
                        400, "Deal already exist for this lead, process stopped"
                    )

                deal_id = generate_enquiry_id("DEAL")

                new_payload = {
                    **payload,
                    "deal_id": deal_id,
                    "createdBy": PydanticObjectId(createdBy),
                }

                deal = await self.repo.create(data=new_payload, session=session)

                if not deal:
                    raise AppException(400, "Deal creation failed")
                
                lead = await self.leadRepo.find_by_id(PydanticObjectId(lead_id))

                if not lead:
                    raise AppException(404, "Lead not found against lead id")
                
                lead.inDeal = True
                lead.status = SALES_STATUS.WON

                await lead.save(session=session)

                await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE)
                await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE_BY_ID)
                await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)

                return deal.model_dump(mode="json")

            except AppException as e:
                raise

            except DuplicateKeyError:
                raise AppException(409, "Lead id already exist")

            except Exception as e:
                print("error: ", e)
                raise AppException(500, "Internal server error")
            
            

    async def get_all(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = filters.get("page") or 1
            limit = filters.get("limit") or 10
            
           
            is_admin = False
            

            for item in user["userRole"]:
                if item["code"] == SUPER_ADMIN_CODE:
                    is_admin = True
                    break

            query = {}

            if not is_admin:
                
                members = await self.getTeamMem.get_team_members(user["_id"])
                
                if members:
                    query.update({"createdBy.$id": {"$in": members}})

                if not members:
                    query.update({"createdBy.$id": PydanticObjectId(user["_id"])})

            if "dealId" in filters:
                query.update({"deal_id": filters["dealId"]})

            if "name" in filters:
                query.update({"dealName": {"$regex": filters["name"], "$options": "i"}})

            if "pipeline" in filters:
                query.update({"dealPipeline": filters["pipeline"]})

            if "stage" in filters:
                query.update({"dealStage": filters["stage"]})
                
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
            
            cache_key =  cache_key_generator_with_id(prefix=DEAL_CACHE_NAMESPACE, filters=cache_query, page=int(page), limit=int(limit), userId=user["_id"])

            cache = await  FastAPICache.get_backend().get(cache_key)
             
            if cache:
                return json.loads(cache)

            result = await self.repo.get_all(
                page=int(page),
                limit=int(limit),
                filters=query,
                populate=["createdBy", "lead_id", "updatedBy"],
            )

            if not result:
                raise AppException(404, "Deal data not found")
            
            result = jsonable_encoder(
                result,
                exclude={
                    "createdBy": {"password"},
                    "updatedBy": {"password"},
                },
            )
  
            await FastAPICache.get_backend().set(key=cache_key, value=json.dumps(result), expire=300)

            return result

        except AppException as e:
            raise

        except Exception as e:
            print("error: ", e)
            raise AppException(500, "Internal server error")
        

    async def get_by_id(self, dealId: str, user:Dict[str, Any]):
        try:

            if not ObjectId.is_valid(dealId):
                raise AppException(400, "Invalid deal object id")
            
            isAdmin = False
            isCreator = False
           
            userRole = user["userRole"]

            for item in userRole:
                if item["code"] == SUPER_ADMIN_CODE:
                   isAdmin = True
                   break

            key = cache_key_generator_by_id(prefix=DEAL_CACHE_NAMESPACE_BY_ID, id=str(user["_id"]))

            cache = await FastAPICache.get_backend().get(key=key)

            if cache:
                return json.loads(cache)

            
            result = await self.repo.find_by_id(id=PydanticObjectId(dealId), populate=["createdBy", "lead_id", "updatedBy"])
            if not result:
                raise AppException(404, "Deal not found against this id")
            

            result = result.model_dump(mode="json")

            
            if str(user["_id"]) == str(result["createdBy"]["id"]):
                isCreator = True


            if not isAdmin and not isCreator:
                raise AppException(403, "Unauthorized, only admin or creator access this")
            
            email = result["lead_id"]["email"]
            phone = result["lead_id"]["phone"]

            userEmail = result["createdBy"]["email"]
            userPhone = result["createdBy"]["phone"]

            result["lead_id"]["email"] = self.encryption.decrypt_data(email)
            result["lead_id"]["phone"] = self.encryption.decrypt_data(phone)

            result["createdBy"]["email"] = self.encryption.decrypt_data(userEmail)
            result["createdBy"]["phone"] = self.encryption.decrypt_data(userPhone)

            await FastAPICache.get_backend().set(key=key, value=json.dumps(result), expire=300)
     
            return result

        except AppException as e:
            raise

        except Exception as e:
            print("error: ", e)
            raise AppException(500, "Internal server error")
        


    async def update(self, id:str, user: Dict[str, Any], payload: Dict[str, Any])->bool:
        try:
            if not ObjectId.is_valid(id):
                raise ValueError(400, "Invalid deal id")
            

            isAdmin:bool = False
            isCreator:bool = False

            userRole = user["userRole"]

   
            for item in userRole:
                if item["code"] == SUPER_ADMIN_CODE:
                   isAdmin = True
                   break

            if not isAdmin:
                lead = await self.repo.find_by_id(id=PydanticObjectId(id), populate=["createdBy"])
                if not lead:
                    raise AppException(404, "Lead not found against this id")
                
                lead = lead.model_dump(mode="json")

                if user["_id"] == lead["createdBy"]["id"]:
                    isCreator = True
            
            if not isAdmin and not isCreator:
                raise AppException(403, "Unauthorized, only admin or creator access this")
            
            new_payload: Dict[str, Any] = {
                **payload,
                "updatedBy": user["_id"]

            }
            
            update = await self.repo.update(id=PydanticObjectId(id), data=new_payload)

            if not update:
                raise AppException(400, "Deal data not updated")
            
            await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE)
            await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE_BY_ID)
            
            return True



        except AppException as e:
            raise
        except Exception as e:
            print("error: ", e)
            raise AppException(500, "Internal server error")
        

    

        
