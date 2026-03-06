
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.validate_admin import validate_admin
from app.repositories.enquiry_repository import EnquiryRepository
from app.repositories.user_repository import UserRepository
from beanie import PydanticObjectId
from app.core.enums import INFO_TYPE
from fastapi.encoders import jsonable_encoder
from bson import ObjectId, DBRef
from app.utils.get_team_members import GetTeamMembers
from app.core.crypto import Encryption
from app.core.security import hash_value
from datetime import datetime, timezone


class ProspectsService:
    def __init__(self):
        self.repo = EnquiryRepository()
        self.userRepo = UserRepository()
        self.getTeamMembers = GetTeamMembers()
        self.encryption = Encryption()



    async def get_all_active(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            is_admin = validate_admin(user["userRole"])

            page = filters.get("page") or 1
            limit = filters.get("limit") or 10

            query = {"isActive": True, "deletedAt": None}

            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])
                if members:
                    query.update({"createdBy.$id": {"$in": members}})
                else:
                    query.update({"createdBy.$id": PydanticObjectId(user["_id"])})

            if "info" in filters:
                query.update({"infoType": filters["info"]})

            if "enquiry_id" in filters:
                query.update({"enquiry_id": filters["enquiry_id"]})

            if "fullName" in filters:
                query.update({"fullName": filters["fullName"]})

            

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
            

            return jsonable_encoder(prospect.model_dump(mode="json"))
            

            
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
                raise AppException(404, f"User with id {assigned_to.id} not found")
            
            
            object_ids = [PydanticObjectId(eid) for eid in enquiry_ids]


            update_data = {
                "assignTo": DBRef(collection="users", id=PydanticObjectId(assigned_to)),
                "assignBy": DBRef(collection="users", id=PydanticObjectId(user["_id"])),
                "assignedAt": datetime.now(timezone.utc)
            }

            
            modified_count = await self.repo.bulk_update_by_ids(
                ids=object_ids,
                data=update_data
            )

            if not modified_count:
                raise AppException(400, "Bulk assign failed, no documents were updated")
            
            assigned_user = assigned_user.model_dump(mode="json")

            first_name = assigned_user.get("firstName") or ""
            last_name = assigned_user.get("lastName") or ""  

            return {
                "user": f"{first_name} {last_name}",
                "assignedTo": assigned_to,
                "modifiedCount": modified_count
            }

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")