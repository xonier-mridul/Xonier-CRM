from app.repositories.task_repository import TaskRepository
from app.repositories.task_category_repository import TaskCategoryRepository
from app.repositories.task_status_repository import TaskStatusRepository
from app.repositories.task_activity_repository import TaskActivityRepository
from app.repositories.user_repository import UserRepository
from app.db.models.task_activity_model import TaskActivityModel
from app.db.db import Client
from app.utils.custom_exception import AppException
from app.utils.enquiry_id_generator import generate_enquiry_id
from app.utils.validate_admin import validate_admin
from app.utils.get_team_members import GetTeamMembers
from app.core.enums import TASK_ACTIVITY_ACTION
from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder
from datetime import datetime, timezone
from typing import Dict, Any, List
from bson import ObjectId, DBRef
from app.core.crypto import encryptor
 
 
def _activity(task_id, action, performer_id, description, field=None, old_val=None, new_val=None, metadata=None):
    return {
        "task": PydanticObjectId(task_id),
        "action": action,
        "field": field,
        "oldValue": str(old_val) if old_val is not None else None,
        "newValue": str(new_val) if new_val is not None else None,
        "description": description,
        "metadata": metadata,
        "performedBy": PydanticObjectId(performer_id),
    }
 
 
class TaskService:
    def __init__(self):
        self.repo = TaskRepository()
        self.categoryRepo = TaskCategoryRepository()
        self.statusRepo = TaskStatusRepository()
        self.activityRepo = TaskActivityRepository()
        self.userRepo = UserRepository()
        self.getTeamMembers = GetTeamMembers()
        self.client = Client
        self.crypto = encryptor
 
    async def _resolve_default_status(self, category_id: str):
        default_status = await self.statusRepo.find_one({
            "category.$id": ObjectId(category_id),
            "isDefault": True,
            "deletedAt": None,
            "isActive": True,
        })
        if not default_status:
            default_status = await self.statusRepo.find_one({
                "category.$id": ObjectId(category_id),
                "deletedAt": None,
                "isActive": True,
            })
        return default_status
 
    async def _validate_status_belongs_to_category(self, status_id: str, category_id: str):
        status = await self.statusRepo.find_one({
            "_id": ObjectId(status_id),
            "category.$id": ObjectId(category_id),
            "deletedAt": None,
        })
        if not status:
            raise AppException(400, "Status does not belong to the selected category")
        return status
 
    def _build_visibility_query(self, user: Dict[str, Any], members: list, user_object_id):
        if members:
            return {
                "$or": [
                    {"createdBy.$id": user_object_id},
                    {"assignedTo.$id": user_object_id},
                    {"createdBy.$id": {"$in": members}},
                    {"assignedTo.$id": {"$in": members}},
                ]
            }
        return {
            "$or": [
                {"createdBy.$id": user_object_id},
                {"assignedTo.$id": user_object_id},
            ]
        }
 
    async def create_task(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    category_id = payload.get("category")
                    if not ObjectId.is_valid(category_id):
                        raise AppException(400, "Invalid category id")
 
                    category = await self.categoryRepo.find_by_id(PydanticObjectId(category_id))
                    if not category or category.deletedAt:
                        raise AppException(404, "Task category not found")
                    if not category.isActive:
                        raise AppException(400, "Cannot create task in an inactive category")
 
                    status_id = payload.get("status")
                    if status_id:
                        if not ObjectId.is_valid(status_id):
                            raise AppException(400, "Invalid status id")
                        status = await self._validate_status_belongs_to_category(status_id, category_id)
                    else:
                        status = await self._resolve_default_status(category_id)
                        if not status:
                            raise AppException(400, "No active status found for this category. Please create a status first.")
                        status_id = str(status.id)
 
                    parent_task_id = payload.get("parentTask")
                    if parent_task_id:
                        if not ObjectId.is_valid(parent_task_id):
                            raise AppException(400, "Invalid parentTask id")
                        parent = await self.repo.find_by_id(PydanticObjectId(parent_task_id))
                        if not parent or parent.deletedAt:
                            raise AppException(404, "Parent task not found")
 
                    assigned_to = payload.get("assignedTo", [])
                    for uid in assigned_to:
                        if not ObjectId.is_valid(uid):
                            raise AppException(400, f"Invalid assignedTo user id: {uid}")
 
                    task_id = generate_enquiry_id("TASK")
 
                    new_payload = {
                        **payload,
                        "task_id": task_id,
                        "category": PydanticObjectId(category_id),
                        "status": PydanticObjectId(status_id),
                        "assignedTo": [PydanticObjectId(uid) for uid in assigned_to],
                        "createdBy": PydanticObjectId(user["_id"]),
                    }
 
                    if assigned_to:
                        new_payload["assignedBy"] = PydanticObjectId(user["_id"])
                        new_payload["assignedAt"] = datetime.now(timezone.utc)
 
                    if parent_task_id:
                        new_payload["parentTask"] = PydanticObjectId(parent_task_id)
 
                    for date_field in ["dueDate", "startDate", "recurrenceEndsAt"]:
                        if payload.get(date_field):
                            try:
                                new_payload[date_field] = datetime.fromisoformat(payload[date_field])
                            except ValueError:
                                raise AppException(400, f"Invalid {date_field} format. Use ISO format.")
 
                    result = await self.repo.create(data=new_payload, session=session)
                    if not result:
                        raise AppException(400, "Task creation failed")
 
                    activity = _activity(
                        task_id=str(result.id),
                        action=TASK_ACTIVITY_ACTION.CREATED,
                        performer_id=user["_id"],
                        description=f"Task '{result.title}' created",
                        metadata={"taskId": task_id, "title": result.title}
                    )
                    await self.activityRepo.create(data=activity, session=session)
 
                    return jsonable_encoder(result)
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def get_all_tasks(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 10))
            is_admin = validate_admin(user["userRole"])
 
            query: Dict[str, Any] = {"deletedAt": None}
 
            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])
                user_object_id = PydanticObjectId(user["_id"])
                query.update(self._build_visibility_query(user, members, user_object_id))
 
            if "category" in filters:
                if not ObjectId.is_valid(filters["category"]):
                    raise AppException(400, "Invalid category id")
                query["category.$id"] = ObjectId(filters["category"])
 
            if "status" in filters:
                if not ObjectId.is_valid(filters["status"]):
                    raise AppException(400, "Invalid status id")
                query["status.$id"] = ObjectId(filters["status"])
 
           
 
            if "assignedTo" in filters:
                if not ObjectId.is_valid(filters["assignedTo"]):
                    raise AppException(400, "Invalid assignedTo user id")
                query["assignedTo.$id"] = PydanticObjectId(filters["assignedTo"])
 
          
 
            
            if "parentTask" in filters:
                if filters["parentTask"] == "null":
                    query["parentTask"] = None
                elif ObjectId.is_valid(filters["parentTask"]):
                    query["parentTask.$id"] = ObjectId(filters["parentTask"])
 
            if "isOverdue" in filters and str(filters["isOverdue"]).lower() == "true":
                query["dueDate"] = {"$lt": datetime.now(timezone.utc)}
                query["completedAt"] = None
 
            if "search" in filters and filters["search"].strip():
                regex_data = {"$regex": filters["search"].strip(), "$options": "i"}
                query.update({"$or": [
                    {"title": regex_data},
                    {"priority": regex_data},
                    {"tags": regex_data},
                    {"entityId": regex_data},
                    {"entityType": regex_data},
                    {"status": regex_data}
                ]})
 
           
 
            if "fromDate" in filters or "toDate" in filters:
                date_filter = {}
                if "fromDate" in filters:
                    try:
                        date_filter["$gte"] = datetime.fromisoformat(filters["fromDate"]).replace(hour=0, minute=0, second=0, tzinfo=timezone.utc)
                    except ValueError:
                        raise AppException(400, "Invalid fromDate format")
                if "toDate" in filters:
                    try:
                        date_filter["$lte"] = datetime.fromisoformat(filters["toDate"]).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
                    except ValueError:
                        raise AppException(400, "Invalid toDate format")
                query["dueDate"] = date_filter
            
            
            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["category", "status", "assignedTo", "createdBy", "updatedBy"],
                sort=["order", "-createdAt"]
            )
 
            if not result:
                raise AppException(404, "No tasks found")
            
           
 
            now = datetime.now(timezone.utc)
            for task in result.get("data", []):
                try:
                    due = task.get("dueDate")
                    completed = task.get("completedAt")

                    if due is None:
                        task["isOverdue"] = False
                        continue

                    if isinstance(due, str):
                        due = due.replace("Z", "+00:00")
                        due_dt = datetime.fromisoformat(due)
                        if due_dt.tzinfo is None:
                            due_dt = due_dt.replace(tzinfo=timezone.utc)
                    elif isinstance(due, datetime):
                        due_dt = due if due.tzinfo else due.replace(tzinfo=timezone.utc)
                    else:
                        task["isOverdue"] = False
                        continue

                    if completed is not None:
                        task["isOverdue"] = False
                        continue

                    task["isOverdue"] = due_dt < now

                except Exception as ex:
                    print(f"isOverdue error for task {task.get('task_id')}: {ex}")
                    task["isOverdue"] = False


           
                
            return result
    
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_kanban_board(self, category_id: str, user: Dict[str, Any], filters: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(category_id):
                raise AppException(400, "Invalid category id")
 
            category = await self.categoryRepo.find_by_id(PydanticObjectId(category_id))
            if not category or category.deletedAt:
                raise AppException(404, "Task category not found")
 
            statuses = await self.statusRepo.find_many(
                filters={
                    "category.$id": ObjectId(category_id),
                    "deletedAt": None,
                    "isActive": True,
                },
                populate=["category"]
            )
            statuses = sorted(statuses, key=lambda x: x.order)
 
            is_admin = validate_admin(user["userRole"])
            base_query: Dict[str, Any] = {
                "deletedAt": None,
                "category.$id": ObjectId(category_id),
            }
 
            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])
                user_object_id = PydanticObjectId(user["_id"])
                base_query.update(self._build_visibility_query(user, members, user_object_id))
 
            if "assignedTo" in filters and ObjectId.is_valid(filters["assignedTo"]):
                base_query["assignedTo.$id"] = PydanticObjectId(filters["assignedTo"])
 
            if "priority" in filters:
                base_query["priority"] = filters["priority"]
 
            if "search" in filters and filters["search"].strip():
                base_query["title"] = {"$regex": filters["search"].strip(), "$options": "i"}
 
            board = []
            now = datetime.now(timezone.utc)
            task_activities = []
 
            for status in statuses:
                
                task_query = {**base_query, "status.$id": PydanticObjectId(str(status.id))}

                
                tasks = await self.repo.find_many(
                    filters=task_query,
                    populate=["status", "assignedTo", "createdBy"]
                )
                tasks = sorted(tasks, key=lambda x: x.order)
                tasks_encoded = jsonable_encoder(tasks)
 
                for task in tasks_encoded:
                    due = task.get("dueDate")
                    completed = task.get("completedAt")
                    task_id = task.get("_id")
                    task_activities = await self.activityRepo.find_many(
                        filters={"task.$id": PydanticObjectId(task_id)},
                        
                        populate=["performedBy"],
                        sort=["-createdAt"]
                    )
                    task["activities"] = task_activities[0]

                    if due and not completed:
                        try:
                            if isinstance(due, str):
                                due_dt = datetime.fromisoformat(due.replace("Z", "+00:00"))
                            else:
                                due_dt = due

                            
                            if due_dt.tzinfo is None:
                                due_dt = due_dt.replace(tzinfo=timezone.utc)

                            task["isOverdue"] = due_dt < now

                        except Exception:
                            task["isOverdue"] = False
 
                board.append({
                    "status": jsonable_encoder(status),
                    "tasks": tasks_encoded,
                    "count": len(tasks_encoded),
                })
 
            return {
                "category": jsonable_encoder(category),
                "columns": board,
                "totalStatuses": len(statuses),
            }
 
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_task_by_id(self, task_id: str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(task_id):
                raise AppException(400, "Invalid task id")
 
            result = await self.repo.find_by_id(
                id=PydanticObjectId(task_id),
                populate=["category", "status", "assignedTo", "createdBy", "updatedBy", "watchers", "parentTask"]
            )
 
            if not result or result.deletedAt:
                raise AppException(404, "Task not found")
 
            encoded = jsonable_encoder(result)
            
            assigned_users = encoded.get("assignedTo", [])

            decoded_users = []
            
            for item in assigned_users:
                item["email"] = self.crypto.decrypt_data(item["email"])
                decoded_users.append(item)

            encoded["assignedTo"] = decoded_users
            
            now = datetime.now(timezone.utc)
            if result.dueDate and not result.completedAt:
                due_dt = result.dueDate if result.dueDate.tzinfo else result.dueDate.replace(tzinfo=timezone.utc)
                encoded["isOverdue"] = due_dt < now
 
            return encoded
 
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
 
    async def get_my_tasks(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 10))
            user_string_id = str(user["_id"])
 
            query: Dict[str, Any] = {
                "deletedAt": None,
                "$or": [
                    {"assignedTo.$id": PydanticObjectId(user["_id"])},
                    {"assignedTo.$id": user_string_id},
                ]
            }
 
            if "status" in filters and ObjectId.is_valid(filters["status"]):
                query["status.$id"] = ObjectId(filters["status"])
 
            if "priority" in filters:
                query["priority"] = filters["priority"]
 
            if "category" in filters and ObjectId.is_valid(filters["category"]):
                query["category.$id"] = ObjectId(filters["category"])
 
            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["category", "status", "assignedTo", "createdBy"],
                sort=["-dueDate", "-createdAt"]
            )
 
            if not result:
                raise AppException(404, "No tasks found")
 
            return result
 
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_tasks_by_entity(self, entity_type: str, entity_id: str, user: Dict[str, Any]):
        try:
            query: Dict[str, Any] = {
                "deletedAt": None,
                "entityType": entity_type,
                "entityId": entity_id,
            }
 
            tasks = await self.repo.find_many(
                filters=query,
                populate=["category", "status", "assignedTo", "createdBy"]
            )
 
            tasks = sorted(tasks, key=lambda x: x.order)
            return jsonable_encoder(tasks)
 
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def update_task(self, task_id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(task_id):
                        raise AppException(400, "Invalid task id")
 
                    existing = await self.repo.find_by_id(PydanticObjectId(task_id), session=session)
                    if not existing or existing.deletedAt:
                        raise AppException(404, "Task not found")
                    
                    assignedTo = [DBRef("users", PydanticObjectId(item)) for item in payload["assignedTo"]]

                    
 
                    update_payload: Dict[str, Any] = {
                        **{k: v for k, v in payload.items() if v is not None},
                        "updatedBy": PydanticObjectId(user["_id"]),
                        "updatedAt": datetime.now(timezone.utc),
                        "status": DBRef("task_statuses", PydanticObjectId(payload["status"])),
                        "assignedTo": assignedTo
                    }
 
                    activities = []
 
                    if "title" in payload and payload["title"] != existing.title:
                        activities.append(_activity(task_id, TASK_ACTIVITY_ACTION.UPDATED, user["_id"], f"Title changed", "title", existing.title, payload["title"]))
 
                    if "priority" in payload and payload["priority"] != existing.priority:
                        activities.append(_activity(task_id, TASK_ACTIVITY_ACTION.PRIORITY_CHANGED, user["_id"], f"Priority changed from {existing.priority} to {payload['priority']}", "priority", existing.priority, payload["priority"]))
 
                    if "dueDate" in payload:
                        try:
                            update_payload["dueDate"] = datetime.fromisoformat(payload["dueDate"])
                            activities.append(_activity(task_id, TASK_ACTIVITY_ACTION.DUE_DATE_CHANGED, user["_id"], f"Due date updated", "dueDate", str(existing.dueDate), payload["dueDate"]))
                        except ValueError:
                            raise AppException(400, "Invalid dueDate format")
 
                    for date_field in ["startDate", "recurrenceEndsAt"]:
                        if payload.get(date_field):
                            try:
                                update_payload[date_field] = datetime.fromisoformat(payload[date_field])
                            except ValueError:
                                raise AppException(400, f"Invalid {date_field} format")
                            
                    
                    
                    updated = await self.repo.update(id=PydanticObjectId(task_id), data=update_payload, session=session)
                    if not updated:
                        raise AppException(400, "Task update failed")
 
                    for act in activities:
                        await self.activityRepo.create(data=act, session=session)
 
                    return True
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def update_task_status(self, task_id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(task_id):
                        raise AppException(400, "Invalid task id")
 
                    new_status_id = payload.get("status")
                    if not ObjectId.is_valid(new_status_id):
                        raise AppException(400, "Invalid status id")
 
                    existing = await self.repo.find_by_id(PydanticObjectId(task_id), session=session)
                    if not existing or existing.deletedAt:
                        raise AppException(404, "Task not found")
 
                    category_id = str(existing.category.ref.id)
                    new_status = await self._validate_status_belongs_to_category(new_status_id, category_id)
 
                    old_status = await self.statusRepo.find_by_id(PydanticObjectId(str(existing.status.ref.id)))
                    old_status_name = old_status.name if old_status else "Unknown"
 
                    update_data: Dict[str, Any] = {
                        "status": PydanticObjectId(new_status_id),
                        "updatedBy": PydanticObjectId(user["_id"]),
                        "updatedAt": datetime.now(timezone.utc),
                    }
 
                    if new_status.isFinal:
                        update_data["completedAt"] = datetime.now(timezone.utc)
                        update_data["isOverdue"] = False
 
                    updated = await self.repo.update(id=PydanticObjectId(task_id), data=update_data, session=session)
                    if not updated:
                        raise AppException(400, "Task status update failed")
 
                    activity = _activity(
                        task_id=task_id,
                        action=TASK_ACTIVITY_ACTION.STATUS_CHANGED,
                        performer_id=user["_id"],
                        description=f"Status changed from '{old_status_name}' to '{new_status.name}'",
                        field="status",
                        old_val=old_status_name,
                        new_val=new_status.name,
                    )
                    await self.activityRepo.create(data=activity, session=session)
 
                    return {"completedAt": update_data.get("completedAt")}
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def move_task(self, task_id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(task_id):
                        raise AppException(400, "Invalid task id")
 
                    new_status_id = payload.get("status")
                    new_order = payload.get("order", 0)
 
                    if not ObjectId.is_valid(new_status_id):
                        raise AppException(400, "Invalid status id")
 
                    existing = await self.repo.find_by_id(PydanticObjectId(task_id), session=session)
                    if not existing or existing.deletedAt:
                        raise AppException(404, "Task not found")
 
                    category_id = str(existing.category.ref.id)
                    new_status = await self._validate_status_belongs_to_category(new_status_id, category_id)
 
                    old_status = await self.statusRepo.find_by_id(PydanticObjectId(str(existing.status.ref.id)))
                    old_status_name = old_status.name if old_status else "Unknown"
 
                    update_data: Dict[str, Any] = {
                        "status": DBRef(
                            collection="task_statuses",
                            id=ObjectId(new_status_id)  
                        ),
                        "order": new_order,
                        "updatedBy": DBRef("users", user["_id"]),
                        "updatedAt": datetime.now(timezone.utc),
                    }
 
                    if new_status.isFinal:
                        update_data["completedAt"] = datetime.now(timezone.utc)
                        update_data["isOverdue"] = False
 
                    updated = await self.repo.update(id=PydanticObjectId(task_id), data=update_data, session=session)
                    if not updated:
                        raise AppException(400, "Task move failed")
 
                    status_changed = new_status_id != str(existing.status.ref.id)
                    if status_changed:
                        activity = _activity(
                            task_id=task_id,
                            action=TASK_ACTIVITY_ACTION.STATUS_CHANGED,
                            performer_id=user["_id"],
                            description=f"Task moved from '{old_status_name}' to '{new_status.name}'",
                            field="status",
                            old_val=old_status_name,
                            new_val=new_status.name,
                        )
                        await self.activityRepo.create(data=activity, session=session)
 
                    return True
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def reorder_tasks(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    tasks = payload.get("tasks", [])
                    for item in tasks:
                        task_id = item.get("id")
                        order = item.get("order")
                        if not ObjectId.is_valid(task_id):
                            raise AppException(400, f"Invalid task id: {task_id}")
                        await self.repo.update(
                            id=PydanticObjectId(task_id),
                            data={
                                "order": order,
                                "updatedBy": PydanticObjectId(user["_id"]),
                                "updatedAt": datetime.now(timezone.utc),
                            },
                            session=session
                        )
 
                    return {"reorderedCount": len(tasks)}
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def assign_task(self, task_id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(task_id):
                        raise AppException(400, "Invalid task id")
 
                    existing = await self.repo.find_by_id(PydanticObjectId(task_id), session=session)
                    if not existing or existing.deletedAt:
                        raise AppException(404, "Task not found")
 
                    assigned_to = payload.get("assignedTo", [])
                    for uid in assigned_to:
                        if not ObjectId.is_valid(uid):
                            raise AppException(400, f"Invalid user id: {uid}")
 
                    updated = await self.repo.update(
                        id=PydanticObjectId(task_id),
                        data={
                            "assignedTo": [PydanticObjectId(uid) for uid in assigned_to],
                            "assignedBy": PydanticObjectId(user["_id"]),
                            "assignedAt": datetime.now(timezone.utc),
                            "updatedBy": PydanticObjectId(user["_id"]),
                            "updatedAt": datetime.now(timezone.utc),
                        },
                        session=session
                    )
 
                    if not updated:
                        raise AppException(400, "Task assignment failed")
 
                    activity = _activity(
                        task_id=task_id,
                        action=TASK_ACTIVITY_ACTION.ASSIGNED,
                        performer_id=user["_id"],
                        description=f"Task assigned to {len(assigned_to)} user{'s' if len(assigned_to) > 1 else ''}",
                        field="assignedTo",
                        metadata={"assignedTo": assigned_to}
                    )
                    await self.activityRepo.create(data=activity, session=session)
 
                    return True
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def add_watcher(self, task_id: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(task_id):
                        raise AppException(400, "Invalid task id")
 
                    watcher_id = payload.get("userId")
                    if not ObjectId.is_valid(watcher_id):
                        raise AppException(400, "Invalid userId")
 
                    existing = await self.repo.find_by_id(PydanticObjectId(task_id), session=session)
                    if not existing or existing.deletedAt:
                        raise AppException(404, "Task not found")
 
                    watcher_obj_id = PydanticObjectId(watcher_id)
                    current_watcher_ids = [str(w.ref.id) if hasattr(w, 'ref') else str(w) for w in (existing.watchers or [])]
 
                    if watcher_id in current_watcher_ids:
                        raise AppException(400, "User is already watching this task")
 
                    from app.db.models.task_model import TaskModel
                    from beanie.operators import Push
 
                    await TaskModel.find_one({"_id": PydanticObjectId(task_id)}).update(
                        {"$push": {"watchers": watcher_obj_id}},
                        session=session
                    )
 
                    return True
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def remove_watcher(self, task_id: str, watcher_id: str, user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(task_id) or not ObjectId.is_valid(watcher_id):
                        raise AppException(400, "Invalid id")
 
                    existing = await self.repo.find_by_id(PydanticObjectId(task_id), session=session)
                    if not existing or existing.deletedAt:
                        raise AppException(404, "Task not found")
 
                    from app.db.models.task_model import TaskModel
 
                    await TaskModel.find_one({"_id": PydanticObjectId(task_id)}).update(
                        {"$pull": {"watchers": PydanticObjectId(watcher_id)}},
                        session=session
                    )
 
                    return True
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def bulk_assign_tasks(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    task_ids = payload.get("taskIds", [])
                    assigned_to = payload.get("assignedTo", [])
 
                    for tid in task_ids:
                        if not ObjectId.is_valid(tid):
                            raise AppException(400, f"Invalid task id: {tid}")
                    for uid in assigned_to:
                        if not ObjectId.is_valid(uid):
                            raise AppException(400, f"Invalid user id: {uid}")
 
                    task_object_ids = [PydanticObjectId(tid) for tid in task_ids]
 
                    updated = await self.repo.bulk_update(
                        filters={"_id": {"$in": task_object_ids}, "deletedAt": None},
                        data={
                            "assignedTo": [PydanticObjectId(uid) for uid in assigned_to],
                            "assignedBy": PydanticObjectId(user["_id"]),
                            "assignedAt": datetime.now(timezone.utc),
                            "updatedBy": PydanticObjectId(user["_id"]),
                            "updatedAt": datetime.now(timezone.utc),
                        },
                        session=session
                    )
 
                    return {"updatedCount": updated}
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def bulk_update_status(self, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    task_ids = payload.get("taskIds", [])
                    new_status_id = payload.get("status")
 
                    if not ObjectId.is_valid(new_status_id):
                        raise AppException(400, "Invalid status id")
 
                    for tid in task_ids:
                        if not ObjectId.is_valid(tid):
                            raise AppException(400, f"Invalid task id: {tid}")
 
                    status = await self.statusRepo.find_by_id(PydanticObjectId(new_status_id))
                    if not status or status.deletedAt:
                        raise AppException(404, "Status not found")
 
                    update_data: Dict[str, Any] = {
                        "status": PydanticObjectId(new_status_id),
                        "updatedBy": PydanticObjectId(user["_id"]),
                        "updatedAt": datetime.now(timezone.utc),
                    }
 
                    if status.isFinal:
                        update_data["completedAt"] = datetime.now(timezone.utc)
                        update_data["isOverdue"] = False
 
                    task_object_ids = [PydanticObjectId(tid) for tid in task_ids]
 
                    updated = await self.repo.bulk_update(
                        filters={"_id": {"$in": task_object_ids}, "deletedAt": None},
                        data=update_data,
                        session=session
                    )
 
                    return {"updatedCount": updated}
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def delete_task(self, task_id: str, user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(task_id):
                        raise AppException(400, "Invalid task id")
 
                    existing = await self.repo.find_by_id(PydanticObjectId(task_id), session=session)
                    if not existing or existing.deletedAt:
                        raise AppException(404, "Task not found")
 
                    updated = await self.repo.update(
                        id=PydanticObjectId(task_id),
                        data={
                            "deletedAt": datetime.now(timezone.utc),
                            "updatedBy": PydanticObjectId(user["_id"]),
                        },
                        session=session
                    )
 
                    if not updated:
                        raise AppException(400, "Task deletion failed")
 
                    activity = _activity(
                        task_id=task_id,
                        action=TASK_ACTIVITY_ACTION.DELETED,
                        performer_id=user["_id"],
                        description=f"Task '{existing.title}' deleted",
                    )
                    await self.activityRepo.create(data=activity, session=session)
 
                    return True
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def get_task_activity(self, task_id: str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(task_id):
                raise AppException(400, "Invalid task id")
 
            activities = await self.activityRepo.find_many(
                filters={"task.$id": ObjectId(task_id)},
                populate=["performedBy"]
            )
 
            activities = sorted(activities, key=lambda x: x.createdAt, reverse=True)
            return jsonable_encoder(activities)
 
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_due_today(self, user: Dict[str, Any]):
        try:
            now = datetime.now(timezone.utc)
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
 
            query: Dict[str, Any] = {
                "deletedAt": None,
                "completedAt": None,
                "dueDate": {"$gte": start, "$lte": end},
            }
 
            is_admin = validate_admin(user["userRole"])
            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])
                user_object_id = PydanticObjectId(user["_id"])
                query.update(self._build_visibility_query(user, members, user_object_id))
 
            tasks = await self.repo.find_many(
                filters=query,
                populate=["category", "status", "assignedTo", "createdBy"]
            )
 
            return jsonable_encoder(tasks)
 
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
    async def get_overdue_tasks(self, user: Dict[str, Any]):
        try:
            now = datetime.now(timezone.utc)
 
            query: Dict[str, Any] = {
                "deletedAt": None,
                "completedAt": None,
                "dueDate": {"$lt": now},
            }
 
            is_admin = validate_admin(user["userRole"])
            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])
                user_object_id = PydanticObjectId(user["_id"])
                query.update(self._build_visibility_query(user, members, user_object_id))
 
            tasks = await self.repo.find_many(
                filters=query,
                populate=["category", "status", "assignedTo", "createdBy"]
            )
 
            tasks = sorted(tasks, key=lambda x: x.dueDate or datetime.min.replace(tzinfo=timezone.utc))
            return jsonable_encoder(tasks)
 
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 