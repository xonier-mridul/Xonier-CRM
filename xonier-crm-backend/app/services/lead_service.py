from typing import Dict, Any, List
from beanie import PydanticObjectId, BeanieObjectId
from app.core.security import hash_value
from pymongo.errors import DuplicateKeyError
from app.utils.enquiry_id_generator import generate_enquiry_id
from app.utils.custom_exception import AppException
from app.repositories.lead_repository import LeadRepository
from fastapi.encoders import jsonable_encoder
from bson import ObjectId
from datetime import datetime, timezone
from app.core.crypto import encryptor
from app.core.constants import (
    SUPER_ADMIN_CODE,
    LEAD_CACHE_NAMESPACE,
    USER_LEAD_CACHE_NAMESPACE,
)
from app.db.models.lead_model import LeadsModel 
from app.core.enums import SALES_STATUS
from app.utils.cache_key_generator import (
    cache_key_generator,
    cache_key_generator_with_id,
)
from fastapi_cache import FastAPICache
import json
from app.utils.get_team_members import GetTeamMembers


class LeadService:
    def __init__(self):
        self.repo = LeadRepository()
        self.getTeamMem = GetTeamMembers()

    async def create(self, payload: Dict[str, Any], createdBy: str):
        try:
            hashed_mail = hash_value(payload["email"])
            hashed_phone = hash_value(payload["phone"])
            is_exist = await self.repo.find_one(
                {
                    "fullName": payload["fullName"],
                    "hashedEmail": hashed_mail,
                    "projectType": payload["projectType"],
                    "hashedPhone": hashed_phone,
                }
            )

            if is_exist:
                raise AppException(
                    400,
                    "The query already exist with same name, email, phone or project type",
                )

            lead_id = generate_enquiry_id("LEAD")

            new_payload = {
                **payload,
                "lead_id": lead_id,
                "createdBy": PydanticObjectId(createdBy),
            }
            new_lead = await self.repo.create(new_payload)

            if not new_lead:
                raise AppException(400, "Lead creation failed, please try again")

            await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
            await FastAPICache.get_backend().clear(namespace=USER_LEAD_CACHE_NAMESPACE)

            return new_lead.model_dump(mode="json")

        except AppException:
            raise

        except DuplicateKeyError:
            raise AppException(status_code=409, message="Lead ID already exist")

        except Exception as e:
            raise AppException(status_code=500, message=f"Internal server error: {e}")
        


    async def bulk_create(self, payload: List[Dict[str, Any]], user: Dict[str, Any]):
        try:
            if not payload:
                raise AppException(400, "Leads payload cannot be empty")

            created_by = PydanticObjectId(user["id"])

            leads_to_insert: List[LeadsModel] = []
            skipped: List[Dict[str, Any]] = []

           
            hash_filters = []
            for lead in payload:
                hash_filters.append({
                    "hashedEmail": hash_value(lead["email"].lower()),
                    "hashedPhone": hash_value(lead["phone"]),
                    "projectType": lead["projectType"],
                })

            
            existing_leads = await LeadsModel.find(
                {"$or": hash_filters}
            ).project(LeadsModel.hashedEmail, LeadsModel.hashedPhone).to_list()

            existing_set = {
                (l.hashedEmail, l.hashedPhone) for l in existing_leads
            }

            for lead in payload:
                hashed_email = hash_value(lead["email"].lower())
                hashed_phone = hash_value(lead["phone"])

                if (hashed_email, hashed_phone) in existing_set:
                    skipped.append({
                        "email": lead["email"],
                        "phone": lead["phone"],
                        "reason": "Duplicate lead"
                    })
                    continue

                lead_doc = LeadsModel(
                    **lead,
                    lead_id=generate_enquiry_id("LEAD"),
                    createdBy=created_by,
                )

                leads_to_insert.append(lead_doc)

            if not leads_to_insert:
                raise AppException(400, "All leads already exist")

            
            await LeadsModel.insert_many(leads_to_insert)

            
            backend = FastAPICache.get_backend()
            await backend.clear(namespace=LEAD_CACHE_NAMESPACE)
            await backend.clear(namespace=USER_LEAD_CACHE_NAMESPACE)

            return {
                "inserted": len(leads_to_insert),
                "skipped": len(skipped),
                "skippedRecords": skipped,
            }

        except AppException:
            raise

        except DuplicateKeyError:
            raise AppException(409, "Duplicate lead detected")

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")



    async def get_all(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:

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


            page = filters.get("page") or 1
            limit = filters.get("limit") or 10

            if "status" in filters:
                query.update({"status": filters["status"]})

            if "leadid" in filters:
                query.update({"lead_id": filters["leadid"]})

            if "priority" in filters:
                query.update({"priority": filters["priority"]})

            if "source" in filters:
                query.update({"source": filters["source"]})

            if "type" in filters:
                query.update({"projectType": filters["type"]})

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

            key = cache_key_generator_with_id(
                prefix=LEAD_CACHE_NAMESPACE,
                filters=cache_query,
                page=int(page),
                limit=int(limit),
                userId=user["_id"],
            )

            cache = await FastAPICache.get_backend().get(key)

            if cache:
                return json.loads(cache)


            result = await self.repo.get_all(
                page=int(page),
                limit=int(limit),
                filters=query,
                populate=["createdBy", "updatedBy"],
            )

            if not result:
                raise AppException(404, "Leads data not found")

            result = jsonable_encoder(result, exclude={"hashedEmail", "hashedPhone"})

            for item in result["data"]:
                item["email"] = encryptor.decrypt_data(item["email"])
                item["phone"] = encryptor.decrypt_data(item["phone"])

            await FastAPICache.get_backend().set(
                key=key, value=json.dumps(result), expire=300
            )

            return result

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message=f"Internal server error: {e}")

    async def get_all_by_user(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:

            page = filters.get("page") or 1
            limit = filters.get("limit") or 10

            query = {}

            query.update({"createdBy.$id": PydanticObjectId(user["_id"])})

            if "status" in filters:
                query.update({"status": filters["status"]})

            if "leadid" in filters:
                query.update({"lead_id": filters["leadid"]})

            if "priority" in filters:
                query.update({"priority": filters["priority"]})

            if "source" in filters:
                query.update({"source": filters["source"]})

            if "type" in filters:
                query.update({"projectType": filters["type"]})

            cache_query = {
                k: str(v) if isinstance(v, PydanticObjectId) else v
                for k, v in query.items()
            }

            key = cache_key_generator_with_id(
                prefix=USER_LEAD_CACHE_NAMESPACE,
                filters=cache_query,
                page=int(page),
                limit=int(limit),
                userId=user["_id"],
            )

            cache = await FastAPICache.get_backend().get(key)

            if cache:
                return json.loads(cache)

            result = await self.repo.get_all(
                page=int(page), limit=int(limit), filters=query
            )

            if not result:
                raise AppException(404, "Leads data not found")

            result = jsonable_encoder(result, exclude={"hashedEmail", "hashedPhone"})

            for item in result["data"]:
                item["email"] = encryptor.decrypt_data(item["email"])
                item["phone"] = encryptor.decrypt_data(item["phone"])

            await FastAPICache.get_backend().set(
                key=key, value=json.dumps(result), expire=300
            )

            return result

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message=f"Internal server error: {e}")

    async def get_won_leads(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:

            is_admin = False

            for item in user["userRole"]:
                if item["code"] == SUPER_ADMIN_CODE:
                    is_admin = True
                    break

            if not is_admin:
                raise AppException(403, "Unauthorized, only super admin can access")

            page = filters.get("page") or 1
            limit = filters.get("limit") or 10

            query = {"status": SALES_STATUS.WON}

            if "leadid" in filters:
                query.update({"lead_id": filters["leadid"]})

            if "priority" in filters:
                query.update({"priority": filters["priority"]})

            if "source" in filters:
                query.update({"source": filters["source"]})

            if "type" in filters:
                query.update({"projectType": filters["type"]})
            print("params: ", page, limit)
            result = await self.repo.get_all(
                page=int(page),
                limit=int(limit),
                filters=query,
                populate=["createdBy", "updatedBy"],
            )

            if not result:
                raise AppException(404, "Leads data not found")

            result = jsonable_encoder(result, exclude={"hashedEmail", "hashedPhone"})

            for item in result["data"]:
                item["email"] = encryptor.decrypt_data(item["email"])
                item["phone"] = encryptor.decrypt_data(item["phone"])

            return result

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message=f"Internal server error: {e}")

    async def get_by_id(self, id: str, user: Dict[str, Any]):
        try:

            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid lead object id")

            result = await self.repo.find_by_id(
                id=id, populate=["createdBy", "updatedBy"]
            )

            if not result:
                raise AppException(404, "Lead data not found")

            is_admin = False
            is_creator = False

            for item in user["userRole"]:
                if item["code"] == SUPER_ADMIN_CODE:
                    is_admin = True
                    break

            result = result.model_dump(
                mode="json", exclude={"hashedEmail", "hashedPhone"}
            )

            if str(result["createdBy"]["id"]) == str(user["_id"]):
                is_creator = True

            if not is_admin and not is_creator:
                raise AppException(
                    403, "Unauthorized, only admin or creator access this"
                )

            result["email"] = encryptor.decrypt_data(result["email"])
            result["phone"] = encryptor.decrypt_data(result["phone"])

            return result

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message=f"Internal server error: {e}")

    async def update(
        self, leadId: str, payload: Dict[str, Any], user: Dict[str, Any]
    ) -> bool:
        try:
            if not ObjectId.is_valid(leadId):
                raise AppException(400, "Invalid lead id")

            is_admin = False
            is_creator = False

            for item in user["userRole"]:
                if item["code"] == SUPER_ADMIN_CODE:
                    is_admin = True
                    break

            if not payload:
                raise AppException(400, "Updated data not found")

            lead = await self.repo.find_by_id(
                PydanticObjectId(leadId), populate=["createdBy"]
            )

            if not lead:
                raise AppException(404, "Lead not found")

            if str(lead.createdBy.id) == str(user["_id"]):
                is_creator = True
            if not is_admin and not is_creator:
                raise AppException(
                    403, "Unauthorized, only admin or creator access this"
                )

            for key, val in payload.items():
                setattr(lead, key, val)

            # lead.updatedBy = ObjectId(user["_id"])
            lead.updatedAt = datetime.now(timezone.utc)

            await lead.save()

            await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
            await FastAPICache.get_backend().clear(namespace=USER_LEAD_CACHE_NAMESPACE)
            return True

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message=f"Internal server error: {e}")

    async def delete(self, leadId: str, user: Dict[str, Any]) -> bool:
        try:
            if not ObjectId.is_valid(leadId):
                raise AppException(400, "Invalid lead id")

            is_admin = False
            is_creator = False

            for item in user["userRole"]:
                if item["code"] == SUPER_ADMIN_CODE:
                    is_admin = True
                    break

            result = await self.repo.find_by_id(
                id=PydanticObjectId(leadId), populate=["createdBy", "updatedBy"]
            )

            if not result:
                raise AppException(404, "Lead data not found")

            result = result.model_dump(
                mode="json", exclude={"hashedEmail", "hashedPhone"}
            )

            if str(result["createdBy"]["id"]) == str(user["_id"]):
                is_creator = True

            if not is_admin and not is_creator:
                raise AppException(
                    403, "Unauthorized, only admin or creator access this"
                )

            deleted = await self.repo.delete_by_id(id=PydanticObjectId(leadId))

            if not deleted:
                raise AppException(404, "Lead not found for this Id")

            await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
            await FastAPICache.get_backend().clear(namespace=USER_LEAD_CACHE_NAMESPACE)

            return True

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message=f"Internal server error: {e}")
