from app.repositories.enquiry_repository import EnquiryRepository
from typing import Dict, Any, List
from beanie import PydanticObjectId
from app.utils.custom_exception import AppException
from app.db.db import Client
from app.utils.enquiry_id_generator import generate_enquiry_id
from fastapi.encoders import jsonable_encoder
from app.schemas.enquiry_schema import EnquiryRegisterSchema
from pydantic import ValidationError
from pymongo.errors import BulkWriteError
from bson import ObjectId, DBRef
from app.utils.validate_admin import validate_admin, validate_admin_company_admin
from app.utils.get_team_members import GetTeamMembers
from datetime import datetime, timezone
from app.core.crypto import Encryption
from app.db.models.enquiry_management_model import EnquiryModel
from app.repositories.activity_repository import ActivityRepository
from app.repositories.user_repository import UserRepository
from app.core.enums import ACTIVITY_ACTION, ACTIVITY_ENTITY_TYPE
from app.utils.activity_payload import activity_payload


class EnquiryService:
    def __init__(self):
        self.repo = EnquiryRepository()
        self.client = Client
        self.getTeamMembers = GetTeamMembers()
        self.crypto = Encryption()
        self.activityRepo = ActivityRepository()
        self.userRepo = UserRepository()

    async def create(self, createdBy: PydanticObjectId, payload: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()

            if payload.get("assignTo") and not ObjectId.is_valid(payload["assignTo"]):
                raise AppException(400, "Invalid assignTo user ObjectId, make sure it is user object id")

            enquiry_id: str = generate_enquiry_id()

            is_exist = await self.repo.find_by_enquiry_id(
                enquiry_id, None, None, session=session
            )

            is_enquiry_exist = await self.repo.find_one(
                {
                    "fullName": payload["fullName"],
                    "email": payload["email"],
                    "projectType": payload["projectType"],
                },
                None,
                None,
                session=session,
            )

            if is_exist or is_enquiry_exist:
                raise AppException(400, "Enquiry already exist")

            new_payload = {**payload, "createdBy": createdBy, "enquiry_id": enquiry_id}

            new_enquiry = await self.repo.create(data=new_payload, session=session)

            if not new_enquiry:
                raise AppException(400, "Enquiry creation failed")

            await session.commit_transaction()

            return new_enquiry.model_dump(mode="json")

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")

        finally:
            await session.end_session()

    async def bulk_create(self, createdBy: PydanticObjectId, payload: Dict[str, Any]):
        enquiries = payload.get("enquiries")

        if not enquiries or not isinstance(enquiries, list):
            raise AppException(400, "Invalid bulk enquiry payload")

        valid_docs: List[Dict[str, Any]] = []
        failed_rows: List[Dict[str, Any]] = []

        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    for index, row in enumerate(enquiries):
                        try:

                            validated = EnquiryRegisterSchema(**row)

                            enquiry_id = generate_enquiry_id()

                            is_exist = await self.repo.find_one(
                                {
                                    "fullName": validated.fullName,
                                    "email": validated.email,
                                    "projectType": validated.projectType,
                                },
                                session=session,
                            )

                            if is_exist:
                                failed_rows.append(
                                    {
                                        "row": index + 1,
                                        "error": "Duplicate enquiry",
                                        "data": row,
                                    }
                                )
                                continue

                            valid_docs.append(
                                {
                                    **validated.model_dump(),
                                    "createdBy": createdBy,
                                    "enquiry_id": enquiry_id,
                                }
                            )

                        except ValidationError as ve:
                            failed_rows.append(
                                {
                                    "row": index + 1,
                                    "error": ve.errors(),
                                    "data": row,
                                }
                            )

                    if not valid_docs:
                        raise AppException(
                            400,
                            "No valid enquiries found in bulk upload, already exist",
                        )

                    result = await self.repo.bulk_create(valid_docs, session=session)

                    return {
                        "insertedCount": len(valid_docs),
                        "failedCount": len(failed_rows),
                        "failedRows": failed_rows
                    }

                except AppException:
                    raise

                except BulkWriteError as bwe:
                    raise AppException(
                        400, "Bulk insert failed due to duplicate or invalid data"
                    )

                except Exception as e:

                    raise AppException(500, f"Internal server error: {e}")

    async def get_by_id(self, id: PydanticObjectId, user:Dict[str, Any]):
        try:
            is_admin = validate_admin(user["userRole"])
            is_manager = False
            is_creator = False

            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])

                if members:
                    is_manager = True

            result = await self.repo.find_by_id(id, ["createdBy", "assignTo"])

            if not result:
                raise AppException(400, "Enquiry not found")
            

            result = result.model_dump(mode="json")

            if str(user["_id"]) == str(result["createdBy"]["id"]):
                is_creator = True

            if not is_admin and not is_manager and not is_creator:
                raise AppException(403, "Permission denied, you not authorized for access enquiry data")
            
            if result["createdBy"].get("email"):
                result["createdBy"]["email"] = self.crypto.decrypt_data(result["createdBy"]["email"])

            if result["createdBy"].get("phone"):
                result["createdBy"]["phone"] = self.crypto.decrypt_data(result["createdBy"]["phone"])
            
            assigned = result.get("assignTo")
            if assigned:
                if assigned.get("email"):
                    result["assignTo"]["email"] = self.crypto.decrypt_data(result["assignTo"]["email"])

                if assigned.get("phone"):
                    result["assignTo"]["phone"] = self.crypto.decrypt_data(result["assignTo"]["phone"])
               
             


            return result

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def get_all(
        self,
        page: int = 1,
        limit: int = 10,
        filters: Dict[str, Any] = {},
        user=Dict[str, Any],
    ):
        try:
            is_admin = validate_admin_company_admin(user["userRole"])

            is_manager = False

            query = {}
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
                    is_manager = True
                    

                else:
                    query.update(
                        {
                            "$or": [
                                {"createdBy.$id": PydanticObjectId(user["_id"])},
                                {"assignTo.$id": PydanticObjectId(user["_id"])},
                            ]
                        }
                    )

            if "info" in filters:
                query.update({"infoType": filters["info"]})

            if "enquiry_id" in filters:
                query.update({"enquiry_id": filters["enquiry_id"]})

            if "search" in filters and filters["search"].strip():
                regex_Data = {"regex": filters["search"], "$options": "i"}
            
                query.update({"$or": [
                    {"fullName": regex_Data},

                ]})

            if "fullName" in filters:
                query.update({"fullName": {"$regex": filters["fullName"], "$options": "i"}})

            if "email" in filters:
                query.update({"email": filters["email"]})

            if "country" in filters:
                query.update({"location.country": filters["country"]})

            if "city" in filters:
                query.update({"location.city": filters["city"]})

            if "state" in filters:
                query.update({"location.state": filters["state"]})

            if "zipcode" in filters:
                query.update({"location.zipcode": filters["zipcode"]})

            if "phone" in filters:
                query.update({"phone": filters["phone"]})

            if "companyName" in filters:
                query.update({"companyName": filters["companyName"]})

            if "projectType" in filters:
                query.update({"projectType": filters["projectType"]})

            if "priority" in filters:
                query.update({"priority", filters["priority"]})

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
                page=page,
                limit=limit,
                filters=query,
                populate=["assignTo", "createdBy"],
                sort=["-createdAt"],
            )

            if not is_admin and not is_manager:
                raise AppException(403, "Permission denied, you not authorized for access enquiry data")

            if not result:
                raise AppException(404, "Enquiry data not found")

            return jsonable_encoder(result, exclude={"password"})

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error {e}")

    async def get_all_by_creator(
        self,
        user: Dict[str, Any],
        page: int = 1,
        limit: int = 10,
        filters: Dict[str, Any] = {},
    ):
        try:
            user_object_id = ObjectId(user["_id"])
            user_string_id = PydanticObjectId(user["_id"])

            query = {
                "$and": [
                    {
                        "$or": [
                            {"createdBy.$id": user_object_id},
                            {"assignTo.$id": user_string_id},
                        ]
                    }
                ]
            }

            if "enquiry_id" in filters:
                query["$and"].append({"enquiry_id": filters["enquiry_id"]})

            if "fullName" in filters:
                query["$and"].append({"fullName": {"$regex": filters["fullName"], "$options": "i"}})

            if "email" in filters:
                query["$and"].append({"email": filters["email"]})

            if "phone" in filters:
                query["$and"].append({"phone": filters["phone"]})

            if "companyName" in filters:
                query["$and"].append({"companyName": {"$regex": filters["companyName"], "$options": "i"}})

            if "projectType" in filters:
                query["$and"].append({"projectType": filters["projectType"]})

            if "priority" in filters:
                query["$and"].append({"priority": filters["priority"]})

            result = await self.repo.get_all(
                page, limit, query, ["assignTo", "createdBy"], sort=["-createdAt"]
            )

            if not result:
                raise AppException(404, "Enquiry data not found")

            return jsonable_encoder(result, exclude={"password"})

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error: {e}")
    
    async def bulk_assign(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    enquiry_ids = payload.get("enquiryIds", [])
                    assigned_to = payload.get("assignedTo")

                    if not enquiry_ids:
                        raise AppException(400, "Enquiry ids are required")

                    if not assigned_to:
                        raise AppException(400, "assignedTo is required")

                    if not ObjectId.is_valid(assigned_to):
                        raise AppException(400, "Invalid assignedTo user ObjectId")

                    for eid in enquiry_ids:
                        if not ObjectId.is_valid(eid):
                            raise AppException(400, f"Invalid enquiry ObjectId: {eid}")

                    assign_user = await self.userRepo.find_by_id(PydanticObjectId(assigned_to))

                    if not assign_user:
                        raise AppException(404, "User not found for assignedTo id")

                    enquiry_object_ids = [PydanticObjectId(eid) for eid in enquiry_ids]

                    enquiries = await self.repo.find_many(
                        filters={"_id": {"$in": enquiry_object_ids}}
                    )

                    if not enquiries:
                        raise AppException(404, "No enquiries found for the provided ids")

                    if len(enquiries) != len(enquiry_ids):
                        found_ids = {str(e.id) for e in enquiries}
                        missing = [eid for eid in enquiry_ids if eid not in found_ids]
                        raise AppException(404, f"Enquiries not found for ids: {', '.join(missing)}")

                    assign_dbref = DBRef(collection="users", id=str(assigned_to))

                    update_payload = {
                        "assignTo": assign_dbref,
                        "assignBy": DBRef(collection="users", id=str(user["_id"])),
                        "assignedAt": datetime.now(timezone.utc),
                        "updatedBy": PydanticObjectId(user["_id"]),
                    }

                    updated = await self.repo.bulk_update(
                        filters={"_id": {"$in": enquiry_object_ids}},
                        data=update_payload,
                        session=session
                    )

                    if not updated:
                        raise AppException(400, "Bulk assign failed")

                    activities = [
                        activity_payload(
                            userId=PydanticObjectId(user["_id"]),
                            entityType=ACTIVITY_ENTITY_TYPE.ENQUIRY.value,
                            entityId=PydanticObjectId(enquiry.id),
                            action=ACTIVITY_ACTION.UPDATED,
                            title="bulk assign enquiry",
                            metadata={
                                "enquiryId": enquiry.enquiry_id,
                                "enquiryName": enquiry.fullName,
                                "assignedTo": str(assigned_to),
                                "assignedBy": str(user["_id"]),
                            }
                        )
                        for enquiry in enquiries
                    ]

                    is_activity = await self.activityRepo.bulk_create(data=activities, session=session)

                    if not is_activity:
                        raise AppException(400, "Activity log failed")

                    return {
                        "totalRequested": len(enquiry_ids),
                        "assignedCount": len(enquiries),
                        "assignedTo": str(assigned_to),
                        "assignedBy": str(user["_id"]),
                    }

                except AppException:
                    raise

                except Exception as e:
                    raise AppException(status_code=500, message=f"internal server error: {e}")


    async def update(
    self, updatedBy: PydanticObjectId, id: PydanticObjectId, payload: Dict[str, Any]
    ) -> bool:
        session = await self.client.start_session()
        try:
            session.start_transaction()

            is_exist = await self.repo.find_by_id(id, None, session=session)

            if not is_exist:
                raise AppException(404, "Enquiry not found")

            
            if payload.get("assignTo") and not ObjectId.is_valid(payload["assignTo"]):
                raise AppException(400, "Invalid assignTo user ObjectId")

            
            newPayload: Dict[str, Any] = {**payload, "updatedBy": updatedBy, "assignTo": DBRef(collection="users", id=payload.get("assignTo")) if payload.get("assignTo") else None}

            update = await self.repo.update(id=id, data=newPayload, session=session)

            if not update:
                raise AppException(400, "Enquiry update failed")

            await session.commit_transaction()

            return True

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"Internal server error: {e}") 

        finally:
            await session.end_session()

    async def delete(self, id: PydanticObjectId) -> bool:
        try:
            result = await self.repo.delete_by_id(id)

            if not result:
                raise AppException(400, "Enquiry not delete")

            return True

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")
