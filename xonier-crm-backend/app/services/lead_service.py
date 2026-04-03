from typing import Dict, Any, List
from beanie import PydanticObjectId, BeanieObjectId
from app.core.security import hash_value
from pymongo.errors import DuplicateKeyError
from app.utils.enquiry_id_generator import generate_enquiry_id
from app.utils.custom_exception import AppException
from app.repositories.lead_repository import LeadRepository
from fastapi.encoders import jsonable_encoder
from bson import ObjectId
from pydantic import ValidationError
from datetime import datetime, timezone
from app.core.crypto import encryptor
from app.core.constants import (
    SUPER_ADMIN_CODE,
    LEAD_CACHE_NAMESPACE,
    USER_LEAD_CACHE_NAMESPACE,
    
)
from app.db.models.lead_model import LeadsModel 
from app.core.enums import SALES_STATUS, ACTIVITY_ENTITY_TYPE, ACTIVITY_ACTION, LEAD_SOURCE_TYPE
from app.utils.cache_key_generator import (
    cache_key_generator,
    cache_key_generator_with_id
)
from fastapi_cache import FastAPICache
import json
from app.utils.get_team_members import GetTeamMembers
from app.core.crypto import Encryption
from app.repositories.activity_repository import ActivityRepository
from app.db.db import Client
from app.utils.activity_payload import activity_payload
from app.utils.validate_admin import validate_admin
from app.repositories.user_repository import UserRepository


class LeadService:
    def __init__(self):
        self.repo = LeadRepository()
        self.getTeamMem = GetTeamMembers()
        self.encryption = Encryption()
        self.activityRepo = ActivityRepository()
        self.client = Client
        self.userRepo = UserRepository()

    async def create(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    is_admin = validate_admin(user["userRole"])
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
                        "createdBy": PydanticObjectId(user["_id"]),
                        "leadSource": LEAD_SOURCE_TYPE.ADMIN_CREATED.value if is_admin else LEAD_SOURCE_TYPE.SELF_CREATED.value
                    }
                    

                    new_lead = await self.repo.create(data=new_payload, session=session)

                    if not new_lead:
                        raise AppException(400, "Lead creation failed, please try again")
                    
                    activity = activity_payload(userId=PydanticObjectId(user["_id"]), entityType=ACTIVITY_ENTITY_TYPE.LEAD, entityId=PydanticObjectId(new_lead.id), action=ACTIVITY_ACTION.CREATED, title="create lead", metadata={"leadId": new_lead.lead_id, "leadName": new_lead.fullName})

                    
                    
                    is_activity = await self.activityRepo.create(data=activity, session=session)

                    if not is_activity:
                        raise AppException(400, "Activity creation failed")

                    await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
                    await FastAPICache.get_backend().clear(namespace=USER_LEAD_CACHE_NAMESPACE)

                    return new_lead.model_dump(mode="json")

                except AppException:
                    raise

                except DuplicateKeyError:
                    raise AppException(status_code=409, message="Lead ID already exist")

                except Exception as e:
                    raise AppException(status_code=500, message=f"Internal server error: {e}")
                


    async def bulk_create(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:

                    is_admin = validate_admin(user["userRole"])
                
                    leads_data = payload.get("leads", [])
                    data_tag = payload.get("dataTag", None)
                    
                    if not leads_data:
                        raise AppException(400, "Leads payload cannot be empty")

                    created_by = PydanticObjectId(user["_id"])
                    leads_to_insert: List[LeadsModel] = []
                    skipped: List[Dict[str, Any]] = []

                    hash_filters = []
                    for lead in leads_data:
                        try:
                            email = lead.get("email", "").lower()

                            if not email:
                                skipped.append({
                                    "email": lead.get("email", "N/A"),
                                    "reason": "Missing required field: email"
                                })
                                continue

                            filter_entry = {"hashedEmail": hash_value(email)}

                            phone = lead.get("phone", "")
                            project_type = lead.get("projectType", "")

                            if phone:
                                filter_entry["hashedPhone"] = hash_value(phone)
                            if project_type:
                                filter_entry["projectType"] = project_type

                            hash_filters.append(filter_entry)

                        except Exception as e:
                            skipped.append({
                                "email": lead.get("email", "N/A"),
                                "reason": f"Error processing: {str(e)}"
                            })

                    existing_set = set()
                    if hash_filters:
                        print(f"Checking for {len(hash_filters)} potential duplicates...")

                        existing_leads = await LeadsModel.find(
                            {"$or": hash_filters}
                        ).to_list()

                        print(f"Found {len(existing_leads)} existing leads")

                        existing_set = {
                            (l.hashedEmail, getattr(l, "hashedPhone", None), getattr(l, "projectType", None))
                            for l in existing_leads
                        }

                    for lead in leads_data:
                        try:
                            email = lead.get("email", "").lower()
                            phone = lead.get("phone", "") or ""
                            project_type = lead.get("projectType", "") or ""

                            if any(s.get("email") == lead.get("email") for s in skipped):
                                continue

                            hashed_email = hash_value(email)
                            hashed_phone = hash_value(phone) if phone else None
                            
                            encrypt_email = self.encryption.encrypt_data(email)
                            encrypt_phone = self.encryption.encrypt_data(phone) if phone else None

                            if (hashed_email, hashed_phone, project_type or None) in existing_set:
                                skipped.append({
                                    "email": lead.get("email"),
                                    "phone": phone or "N/A",
                                    "projectType": project_type or "N/A",
                                    "reason": "Duplicate lead (same email, phone, and project type)"
                                })
                                continue

                            lead_source = LEAD_SOURCE_TYPE.ADMIN_CREATED if is_admin else LEAD_SOURCE_TYPE.SELF_CREATED

                            lead_data = {
                                "fullName": lead.get("fullName"),
                                "email": encrypt_email,
                                "hashedEmail": hashed_email,
                                "priority": lead.get("priority"),
                                "source": lead.get("source"),
                                "status": lead.get("status", "new"),
                                "lead_id": generate_enquiry_id("LEAD"),
                                "createdBy": created_by,
                                "leadSource": lead_source,
                            }

                            if encrypt_phone:
                                lead_data["phone"] = encrypt_phone
                            if hashed_phone:
                                lead_data["hashedPhone"] = hashed_phone
                            if project_type:
                                lead_data["projectType"] = project_type

                           
                            optional_fields = {
                                "companyName": lead.get("companyName"),
                                "city": lead.get("city"),
                                "country": lead.get("country"),
                                "postalCode": lead.get("postalCode"),
                                "language": lead.get("language"),
                                "industry": lead.get("industry"),
                                "employeeRole": lead.get("employeeRole"),
                                "employeeSeniority": lead.get("employeeSeniority"),
                                "message": lead.get("message"),
                                "membershipNotes": lead.get("membershipNotes"),
                                "dataTag": data_tag
                            }

                            for field_name, field_value in optional_fields.items():
                                if field_value is not None and field_value != "":
                                    lead_data[field_name] = field_value

                           
                            extra_fields = lead.get("extraFields")
                            if extra_fields and isinstance(extra_fields, dict) and len(extra_fields) > 0:
                                lead_data["extraFields"] = extra_fields

                            lead_doc = LeadsModel(**lead_data)
                            leads_to_insert.append(lead_doc)

                        except Exception as e:
                            print(f"Error creating lead: {str(e)}")
                            import traceback
                            traceback.print_exc()
                            skipped.append({
                                "email": lead.get("email", "N/A"),
                                "reason": f"Validation error: {str(e)}"
                            })
                            continue

                    if not leads_to_insert:
                        return {
                            "inserted": 0,
                            "skipped": len(skipped),
                            "skippedRecords": skipped,
                        }

                    try:
                        await LeadsModel.insert_many(documents=leads_to_insert, session=session)
                        inserted_count = len(leads_to_insert)

                      

                        activity = activity_payload(userId=PydanticObjectId(user["_id"]), entityType=ACTIVITY_ENTITY_TYPE.LEAD, action=ACTIVITY_ACTION.CREATED, title="create bulk lead", perform=int(inserted_count))

                        is_activity = await self.activityRepo.create(data=activity, session=session)
                        if not is_activity:
                            raise AppException(400, "Activity creation failed")
                        backend = FastAPICache.get_backend()
                        await backend.clear(namespace=LEAD_CACHE_NAMESPACE)
                        await backend.clear(namespace=USER_LEAD_CACHE_NAMESPACE)

                    except Exception as e:
                        print(f"Error during bulk insert: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        raise AppException(500, f"Database insertion failed: {str(e)}")

                    return {
                        "inserted": inserted_count,
                        "skipped": len(skipped),
                        "skippedRecords": skipped,
                    }

                except AppException:
                    raise

                except DuplicateKeyError as e:
                    print(f"Duplicate key error during insertion: {str(e)}")
                    raise AppException(409, "Duplicate lead detected during insertion")

                except Exception as e:
                    print(f"Unexpected error in bulk_create: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    raise AppException(500, f"Internal server error: {str(e)}")

    async def bulk_lead_assign(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    validate_admin(user["userRole"])

                    user_id_str = payload.get("userId")
                    lead_ids_str = payload.get("leadsId", [])

                    if not user_id_str:
                        raise AppException(400, "userId is required")
                    if not lead_ids_str:
                        raise AppException(400, "leadsId cannot be empty")

                    assign_to_user = await self.userRepo.find_one({
                        "_id": PydanticObjectId(user_id_str),
                        "deletedAt": None
                    })
                    if not assign_to_user:
                        raise AppException(404, "User not found or inactive")

                    try:
                        lead_object_ids = [PydanticObjectId(lid) for lid in lead_ids_str]
                    except Exception:
                        raise AppException(400, "One or more leadIds are invalid")

                    assign_user_object_id = PydanticObjectId(user_id_str)
                    admin_object_id = PydanticObjectId(user["_id"])

                    
                    collection = LeadsModel.get_pymongo_collection()

                    existing_leads = await collection.find(
                        {
                            "_id": {"$in": lead_object_ids},
                            "deletedAt": None
                        },
                        {"_id": 1, "lead_id": 1, "assignedTo": 1}
                    ).to_list(length=None)

                    found_ids = {doc["_id"] for doc in existing_leads}
                    not_found_ids = [
                        str(lid) for lid in lead_object_ids if lid not in found_ids
                    ]

                    skipped: List[Dict[str, Any]] = []
                    valid_lead_ids: List[PydanticObjectId] = []

                    for lead in existing_leads:
                        assigned_to_list = lead.get("assignedTo") or []
                        already_assigned = any(
                            str(ref.id) == user_id_str
                            if hasattr(ref, "id")
                            else str(ref) == user_id_str
                            for ref in assigned_to_list
                        )
                        if already_assigned:
                            skipped.append({
                                "leadId": str(lead["_id"]),
                                "lead_id": lead.get("lead_id", "N/A"),
                                "reason": "User already assigned to this lead"
                            })
                        else:
                            valid_lead_ids.append(lead["_id"])

                    for lid in not_found_ids:
                        skipped.append({
                            "leadId": lid,
                            "lead_id": "N/A",
                            "reason": "Lead not found or deleted"
                        })

                    if not valid_lead_ids:
                        return {
                            "assigned": 0,
                            "skipped": len(skipped),
                            "skippedRecords": skipped
                        }

                    await collection.update_many(
                        {"_id": {"$in": valid_lead_ids}},
                        {
                            "$addToSet": {"assignedTo": {
                                "$ref": "users",
                                "$id": assign_user_object_id
                            }},
                            "$set": {
                                "assignedBy": {
                                    "$ref": "users",
                                    "$id": admin_object_id
                                },
                                "assignedAt": datetime.now(timezone.utc),
                                "isAssigned": True,
                                "updatedAt": datetime.now(timezone.utc),
                            }
                        },
                        session=session
                    )

                    assigned_count = len(valid_lead_ids)

                    activity = activity_payload(
                        userId=admin_object_id,
                        entityType=ACTIVITY_ENTITY_TYPE.LEAD,
                        action=ACTIVITY_ACTION.UPDATED,
                        title="bulk assign leads",
                        perform=assigned_count,
                        metadata={
                            "assignedTo": user_id_str,
                            "assignedLeads": [str(lid) for lid in valid_lead_ids]
                        }
                    )
                    is_activity = await self.activityRepo.create(data=activity, session=session)
                    if not is_activity:
                        raise AppException(400, "Activity creation failed")

                    backend = FastAPICache.get_backend()
                    await backend.clear(namespace=LEAD_CACHE_NAMESPACE)
                    await backend.clear(namespace=USER_LEAD_CACHE_NAMESPACE)

                    return {
                        "assigned": assigned_count,
                        "skipped": len(skipped),
                        "skippedRecords": skipped
                    }

                except AppException:
                    raise

                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    raise AppException(status_code=500, message=f"Internal server error: {e}")
                

    async def bulk_lead_reassign(self, payload: Dict[str, Any], user: Dict[str, Any]):
        
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    isAdmin = validate_admin(user["userRole"])

                    # if not isAdmin:
                    #     raise AppException(403, "Only admin can reassign leads")

                    user_id_str = payload.get("userId")
                    lead_ids_str = payload.get("leadsId", [])

                    if not user_id_str:
                        raise AppException(400, "userId is required")
                    if not lead_ids_str:
                        raise AppException(400, "leadsId cannot be empty")

                    
                    assign_to_user = await self.userRepo.find_one({
                        "_id": PydanticObjectId(user_id_str),
                        "deletedAt": None
                    })
                    if not assign_to_user:
                        raise AppException(404, "User not found or inactive")

                    
                    try:
                        lead_object_ids = [PydanticObjectId(lid) for lid in lead_ids_str]
                    except Exception:
                        raise AppException(400, "One or more leadIds are invalid")

                    assign_user_object_id = PydanticObjectId(user_id_str)
                    admin_object_id = PydanticObjectId(user["_id"])

                   
                    collection = LeadsModel.get_pymongo_collection()

                    existing_leads = await collection.find(
                        {
                            "_id": {"$in": lead_object_ids},
                            "deletedAt": None
                        },
                        {"_id": 1, "lead_id": 1, "assignedTo": 1, "isAssigned": 1}
                    ).to_list(length=None)

                    found_ids = {doc["_id"] for doc in existing_leads}
                    not_found_ids = [
                        str(lid) for lid in lead_object_ids if lid not in found_ids
                    ]

                    skipped: List[Dict[str, Any]] = []
                    valid_lead_ids: List[PydanticObjectId] = []

                    for lead in existing_leads:
                        lead_str_id = str(lead["_id"])
                        lead_display_id = lead.get("lead_id", "N/A")

                       
                        is_assigned = lead.get("isAssigned", False)
                        assigned_to_list = lead.get("assignedTo") or []

                        if not is_assigned or not assigned_to_list:
                            skipped.append({
                                "leadId": lead_str_id,
                                "lead_id": lead_display_id,
                                "reason": "Lead is not assigned yet — use bulk assign instead"
                            })
                            continue

                       
                        already_assigned_to_same = any(
                            (str(ref.id) == user_id_str if hasattr(ref, "id") else str(ref) == user_id_str)
                            for ref in assigned_to_list
                        )
                        if already_assigned_to_same:
                            skipped.append({
                                "leadId": lead_str_id,
                                "lead_id": lead_display_id,
                                "reason": "Lead is already assigned to this user"
                            })
                            continue

                        valid_lead_ids.append(lead["_id"])

                    
                    for lid in not_found_ids:
                        skipped.append({
                            "leadId": lid,
                            "lead_id": "N/A",
                            "reason": "Lead not found or deleted"
                        })

                    if not valid_lead_ids:
                        return {
                            "reassigned": 0,
                            "skipped": len(skipped),
                            "skippedRecords": skipped
                        }

                    
                    await collection.update_many(
                        {"_id": {"$in": valid_lead_ids}},
                        {
                            "$set": {
                                
                                "assignedTo": [{
                                    "$ref": "users",
                                    "$id": assign_user_object_id
                                }],
                                "assignedBy": {
                                    "$ref": "users",
                                    "$id": admin_object_id
                                },
                                "assignedAt": datetime.now(timezone.utc),
                                "isAssigned": True,
                                "updatedAt": datetime.now(timezone.utc),
                            }
                        },
                        session=session
                    )

                    reassigned_count = len(valid_lead_ids)

                   
                    activity = activity_payload(
                        userId=admin_object_id,
                        entityType=ACTIVITY_ENTITY_TYPE.LEAD,
                        action=ACTIVITY_ACTION.UPDATED,
                        title="bulk reassign leads",
                        perform=reassigned_count,
                        metadata={
                            "reassignedTo": user_id_str,
                            "reassignedLeads": [str(lid) for lid in valid_lead_ids]
                        }
                    )
                    is_activity = await self.activityRepo.create(data=activity, session=session)
                    if not is_activity:
                        raise AppException(400, "Activity creation failed")

                    
                    backend = FastAPICache.get_backend()
                    await backend.clear(namespace=LEAD_CACHE_NAMESPACE)
                    await backend.clear(namespace=USER_LEAD_CACHE_NAMESPACE)

                    
                    return {
                        "reassigned": reassigned_count,
                        "skipped": len(skipped),
                        "skippedRecords": skipped
                    }

                except AppException:
                    raise

                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    raise AppException(status_code=500, message=f"Internal server error: {e}")



    async def get_all(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            is_admin = False
            is_manager = False

            for item in user["userRole"]:
                if item["code"] == SUPER_ADMIN_CODE:
                    is_admin = True
                    break

            query = {
                "status": {
                    "$in": [
                        SALES_STATUS.CONTACTED,
                        SALES_STATUS.NEW,
                        SALES_STATUS.PROPOSAL,
                        SALES_STATUS.QUALIFIED
                    ]
                },
               
            }

            if not is_admin:
                members = await self.getTeamMem.get_team_members(user["_id"])
                user_object_id = PydanticObjectId(user["_id"])

                if members:
                    is_manager = True
                    query.update({
                        "$or": [
                            {"createdBy.$id": {"$in": members}},
                            {"assignedTo.$id": {"$in": members}},
                            {"assignedTo.$id": user_object_id},
                        ]
                    })
                else:
                    query.update({
                        "$or": [
                            {"createdBy.$id": user_object_id},
                            {"assignedTo.$id": user_object_id},
                        ]
                    })

            page = filters.get("page") or 1
            limit = filters.get("limit") or 10

            if "status" in filters:
                query.update({"status": filters["status"]})

            if "connectStatus" in filters:
                query.update({"connectStatus": filters["connectStatus"]})

            if "engagementStatus" in filters:
                query.update({"connectStatus": {"$regex": filters["engagementStatus"], "$options": "i"}})

            if "leadid" in filters:
                query.update({"lead_id": {"$regex": filters["leadid"], "$options": "i"}})

            if "tag" in filters:
                query.update({"dataTag": {"$regex": filters["tag"], "$options": "i"}})

            if "name" in filters:
                query.update({"fullName": {"$regex": filters["name"], "$options": "i"}})

            if "priority" in filters:
                query.update({"priority": filters["priority"]})

            if "source" in filters:
                query.update({"source": {"$regex": filters["source"], "$options": "i"}})

            if "type" in filters:
                query.update({"projectType": {"$regex": filters["type"], "$options": "i"}})

            if "search" in filters and filters["search"].strip():
                regex = {"$regex": filters["search"].strip(), "$options": "i"}

                search_query = {"$or" : [
                    {"fullName" : regex},
                    {"source": regex},
                    {"tag": regex}, 
                    {"companyName": regex}, 
                    {"city": regex},
                    {"type": regex}]}

                query.update(search_query)


            if "fromDate" in filters or "toDate" in filters:
                date_filter = {}
                if "fromDate" in filters:
                    try:
                        from_dt = datetime.fromisoformat(str(filters["fromDate"]))
                        from_dt = from_dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                        date_filter["$gte"] = from_dt
                    except (ValueError, TypeError):
                        raise AppException(400, "Invalid fromDate format. Use ISO format: YYYY-MM-DD")

                if "toDate" in filters:
                    try:
                        to_dt = datetime.fromisoformat(str(filters["toDate"]))
                        to_dt = to_dt.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
                        date_filter["$lte"] = to_dt
                    except (ValueError, TypeError):
                        raise AppException(400, "Invalid toDate format. Use ISO format: YYYY-MM-DD")

                if date_filter:
                    query.update({"createdAt": date_filter})

            if is_admin or is_manager:
                if "userid" in filters:
                    if not ObjectId.is_valid(filters["userid"]):
                        raise AppException(400, "Invalid userId")
                    query.update({
                        "createdBy.$id": PydanticObjectId(filters["userid"])
                    })

            if "isAssigned" in filters:
                is_assigned_val = filters["isAssigned"]

                if is_assigned_val is True or str(is_assigned_val).lower() == "true":
                    query.update({
                        "isAssigned": True,
                        "assignedTo": {"$exists": True, "$ne": []}
                    })

            def serialize_for_cache(v):
                if isinstance(v, PydanticObjectId):
                    return str(v)
                elif isinstance(v, datetime):
                    return v.isoformat()
                elif isinstance(v, list):
                    return [serialize_for_cache(i) for i in v]
                elif isinstance(v, dict):
                    return {nk: serialize_for_cache(nv) for nk, nv in v.items()}
                return v

            cache_query = {k: serialize_for_cache(v) for k, v in query.items()}

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
                populate=["createdBy", "updatedBy", "assignedTo"],
                sort=["-createdAt"]
            )

            if not result:
                raise AppException(404, "Leads data not found")

            result = jsonable_encoder(result, exclude={"hashedEmail", "hashedPhone"})

            for item in result["data"]:
                item["email"] = encryptor.decrypt_data(item["email"])
                if item["phone"]:
                    item["phone"] = encryptor.decrypt_data(item["phone"])

            await FastAPICache.get_backend().set(
                key=key, value=json.dumps(result), expire=300
            )

            return result

        except AppException as e:
            raise e

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
                page=int(page), limit=int(limit), filters=query, sort=["-createdAt"]
            )

            if not result:
                raise AppException(404, "Leads data not found")

            result = jsonable_encoder(result, exclude={"hashedEmail", "hashedPhone"})

            for item in result["data"]:
                item["email"] = encryptor.decrypt_data(item["email"])
                phone = item.get("phone")
                if phone:
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
                id=id, populate=["createdBy", "updatedBy", "assignedTo"]
            )

            if not result:
                raise AppException(404, "Lead data not found")

            is_admin = False
            is_creator = False
            is_manager = False
            is_assigner = False

            for item in user["userRole"]:
                if item["code"] == SUPER_ADMIN_CODE:
                    is_admin = True
                    break
            
            if not is_admin:
                members = await self.getTeamMem.get_team_members(user["_id"])
                if members:
                    is_manager = True
                    

            result = result.model_dump(
                mode="json", exclude={"hashedEmail"}
            )

            if str(result["createdBy"]["id"]) == str(user["_id"]):
                is_creator = True

            for item in result["assignedTo"]:
                if(str(item["id"])) == str(user["_id"]):
                    is_assigner = True

            if not is_admin and not is_creator and not is_manager and not is_assigner:
                raise AppException(
                    403, "Unauthorized, only admin, manager, assigner or creator access lead data"
                )

            result["email"] = encryptor.decrypt_data(result["email"])
            phone = result.get("phone")
            
            if phone:
                result["phone"] = encryptor.decrypt_data(result["phone"])
            result["createdBy"]["email"] = encryptor.decrypt_data(result["createdBy"]["email"])
            creator_phone = result["createdBy"].get("phone")
            if creator_phone:
                result["createdBy"]["phone"] = encryptor.decrypt_data(result["createdBy"]["phone"])

            for item in result["assignedTo"]:
                item["email"] = encryptor.decrypt_data(item["email"])
                

            return result

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message=f"Internal server error: {e}")

    async def update(
        self, leadId: str, payload: Dict[str, Any], user: Dict[str, Any]
    ) -> bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(leadId):
                        raise AppException(400, "Invalid lead id")

                    is_admin = False
                    is_creator = False
                    is_assigner = False

                    for item in user["userRole"]:
                        if item["code"] == SUPER_ADMIN_CODE:
                            is_admin = True
                            break

                    if not payload:
                        raise AppException(400, "Updated data not found")

                    lead = await self.repo.find_by_id(
                        PydanticObjectId(leadId), populate=["createdBy", "assignedTo"]
                    )

                    if not lead:
                        raise AppException(404, "Lead not found")
                    
                    if payload["status"] == SALES_STATUS.DELETE.value:
                        raise AppException(400, "Action denied, can not set status delete")
                    
                    if payload["status"] == SALES_STATUS.WON.value:
                        raise AppException(400, "Action denied, can not set status won")
                    
                    if lead.status == SALES_STATUS.DELETE.value:
                        raise AppException(400, "Action denied, Lead is deleted")

                    if lead.status == SALES_STATUS.WON.value:
                        raise AppException(400, "Action denied, Lead is Won so you are not update it now")

                    if str(lead.createdBy.id) == str(user["_id"]):
                        is_creator = True

                    for item in lead.assignedTo:
                        if(str(item.id)) == str(user["_id"]):
                            is_assigner = True

                    if not is_admin and not is_creator and not is_assigner:
                        raise AppException(
                            403, "Unauthorized, only admin or creator access this"
                        )

                    for key, val in payload.items():
                        setattr(lead, key, val)

                    # lead.updatedBy = ObjectId(user["_id"])
                    lead.updatedAt = datetime.now(timezone.utc)

                    await lead.save(session=session)

                    activity = activity_payload(userId=PydanticObjectId(user["_id"]), entityType=ACTIVITY_ENTITY_TYPE.LEAD, entityId=PydanticObjectId(lead.id), action=ACTIVITY_ACTION.UPDATED, title="update lead", metadata={"leadId": lead.lead_id, "leadName": lead.fullName})

                    is_activity = await self.activityRepo.create(data=activity, session=session)

                    if not is_activity:
                        raise AppException(400, "Activity log failed")

                    await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
                    await FastAPICache.get_backend().clear(namespace=USER_LEAD_CACHE_NAMESPACE)
                    return True

                except AppException:
                    raise

                except Exception as e:
                    raise AppException(status_code=500, message=f"Internal server error: {e}")

    async def update_status(self, leadId:str, user:Dict[str, Any], payload: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
        
                try:
                    if not ObjectId.is_valid(leadId):
                        raise AppException(400, "Invalid lead object id")
                    
                    is_admin = validate_admin(user["userRole"])
                    is_creator = False

                    lead = await self.repo.find_by_id(
                        PydanticObjectId(leadId), populate=["createdBy", "assignedTo"]
                    )

                    if not lead:
                        raise AppException(404, "Lead data not found")
                    
                    if payload["status"] == SALES_STATUS.DELETE.value:
                        raise AppException(400, "Action denied, can not set status delete")
                    
                    if payload["status"] == SALES_STATUS.WON.value:
                        raise AppException(400, "Action denied, can not set status won")
                    
                    if lead.status == SALES_STATUS.DELETE.value:
                        raise AppException(400, "Action denied, Lead is deleted")

                    if lead.status == SALES_STATUS.WON.value:
                        raise AppException(400, "Action denied, Lead is Won so you are not update it now")

                    if str(lead.createdBy.id) == str(user["_id"]):
                        is_creator = True
                    
                    for item in lead.assignedTo:
                        if(str(item.id)) == str(user["_id"]):
                            is_assigner = True

                    if not is_admin and not is_creator and not is_assigner:
                        raise AppException(403, "Permission denied, only admin, creator or assigned person can access it")
                    

                    
                    lead.status = payload["status"]
                    lead.updatedAt = datetime.now(timezone.utc)

                    await lead.save(session=session)

                    activity = activity_payload(userId=PydanticObjectId(user["_id"]), entityType=ACTIVITY_ENTITY_TYPE.LEAD.value, entityId=PydanticObjectId(lead.id), action=ACTIVITY_ACTION.UPDATED.value, title="update lead status", metadata={"leadId": lead.lead_id, "leadName": lead.fullName, "status": lead.status})

                    is_activity = await self.activityRepo.create(data=activity, session=session)

                    if not is_activity:
                        raise AppException(400, "Activity log failed")

                    await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
                    await FastAPICache.get_backend().clear(namespace=USER_LEAD_CACHE_NAMESPACE) 

                    return lead.model_dump(mode="json")

                except AppException as e:
                    raise e

                except Exception as e:
                    raise AppException(status_code=500, message=f"Internal server error: {e}")


    async def update_connect_status(self, leadId:str, user:Dict[str, Any], payload: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
        
                try:
                    if not ObjectId.is_valid(leadId):
                        raise AppException(400, "Invalid lead object id")
                    
                    
                    is_admin = validate_admin(user["userRole"])
                    is_creator = False

                    lead = await self.repo.find_by_id(
                        PydanticObjectId(leadId), populate=["createdBy", "assignedTo"]
                    )

                    if not lead:
                        raise AppException(404, "Lead data not found")
                    
                    if payload["status"] == SALES_STATUS.DELETE.value:
                        raise AppException(400, "Action denied, can not set status delete")
                    
                    if payload["status"] == SALES_STATUS.WON.value:
                        raise AppException(400, "Action denied, can not set status won")
                    
                    if lead.status == SALES_STATUS.DELETE.value:
                        raise AppException(400, "Action denied, Lead is deleted")

                    if lead.status == SALES_STATUS.WON.value:
                        raise AppException(400, "Action denied, Lead is Won so you are not update it now")

                    if str(lead.createdBy.id) == str(user["_id"]):
                        is_creator = True
                    
                    for item in lead.assignedTo:
                        if(str(item.id)) == str(user["_id"]):
                            is_assigner = True

                    if not is_admin and not is_creator and not is_assigner:
                        raise AppException(403, "Permission denied, only admin, creator or assigned person can access it")
                    
                    
                    lead.connectStatus = payload["status"]
                    lead.updatedAt = datetime.now(timezone.utc)

                    await lead.save(session=session)

                    activity = activity_payload(userId=PydanticObjectId(user["_id"]), entityType=ACTIVITY_ENTITY_TYPE.LEAD.value, entityId=PydanticObjectId(lead.id), action=ACTIVITY_ACTION.UPDATE_LEAD_CONNECTION_STATUS, title="update lead connect status", metadata={"leadId": lead.lead_id, "leadName": lead.fullName, "status": lead.status, "connectStatus": lead.connectStatus})

                    is_activity = await self.activityRepo.create(data=activity, session=session)

                    if not is_activity:
                        raise AppException(400, "Activity log failed")

                    await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
                    await FastAPICache.get_backend().clear(namespace=USER_LEAD_CACHE_NAMESPACE) 

                    return lead.model_dump(mode="json")


                except AppException as e:
                    raise e

                except Exception as e:
                    raise AppException(status_code=500, message=f"Internal server error: {e}")


    async def delete(self, leadId: str, user: Dict[str, Any]) -> bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
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
                    
                    if result.status == SALES_STATUS.DELETE.value:
                        raise AppException(400, "Action denied, Lead is already deleted")
                    
                    if result.inDeal:
                        raise AppException(400, "Lead is in deal, so please delete from the deal")

                    result = result.model_dump(
                        mode="json", exclude={"hashedEmail", "hashedPhone"}
                    )

                    if str(result["createdBy"]["id"]) == str(user["_id"]):
                        is_creator = True

                    if not is_admin and not is_creator:
                        raise AppException(
                            403, "Unauthorized, only admin or creator access this"
                        )
                    payload = {
                        "status": SALES_STATUS.DELETE,
                        "deletedBy": user["_id"],
                        "deletedAt": datetime.now(timezone.utc)
                    }
                    deleted = await self.repo.update(id=PydanticObjectId(leadId), data=payload, session=session)

                    if not deleted:
                        raise AppException(404, "Lead not found for this Id")
                    
                    activity = activity_payload(userId=PydanticObjectId(user["_id"]), entityType=ACTIVITY_ENTITY_TYPE.LEAD, entityId=PydanticObjectId(result["id"]), action=ACTIVITY_ACTION.DELETE, title="delete lead", metadata={"leadId": result["lead_id"], "leadName": result["fullName"]})

                    is_activity = await self.activityRepo.create(data=activity, session=session)

                    if not is_activity:
                        raise AppException(400, "Activity log failed")

                    await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
                    await FastAPICache.get_backend().clear(namespace=USER_LEAD_CACHE_NAMESPACE)

                    return True

                except AppException:
                    raise

                except Exception as e:
                    raise AppException(status_code=500, message=f"Internal server error: {e}")




    async def bulkDelete(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    leadsIds = payload.get("leadsIds")
 
                    if not leadsIds:
                        raise AppException(400, "Leads ids not found")
 
                    for id in leadsIds:
                        if not ObjectId.is_valid(id):
                            raise AppException(400, f"Invalid Object id: {id}")
 
                    is_admin = validate_admin(user["userRole"])
                    is_manager = False
                    members = []
 
                    if not is_admin:
                        members = await self.getTeamMem.get_team_members(user["_id"])
                        if members:
                            is_manager = True
 
                    user_object_id = PydanticObjectId(user["_id"])
 
                    leads = await self.repo.find_many(
                        filters={"_id": {"$in": [PydanticObjectId(id) for id in leadsIds]}},
                        populate=["createdBy"]
                    )
 
                    found_ids = {str(lead.id) for lead in leads} if leads else set()
                    missing_ids = [id for id in leadsIds if id not in found_ids]
 
                    failed_leads = []
 
                    for id in missing_ids:
                        failed_leads.append({
                            "id": id,
                            "lead_id": None,
                            "reason": "Lead not found"
                        })
 
                    eligible_leads = []
 
                    for lead in (leads or []):
                        if lead.status == SALES_STATUS.DELETE.value:
                            failed_leads.append({
                                "id": str(lead.id),
                                "lead_id": lead.lead_id,
                                "reason": "Lead is already deleted"
                            })
                            continue
 
                        if lead.inDeal:
                            failed_leads.append({
                                "id": str(lead.id),
                                "lead_id": lead.lead_id,
                                "reason": "Lead is in a deal, remove from deal first"
                            })
                            continue
 
                        if not is_admin:
                            lead_creator_id = PydanticObjectId(lead.createdBy.id)
                            is_creator = lead_creator_id == user_object_id
                            is_team_member_lead = lead_creator_id in members if members else False
 
                            if not is_creator and not is_manager and not is_team_member_lead:
                                failed_leads.append({
                                    "id": str(lead.id),
                                    "lead_id": lead.lead_id,
                                    "reason": "Unauthorized, only admin, manager or creator can delete this lead"
                                })
                                continue
 
                        eligible_leads.append(lead)
 
                    deleted_count = 0
 
                    if eligible_leads:
                        eligible_ids = [PydanticObjectId(lead.id) for lead in eligible_leads]
 
                        delete_payload = {
                            "status": SALES_STATUS.DELETE,
                            "deletedBy": user["_id"],
                            "deletedAt": datetime.now(timezone.utc)
                        }
 
                        deleted = await self.repo.bulk_update(
                            filters={"_id": {"$in": eligible_ids}},
                            data=delete_payload,
                            session=session
                        )
 
                        if not deleted:
                            raise AppException(400, "Bulk delete operation failed")
 
                        activities = [
                            activity_payload(
                                userId=user_object_id,
                                entityType=ACTIVITY_ENTITY_TYPE.LEAD,
                                entityId=PydanticObjectId(lead.id),
                                action=ACTIVITY_ACTION.DELETE,
                                title="bulk delete lead",
                                metadata={"leadId": lead.lead_id, "leadName": lead.fullName}
                            )
                            for lead in eligible_leads
                        ]
 
                        is_activity = await self.activityRepo.bulk_create(data=activities, session=session)
 
                        if not is_activity:
                            raise AppException(400, "Activity log failed")
 
                        deleted_count = len(eligible_leads)
 
                        await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
                        await FastAPICache.get_backend().clear(namespace=USER_LEAD_CACHE_NAMESPACE)
 
                    return {
                        "totalRequested": len(leadsIds),
                        "deletedCount": deleted_count,
                        "failedCount": len(failed_leads),
                        "failedLeads": failed_leads
                    }
 
                except AppException:
                    raise
 
                except Exception as e:
                    raise AppException(status_code=500, message=f"Internal server error: {e}")
 