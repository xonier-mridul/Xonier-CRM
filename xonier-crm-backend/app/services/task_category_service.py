from app.repositories.task_category_repository import TaskCategoryRepository
from app.db.db import Client
from app.utils.custom_exception import AppException
from app.utils.slug_generator import generate_slug
from app.utils.enquiry_id_generator import generate_enquiry_id
from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder
from datetime import datetime, timezone
from typing import Dict, Any
 
 
class TaskCategoryService:
    def __init__(self):
        self.repo = TaskCategoryRepository()
        self.client = Client
 
    async def create_task_category(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    name = payload.get("name", "").strip()
                    slug = generate_slug(name)
 
                    is_exist = await self.repo.find_one(
                        {"slug": slug, "deletedAt": None},
                        session=session
                    )
 
                    if is_exist:
                        raise AppException(409, f"Category with name '{name}' already exists")
 
                    category_id = generate_enquiry_id("CAT")
 
                    new_payload = {
                        **payload,
                        "category_id": category_id,
                        "slug": slug,
                        "createdBy": PydanticObjectId(user["_id"]),
                    }
 
                    result = await self.repo.create(data=new_payload, session=session)
 
                    if not result:
                        raise AppException(400, "Task category creation failed")
 
                    return jsonable_encoder(result)
 
                except AppException:
                    raise
 
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def get_all_task_categories(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 10))
 
            query: Dict[str, Any] = {"deletedAt": None}

            
 
            if "isActive" in filters:
                is_active = str(filters["isActive"]).lower() == "true"
                query["isActive"] = is_active
 
            if "visibility" in filters:
                query["visibility"] = filters["visibility"]
 
            if "search" in filters and filters["search"].strip():
                regex_query = {"$regex": filters["search"].strip(), "$options": "i"}

                query.update({"$or": [
                    {"name": regex_query},
                    {"visibility": regex_query},
                    {"slug": regex_query}
                ]})
 
            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["createdBy", "updatedBy"],
                sort=["-createdAt"]
            )
 
            if not result:
                raise AppException(404, "No task categories found")
 
            return result
 
        except AppException:
            raise
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_task_category_by_id(self, category_id: str, user: Dict[str, Any]):
        try:
            if not PydanticObjectId.is_valid(category_id):
                raise AppException(400, "Invalid category id")
 
            result = await self.repo.find_by_id(
                id=PydanticObjectId(category_id),
                populate=["createdBy", "updatedBy"]
            )
 
            if not result:
                raise AppException(404, "Task category not found")
 
            if result.deletedAt is not None:
                raise AppException(404, "Task category not found")
 
            return jsonable_encoder(result)
 
        except AppException:
            raise
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def update_task_category(self, category_id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    print("one")
                    if not PydanticObjectId.is_valid(category_id):
                        raise AppException(400, "Invalid category id")
 
                    is_exist = await self.repo.find_by_id(
                        id=PydanticObjectId(category_id),
                        session=session
                    )
 
                    if not is_exist:
                        raise AppException(404, "Task category not found")
 
                    if is_exist.deletedAt is not None:
                        raise AppException(404, "Task category not found")
 
                    update_payload: Dict[str, Any] = {
                        **{k: v for k, v in payload.items() if v is not None},
                        "updatedBy": PydanticObjectId(user["_id"]),
                        "updatedAt": datetime.now(timezone.utc),
                    }
 
                    if "name" in payload and payload["name"]:
                        new_slug = generate_slug(payload["name"])
 
                        slug_conflict = await self.repo.find_one({
                            "slug": new_slug,
                            "deletedAt": None,
                            "_id": {"$ne": PydanticObjectId(category_id)}
                        })
 
                        if slug_conflict:
                            raise AppException(409, f"Category with name '{payload['name']}' already exists")
 
                        update_payload["slug"] = new_slug
                    print("yes")
                    updated = await self.repo.update(
                        id=PydanticObjectId(category_id),
                        data=update_payload,
                        session=session
                    )
 
                    if not updated:
                        raise AppException(400, "Task category update failed")
 
                    return True
 
                except AppException:
                    raise
 
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def toggle_active(self, category_id: str, user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not PydanticObjectId.is_valid(category_id):
                        raise AppException(400, "Invalid category id")
 
                    is_exist = await self.repo.find_by_id(
                        id=PydanticObjectId(category_id),
                        session=session
                    )
 
                    if not is_exist:
                        raise AppException(404, "Task category not found")
 
                    if is_exist.deletedAt is not None:
                        raise AppException(404, "Task category not found")
 
                    new_status = not is_exist.isActive
 
                    updated = await self.repo.update(
                        id=PydanticObjectId(category_id),
                        data={
                            "isActive": new_status,
                            "updatedBy": PydanticObjectId(user["_id"]),
                            "updatedAt": datetime.now(timezone.utc),
                        },
                        session=session
                    )
 
                    if not updated:
                        raise AppException(400, "Toggle active failed")
 
                    return {"isActive": new_status}
 
                except AppException:
                    raise
 
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def delete_task_category(self, category_id: str, user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not PydanticObjectId.is_valid(category_id):
                        raise AppException(400, "Invalid category id")
 
                    is_exist = await self.repo.find_by_id(
                        id=PydanticObjectId(category_id),
                        session=session
                    )
 
                    if not is_exist:
                        raise AppException(404, "Task category not found")
 
                    if is_exist.deletedAt is not None:
                        raise AppException(404, "Task category not found")
 
                    if is_exist.isDefault:
                        raise AppException(400, "Default categories cannot be deleted")
 
                    from app.db.models.task_status_model import TaskStatusModel
                    from app.db.models.task_model import TaskModel
                    from bson import ObjectId
 
                    status_count = await TaskStatusModel.find({
                        "category.$id": ObjectId(category_id),
                        "deletedAt": None
                    }).count()
 
                    if status_count > 0:
                        raise AppException(
                            400,
                            f"Cannot delete — {status_count} status{'es' if status_count > 1 else ''} are using this category. Delete statuses first."
                        )
 
                    task_count = await TaskModel.find({
                        "category.$id": ObjectId(category_id),
                        "deletedAt": None
                    }).count()
 
                    if task_count > 0:
                        raise AppException(
                            400,
                            f"Cannot delete — {task_count} task{'s' if task_count > 1 else ''} are using this category"
                        )
 
                    updated = await self.repo.update(
                        id=PydanticObjectId(category_id),
                        data={
                            "deletedAt": datetime.now(timezone.utc),
                            "updatedBy": PydanticObjectId(user["_id"]),
                        },
                        session=session
                    )
 
                    if not updated:
                        raise AppException(400, "Task category deletion failed")
 
                    return True
 
                except AppException:
                    raise
 
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")