
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.validate_admin import validate_admin
from app.repositories.enquiry_repository import EnquiryRepository
from app.repositories.user_repository import UserRepository
from app.repositories.activity_repository import ActivityRepository
from beanie import PydanticObjectId
from app.core.enums import INFO_TYPE, ACTIVITY_ACTION, ACTIVITY_ENTITY_TYPE
from fastapi.encoders import jsonable_encoder
from bson import ObjectId, DBRef
from app.utils.get_team_members import GetTeamMembers
from app.core.crypto import Encryption
from app.core.security import hash_value
from datetime import datetime, timezone
from bson import ObjectId
from app.utils.activity_payload import activity_payload
from app.db.db import Client
import asyncio


class ProspectsService:
    def __init__(self):
        self.repo = EnquiryRepository()
        self.client= Client
        self.userRepo = UserRepository()
        self.getTeamMembers = GetTeamMembers()
        self.encryption = Encryption()
        self.activityRepo = ActivityRepository()


    async def get_all_active(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            is_admin = validate_admin(user["userRole"])

            page = filters.get("page") or 1
            limit = filters.get("limit") or 10

            query = {"isActive": True, "deletedAt": None}
            print("one")
            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])
                user_object_id = PydanticObjectId(user["_id"])

                
                
                if members:
                    query.update({
                        "$or": [
                            {"createdBy.$id": {"$in": members}},
                            {"createdBy.$id": user_object_id},
                            {"assignTo.$id": {"$in": members}},
                            {"assignTo.$id": user_object_id},
                        ]
                    })
                else:
                    query.update({"$or": [ {"createdBy.$id": user_object_id},
                                {"assignTo.$id": user_object_id}]})

            if "info" in filters:
                query.update({"infoType": filters["info"]})

            if "enquiry_id" in filters:
                query.update({"enquiry_id": filters["enquiry_id"]})

            if "fullName" in filters:
                query.update({"fullName": {"$regex": filters["fullName"], "$options": "i"}})

            if "status" in filters:
                query.update({"status": {"$regex": filters["status"], "$options": "i"}})

            if "country" in filters:
                query.update({"location.country": filters["country"]})

            if "city" in filters:
                query.update({"location.city": filters["city"]})

            if "state" in filters:
                query.update({"location.state": filters["state"]})

            if "zipcode" in filters:
                query.update({"location.zipcode": filters["zipcode"]})

           

            if "companyName" in filters:
                query.update({"companyName": filters["companyName"]})

            if "projectType" in filters:
                query.update({"projectType": filters["projectType"]})

            if "priority" in filters:
                query.update({"priority": filters["priority"]})  

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
            
            result = await self.repo.get_all(
                page=int(page),
                limit=int(limit),
                filters=query,
                populate=["assignTo", "createdBy"],
                sort=["-createdAt"]
            )

            if not result:
                raise AppException(404, "Enquiry data not found")

            
            def to_dict(doc):
                return doc if isinstance(doc, dict) else doc.dict()

            raw_data = [to_dict(doc) for doc in result["data"]]

           
            info_value = str(filters.get("info", "")).strip().lower()
            is_people = info_value == str(INFO_TYPE.PEOPLE.value).strip().lower()

            if is_people:
                people_fields = {
                    "enquiry_id", "fullName", "email", "phone", "companyName",
                    "infoType", "designation", "socialLinks", "location",
                    "status", "isActive", "assignTo", "createdBy", "updatedBy",
                    "createdAt", "updatedAt"
                }
                filtered_data = [
                    {k: v for k, v in doc.items() if k in people_fields}
                    for doc in raw_data
                ]
            else:
                filtered_data = raw_data

            return jsonable_encoder(filtered_data)

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error {e}")


    async def get_by_id(self, id:str, user: Dict[str, Any]):
        try:
            

            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid prospect object id")
            
            is_admin = validate_admin(user["userRole"])
            is_manager = False
            is_creator = False
             
            

            prospect = await self.repo.find_by_id(id=PydanticObjectId(id), populate=["assignTo", "createdBy"])
            
            if not prospect:
                raise AppException(404, f"Prospects data not found against this {id}")

            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])

                if prospect.createdBy.id in members:
                    is_manager = True

                elif str(prospect.createdBy.id) == str(user["_id"]):
                    is_creator = True


            if not is_admin and not is_manager and not is_creator:
                raise AppException(403, "Permission denied, you not access prospect data")
            
            result = jsonable_encoder(prospect.model_dump(mode="json"))

            creator = result.get("createdBy")

            if creator:
                if creator.get("email"):
                    result["createdBy"]["email"] = self.encryption.decrypt_data(result["createdBy"]["email"])

                if creator.get("phone"):
                    result["createdBy"]["phone"] = self.encryption.decrypt_data(result["createdBy"]["phone"])

            return result
            

            
        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error {e}")
          

    
    async def bulk_assign(self, user: Dict[str, Any], payload: Dict[str, Any]):
        try:
            assigned_to = payload.get("assignedTo")
            enquiry_ids = payload.get("enquiryIds", [])

            if not assigned_to:
                raise AppException(400, "assignedTo is required")

            if not enquiry_ids:
                raise AppException(400, "enquiryIds is required and must not be empty")

            if not ObjectId.is_valid(assigned_to):
                raise AppException(400, "Invalid assignedTo user ID")

            for eid in enquiry_ids:
                if not ObjectId.is_valid(eid):
                    raise AppException(400, f"Invalid enquiry ID: {eid}")

            assigned_user = await self.userRepo.find_by_id(id=PydanticObjectId(assigned_to))

            if not assigned_user:
                raise AppException(404, f"User with id {assigned_to} not found")

            object_ids = [PydanticObjectId(eid) for eid in enquiry_ids]

            enquiries = await self.repo.find_many(
                filters={"_id": {"$in": object_ids}}
            )

            if not enquiries:
                raise AppException(404, "No enquiries found for the provided ids")

            async with await self.client.start_session() as session:
                async with session.start_transaction():
                    try:
                        update_data = {
                            "assignTo": DBRef(collection="users", id=PydanticObjectId(assigned_to)),
                            "assignBy": DBRef(collection="users", id=PydanticObjectId(user["_id"])),
                            "assignedAt": datetime.now(timezone.utc)
                        }

                        modified_count = await self.repo.bulk_update_by_ids(
                            ids=object_ids,
                            data=update_data,
                            session=session
                        )

                        if not modified_count:
                            raise AppException(400, "Bulk assign failed, no documents were updated")

                        activity_tasks = []
                        for enquiry in enquiries:
                            activity = activity_payload(
                                userId=PydanticObjectId(user["_id"]),
                                entityType=ACTIVITY_ENTITY_TYPE.ENQUIRY.value,
                                entityId=PydanticObjectId(enquiry.id),
                                action=ACTIVITY_ACTION.ASSIGN.value,
                                title="Bulk assign enquiry",
                                metadata={
                                    "enquiryId": enquiry.enquiry_id,
                                    "assignedTo": assigned_to,
                                }
                            )
                            activity_tasks.append(
                                self.activityRepo.create(data=activity, session=session)
                            )

                        activity_results = await asyncio.gather(*activity_tasks, return_exceptions=True)

                        for result in activity_results:
                            if isinstance(result, Exception):
                                raise AppException(400, f"Activity creation failed: {result}")

                    except AppException:
                        await session.abort_transaction()
                        raise

                    except Exception as e:
                        await session.abort_transaction()
                        raise AppException(500, f"Transaction failed: {e}")

            assigned_user_data = assigned_user.model_dump(mode="json")
            first_name = assigned_user_data.get("firstName") or ""
            last_name = assigned_user_data.get("lastName") or ""

            return {
                "user": f"{first_name} {last_name}".strip(),
                "assignedTo": assigned_to,
                "modifiedCount": modified_count
            }

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def get_all_assigned(self, filters: Dict[str, Any], user: Dict[str, Any], page: int = 1, limit: int = 10):
        try:
            is_admin = validate_admin(user["userRole"])
 
            query = {
                "isActive": True,
                "deletedAt": None,
                "assignTo": {"$exists": True, "$ne": None},
            }
 
            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])
                user_object_id = PydanticObjectId(user["_id"])
                user_string_id = str(user["_id"])
 
                if members:
                    query.update({
                        "$or": [
                            {"createdBy.$id": {"$in": members}},
                            {"createdBy.$id": user_object_id},
                            {"assignTo.$id": {"$in": members}},
                            {"assignTo.$id": user_string_id},
                        ]
                    })
                else:
                    query.update({
                        "$or": [
                            {"createdBy.$id": user_object_id},
                            {"assignTo.$id": user_string_id},
                        ]
                    })
            
            if "search" in filters and filters["search"].strip():
                regex_search = {"$regex": filters["search"], "$options": "i"}

                query.update({"$or": [
                    {"infoType": regex_search},
                    {"enquiry_id": regex_search},
                    {"fullName": regex_search},
                    {"location.country": regex_search},
                    {"location.city": regex_search},
                    {"location.state": regex_search},
                    {"location.zipcode": regex_search},
                    {"companyName": regex_search},
                    {"projectType": regex_search},
                    {"status": regex_search}
                ]})

 
            if "assignedTo" in filters:
                if not ObjectId.is_valid(filters["assignedTo"]):
                    raise AppException(400, "Invalid assignedTo user ID")
                query.update({"assignTo.$id": str(filters["assignedTo"])})
 
            if "assignedBy" in filters:
                if not ObjectId.is_valid(filters["assignedBy"]):
                    raise AppException(400, "Invalid assignedBy user ID")
                query.update({"assignBy.$id": str(filters["assignedBy"])})
 
 
            if "projectType" in filters:
                query.update({"projectType": filters["projectType"]})
 
            if "priority" in filters:
                query.update({"priority": filters["priority"]})
 
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
 
            if "assignedFrom" in filters or "assignedTo_date" in filters:
                assigned_date_filter = {}
                if "assignedFrom" in filters:
                    try:
                        from_dt = datetime.fromisoformat(str(filters["assignedFrom"]))
                        from_dt = from_dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                        assigned_date_filter["$gte"] = from_dt
                    except (ValueError, TypeError):
                        raise AppException(400, "Invalid assignedFrom format. Use ISO format: YYYY-MM-DD")
 
                if "assignedTo_date" in filters:
                    try:
                        to_dt = datetime.fromisoformat(str(filters["assignedTo_date"]))
                        to_dt = to_dt.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
                        assigned_date_filter["$lte"] = to_dt
                    except (ValueError, TypeError):
                        raise AppException(400, "Invalid assignedTo_date format. Use ISO format: YYYY-MM-DD")
 
                if assigned_date_filter:
                    query.update({"assignedAt": assigned_date_filter})
 
            result = await self.repo.get_all(
                page=int(page),
                limit=int(limit),
                filters=query,
                populate=["assignTo", "assignBy", "createdBy"],
                sort=["-assignedAt"]
            )
 
            if not result:
                raise AppException(404, "No assigned enquiries found")
 
            return jsonable_encoder(result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error: {e}")
 
        

    async def bulk_reassign(self, user: Dict[str, Any], payload: Dict[str, Any]):
        try:
            assigned_to = payload.get("assignedTo")
            enquiry_ids = payload.get("enquiryIds", [])

            if not assigned_to:
                raise AppException(400, "assignedTo is required")

            if not enquiry_ids:
                raise AppException(400, "enquiryIds is required and must not be empty")

            if not ObjectId.is_valid(assigned_to):
                raise AppException(400, "Invalid assignedTo user ID")

            for eid in enquiry_ids:
                if not ObjectId.is_valid(eid):
                    raise AppException(400, f"Invalid enquiry ID: {eid}")

            assigned_user = await self.userRepo.find_by_id(id=PydanticObjectId(assigned_to))

            if not assigned_user:
                raise AppException(404, f"User with id {assigned_to} not found")

            object_ids = [PydanticObjectId(eid) for eid in enquiry_ids]

            enquiries = await self.repo.find_many(
                filters={"_id": {"$in": object_ids}}
            )

            if not enquiries:
                raise AppException(404, "No enquiries found for the provided ids")

            found_ids = {str(e.id) for e in enquiries}
            missing_ids = [eid for eid in enquiry_ids if eid not in found_ids]

            failed = []
            eligible_ids = []
            eligible_enquiries = []

            for eid in missing_ids:
                failed.append({
                    "id": eid,
                    "reason": "Enquiry not found"
                })

            for enquiry in enquiries:
                if not enquiry.assignTo:
                    failed.append({
                        "id": str(enquiry.id),
                        "enquiry_id": enquiry.enquiry_id,
                        "reason": "Enquiry prospects is not assigned to anyone, use bulk assign instead"
                    })
                    continue

                eligible_ids.append(PydanticObjectId(enquiry.id))
                eligible_enquiries.append(enquiry)

            modified_count = 0

            async with await self.client.start_session() as session:
                async with session.start_transaction():
                    try:
                        if eligible_ids:
                            update_data = {
                                "assignTo": DBRef(collection="users", id=str(assigned_to)),
                                "assignBy": DBRef(collection="users", id=str(user["_id"])),
                                "assignedAt": datetime.now(timezone.utc),
                            }

                            modified_count = await self.repo.bulk_update_by_ids(
                                ids=eligible_ids,
                                data=update_data,
                                session=session
                            )

                            if modified_count == 0:
                                raise AppException(400, "Bulk reassign failed, no documents were updated")

                            
                            activity_tasks = []
                            for enquiry in eligible_enquiries:
                                activity = activity_payload(
                                    userId=PydanticObjectId(user["_id"]),
                                    entityType=ACTIVITY_ENTITY_TYPE.ENQUIRY.value,
                                    entityId=PydanticObjectId(enquiry.id),
                                    action=ACTIVITY_ACTION.REASSIGN.value,
                                    title="Bulk reassign enquiry",
                                    metadata={
                                        "enquiryId": enquiry.enquiry_id,
                                        "reassignedTo": assigned_to,
                                    }
                                )
                                activity_tasks.append(
                                    self.activityRepo.create(data=activity, session=session)
                                )

                            activity_results = await asyncio.gather(*activity_tasks, return_exceptions=True)

                            for result in activity_results:
                                if isinstance(result, Exception):
                                    raise AppException(400, f"Activity creation failed: {result}")

                    except AppException:
                        await session.abort_transaction()
                        raise

                    except Exception as e:
                        await session.abort_transaction()
                        raise AppException(500, f"Transaction failed: {e}")

            assigned_user_data = assigned_user.model_dump(mode="json")
            first_name = assigned_user_data.get("firstName") or ""
            last_name = assigned_user_data.get("lastName") or ""

            failed_count = len(failed)
            message = ""

            if modified_count == 0:
                message = "No enquiries were reassigned"
            elif failed_count == 0:
                message = f"All {modified_count} enquiri{'es' if modified_count > 1 else 'y'} reassigned successfully to {first_name} {last_name}"
            else:
                message = f"{modified_count} enquiri{'es' if modified_count > 1 else 'y'} reassigned to {first_name} {last_name}, {failed_count} failed"

            return {
                "user": f"{first_name} {last_name}".strip(),
                "assignedTo": assigned_to,
                "modifiedCount": modified_count,
                "failedCount": failed_count,
                "failedEnquiries": failed,
                "message": message
            }

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")