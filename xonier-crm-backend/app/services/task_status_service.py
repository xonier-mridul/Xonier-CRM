from app.repositories.task_status_repository import TaskStatusRepository
from app.repositories.task_category_repository import TaskCategoryRepository
from app.db.db import Client
from app.utils.custom_exception import AppException
from app.utils.slug_generator import generate_slug
from app.utils.enquiry_id_generator import generate_enquiry_id
from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder
from datetime import datetime, timezone
from typing import Dict, Any, List
from bson import ObjectId, DBRef
 
 
class TaskStatusService:
    def __init__(self):
        self.repo = TaskStatusRepository()
        self.categoryRepo = TaskCategoryRepository()
        self.client = Client
 
    async def create_task_status(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    category_id = payload.get("category")
 
                    if not ObjectId.is_valid(category_id):
                        raise AppException(400, "Invalid category id")
 
                    category = await self.categoryRepo.find_by_id(
                        id=PydanticObjectId(category_id),
                        session=session
                    )
 
                    if not category or category.deletedAt is not None:
                        raise AppException(404, "Task category not found")
 
                    if not category.isActive:
                        raise AppException(400, "Cannot add status to an inactive category")
 
                    name = payload.get("name", "").strip()
                    slug = generate_slug(name)
 
                    is_exist = await self.repo.find_one({
                        "slug": slug,
                        "category.$id": ObjectId(category_id),
                        "deletedAt": None
                    })
 
                    if is_exist:
                        raise AppException(409, f"Status '{name}' already exists in this category")
 
                    if payload.get("isDefault"):
                        existing_default = await self.repo.find_one({
                            "category.$id": ObjectId(category_id),
                            "isDefault": True,
                            "deletedAt": None
                        })
 
                        if existing_default:
                            await self.repo.update(
                                id=PydanticObjectId(existing_default.id),
                                data={"isDefault": False},
                                session=session
                            )
 
                    if payload.get("isFinal"):
                        existing_final = await self.repo.find_one({
                            "category.$id": ObjectId(category_id),
                            "isFinal": True,
                            "deletedAt": None
                        })
 
                        if existing_final:
                            raise AppException(400, f"Category already has a final status: '{existing_final.name}'. Only one final status allowed per category.")
 
                    status_id = generate_enquiry_id("STS")
 
                    new_payload = {
                        **payload,
                        "status_id": status_id,
                        "slug": slug,
                        "category": PydanticObjectId(category_id),
                        "createdBy": PydanticObjectId(user["_id"]),
                    }
 
                    result = await self.repo.create(data=new_payload, session=session)
 
                    if not result:
                        raise AppException(400, "Task status creation failed")
 
                    return jsonable_encoder(result)
 
                except AppException:
                    raise
 
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def get_all_task_statuses(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 10))
 
            query: Dict[str, Any] = {"deletedAt": None}
 
            if "isActive" in filters:
                query["isActive"] = str(filters["isActive"]).lower() == "true"
 
            if "type" in filters:
                query["type"] = filters["type"]

            if "category" in filters:
                query["category.$id"] = PydanticObjectId(filters["category"])
 
            if "isFinal" in filters:
                query["isFinal"] = str(filters["isFinal"]).lower() == "true"
 
            if "search" in filters and filters["search"].strip():
                regex_data = {"$regex": filters["search"].strip(), "$options": "i"}
                query.update({"$or": [
                    {"name": regex_data},
                    {"slug": regex_data},
                    {"category.name": regex_data},
                    {"order": regex_data}
                ]})
 
            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["category", "createdBy", "updatedBy","icon"],
                sort=["order"]
            )
 
            if not result:
                raise AppException(404, "No task statuses found")
 
            return result
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
 
    async def get_statuses_by_category(self, category_id: str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(category_id):
                raise AppException(400, "Invalid category id")
 
            category = await self.categoryRepo.find_by_id(
                id=PydanticObjectId(category_id)
            )
 
            if not category or category.deletedAt is not None:
                raise AppException(404, "Task category not found")
 
            result = await self.repo.find_many(
                filters={
                    "category.$id": ObjectId(category_id),
                    "deletedAt": None,
                    "isActive": True
                },
                populate=["category", "createdBy"]
            )
 
            result = sorted(result, key=lambda x: x.order)
 
            return jsonable_encoder(result)
 
        except AppException:
            raise
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_task_status_by_id(self, status_id: str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(status_id):
                raise AppException(400, "Invalid status id")
 
            result = await self.repo.find_by_id(
                id=PydanticObjectId(status_id),
                populate=["category", "createdBy", "updatedBy"]
            )
 
            if not result or result.deletedAt is not None:
                raise AppException(404, "Task status not found")
 
            return jsonable_encoder(result)
 
        except AppException:
            raise
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 

    async def update_task_status(self, status_id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(status_id):
                        raise AppException(400, "Invalid status id")

                    is_exist = await self.repo.find_by_id(
                        id=PydanticObjectId(status_id),
                        session=session
                    )

                    if not is_exist or is_exist.deletedAt is not None:
                        raise AppException(404, "Task status not found")

                    category_id = str(is_exist.category.ref.id)

                    update_payload: Dict[str, Any] = {
                        **{k: v for k, v in payload.items() if v is not None},
                        "updatedBy": PydanticObjectId(user["_id"]),
                        "updatedAt": datetime.now(timezone.utc),
                        "category": DBRef("task_categories", PydanticObjectId(payload["category"]))
                    }

                    if "name" in payload and payload["name"]:
                        new_slug = generate_slug(payload["name"])

                        slug_conflict = await self.repo.find_one({
                            "slug": new_slug,
                            "category.$id": ObjectId(category_id),
                            "deletedAt": None,
                            "_id": {"$ne": PydanticObjectId(status_id)}
                        })

                        if slug_conflict:
                            raise AppException(409, f"Status '{payload['name']}' already exists in this category")

                        update_payload["slug"] = new_slug

                    if payload.get("isDefault") is True:
                        existing_default = await self.repo.find_one({
                            "category.$id": ObjectId(category_id),
                            "isDefault": True,
                            "deletedAt": None,
                            "_id": {"$ne": PydanticObjectId(status_id)}
                        })

                        if existing_default:
                            await self.repo.update(
                                id=PydanticObjectId(existing_default.id),
                                data={"isDefault": False},
                                session=session
                            )

                    if payload.get("isFinal") is True:
                        existing_final = await self.repo.find_one({
                            "category.$id": ObjectId(category_id),
                            "isFinal": True,
                            "deletedAt": None,
                            "_id": {"$ne": PydanticObjectId(status_id)}
                        })

                        if existing_final:
                            raise AppException(400, f"Category already has a final status: '{existing_final.name}'")

                    
                    if "order" in payload and payload["order"] is not None:
                        new_order = int(payload["order"])
                        old_order = is_exist.order

                        if new_order != old_order:
                            from app.db.models.task_status_model import TaskStatusModel
                            collection = TaskStatusModel.get_pymongo_collection()

                            base_filter = {
                                "_id": {"$ne": PydanticObjectId(status_id)},
                                "category.$id": ObjectId(category_id),
                                "deletedAt": None,
                            }

                            if new_order < old_order:
                                await collection.update_many(
                                    {
                                        **base_filter,
                                        "order": {"$gte": new_order, "$lt": old_order}
                                    },
                                    {"$inc": {"order": 1}},
                                    session=session
                                )
                            else:
                                await collection.update_many(
                                    {
                                        **base_filter,
                                        "order": {"$gt": old_order, "$lte": new_order}
                                    },
                                    {"$inc": {"order": -1}},
                                    session=session
                                )

                            update_payload["order"] = new_order
                    

                    updated = await self.repo.update(
                        id=PydanticObjectId(status_id),
                        data=update_payload,
                        session=session
                    )

                    if not updated:
                        raise AppException(400, "Task status update failed")

                    return True

                except AppException:
                    raise

                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def reorder_task_statuses(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    statuses = payload.get("statuses", [])
 
                    for item in statuses:
                        status_id = item.get("id")
                        order = item.get("order")
 
                        if not ObjectId.is_valid(status_id):
                            raise AppException(400, f"Invalid status id: {status_id}")
 
                        await self.repo.update(
                            id=PydanticObjectId(status_id),
                            data={
                                "order": order,
                                "updatedBy": PydanticObjectId(user["_id"]),
                                "updatedAt": datetime.now(timezone.utc),
                            },
                            session=session
                        )
 
                    return {"reorderedCount": len(statuses)}
 
                except AppException:
                    raise
 
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def delete_task_status(self, status_id: str, user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(status_id):
                        raise AppException(400, "Invalid status id")
 
                    is_exist = await self.repo.find_by_id(
                        id=PydanticObjectId(status_id),
                        session=session
                    )
 
                    if not is_exist or is_exist.deletedAt is not None:
                        raise AppException(404, "Task status not found")
 
                    from app.db.models.task_model import TaskModel
 
                    task_count = await TaskModel.find({
                        "status.$id": ObjectId(status_id),
                        "deletedAt": None
                    }).count()
 
                    if task_count > 0:
                        raise AppException(
                            400,
                            f"Cannot delete — {task_count} task{'s' if task_count > 1 else ''} are using this status"
                        )
 
                    updated = await self.repo.update(
                        id=PydanticObjectId(status_id),
                        data={
                            "deletedAt": datetime.now(timezone.utc),
                            "updatedBy": PydanticObjectId(user["_id"]),
                        },
                        session=session
                    )
 
                    if not updated:
                        raise AppException(400, "Task status deletion failed")
 
                    return True
 
                except AppException:
                    raise
 
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")



    async def get_all_deleted_statuses(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 10))
 
            query: Dict[str, Any] = {"deletedAt": {"$ne": None}}
 
            if "category" in filters:
                if not ObjectId.is_valid(filters["category"]):
                    raise AppException(400, "Invalid category id")
                query["category.$id"] = ObjectId(filters["category"])
 
            if "search" in filters and filters["search"].strip():
                query["name"] = {"$regex": filters["search"].strip(), "$options": "i"}
 
            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["category", "createdBy", "updatedBy"],
                sort=["-deletedAt"]
            )
 
            if not result:
                raise AppException(404, "No deleted task statuses found")
 
            return result
 
        except AppException:
            raise
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

 
    async def permanent_delete_task_status(self, status_id: str, user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(status_id):
                        raise AppException(400, "Invalid status id")
 
                    is_exist = await self.repo.find_by_id(
                        id=PydanticObjectId(status_id),
                        session=session
                    )
 
                    if not is_exist:
                        raise AppException(404, "Task status not found")
 
                    if is_exist.deletedAt is None:
                        raise AppException(400, "Task status is not soft deleted. Please soft delete it first before permanent deletion")
 
                    from app.db.models.task_model import TaskModel
 
                    task_count = await TaskModel.find({
                        "status.$id": ObjectId(status_id),
                        "deletedAt": None
                    }).count()
 
                    if task_count > 0:
                        raise AppException(
                            400,
                            f"Cannot permanently delete — {task_count} active task{'s' if task_count > 1 else ''} still reference this status"
                        )
 
                    deleted = await self.repo.delete_by_id(
                        id=PydanticObjectId(status_id),
                        session=session
                    )
 
                    if not deleted:
                        raise AppException(400, "Permanent deletion failed")
 
                    return True
 
                except AppException:
                    raise
 
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                


    async def bulk_create_task_statuses(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    category_id = payload.get("category")
                    statuses = payload.get("statuses", [])
 
                    if not ObjectId.is_valid(category_id):
                        raise AppException(400, "Invalid category id")
 
                    category = await self.categoryRepo.find_by_id(
                        id=PydanticObjectId(category_id),
                        session=session
                    )
 
                    if not category or category.deletedAt is not None:
                        raise AppException(404, "Task category not found")
 
                    if not category.isActive:
                        raise AppException(400, "Cannot add statuses to an inactive category")
 
                    has_new_final = any(s.get("isFinal") for s in statuses)
                    has_new_default = any(s.get("isDefault") for s in statuses)
 
                    if has_new_final:
                        existing_final = await self.repo.find_one({
                            "category.$id": ObjectId(category_id),
                            "isFinal": True,
                            "deletedAt": None
                        })
                        if existing_final:
                            raise AppException(400, f"Category already has a final status: '{existing_final.name}'. Only one final status allowed per category.")
 
                    if has_new_default:
                        existing_default = await self.repo.find_one({
                            "category.$id": ObjectId(category_id),
                            "isDefault": True,
                            "deletedAt": None
                        })
                        if existing_default:
                            await self.repo.update(
                                id=PydanticObjectId(existing_default.id),
                                data={"isDefault": False},
                                session=session
                            )
 
                    created = []
                    failed = []
 
                    for index, status_data in enumerate(statuses):
                        try:
                            name = status_data.get("name", "").strip()
                            slug = generate_slug(name)
 
                            is_exist = await self.repo.find_one({
                                "slug": slug,
                                "category.$id": ObjectId(category_id),
                                "deletedAt": None
                            })
 
                            if is_exist:
                                failed.append({
                                    "index": index,
                                    "name": name,
                                    "reason": f"Status '{name}' already exists in this category"
                                })
                                continue
 
                            slug_in_batch = [generate_slug(s.get("name", "")) for s in statuses[:index]]
                            if slug in slug_in_batch:
                                failed.append({
                                    "index": index,
                                    "name": name,
                                    "reason": f"Duplicate status name '{name}' in the same batch"
                                })
                                continue
 
                            status_id = generate_enquiry_id("STS")
 
                            new_payload = {
                                **status_data,
                                "status_id": status_id,
                                "slug": slug,
                                "category": PydanticObjectId(category_id),
                                "createdBy": PydanticObjectId(user["_id"]),
                            }
 
                            result = await self.repo.create(data=new_payload, session=session)
 
                            if result:
                                created.append(jsonable_encoder(result))
 
                        except AppException as e:
                            failed.append({
                                "index": index,
                                "name": status_data.get("name", ""),
                                "reason": e.msg
                            })
 
                    created_count = len(created)
                    failed_count = len(failed)
 
                    if created_count == 0:
                        raise AppException(400, f"All statuses failed to create. Reasons: {[f['reason'] for f in failed]}")
 
                    if created_count == 0:
                        message = "No statuses were created"
                    elif failed_count == 0:
                        message = f"All {created_count} status{'es' if created_count > 1 else ''} created successfully"
                    else:
                        message = f"{created_count} status{'es' if created_count > 1 else ''} created, {failed_count} failed"
 
                    return {
                        "message": message,
                        "totalRequested": len(statuses),
                        "createdCount": created_count,
                        "failedCount": failed_count,
                        "created": created,
                        "failed": failed,
                    }
 
                except AppException:
                    raise
 
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
 
 