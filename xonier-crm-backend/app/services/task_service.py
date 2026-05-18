from app.repositories.task_repository import TaskRepository
from app.repositories.task_category_repository import TaskCategoryRepository
from app.repositories.task_status_repository import TaskStatusRepository
from app.repositories.task_activity_repository import TaskActivityRepository
from app.repositories.user_repository import UserRepository
from app.db.models.task_activity_model import TaskActivityModel
from app.db.db import Client
from app.utils.custom_exception import AppException
from app.utils.enquiry_id_generator import generate_enquiry_id
from app.utils.validate_admin import validate_admin, validate_company_admin
from app.utils.get_team_members import GetTeamMembers
from app.core.enums import TASK_ACTIVITY_ACTION, TASK_PRIORITY
from beanie import PydanticObjectId, BeanieObjectId
from fastapi.encoders import jsonable_encoder
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from bson import ObjectId, DBRef
from app.core.crypto import encryptor
from app.db.models.task_model import TaskModel
from datetime import datetime, timezone, timedelta
from app.repositories.task_remark_repository import TaskRemarkRepository
from app.repositories.task_timelog_repository import TaskTimeLogRepository
from app.core.dependencies import Dependencies
import asyncio
from app.utils.check_permissions import check_permission
from app.core.scheduler.task_scheduler import handle_recurring_on_completion
import logging
from fastapi_cache import FastAPICache
from app.utils.cache_key_generator import cache_key_generator, cache_key_generator_by_id, cache_key_generator_with_id
from app.core.constants import TASK_CACHE_NAMESPACE
import json
from fastapi.encoders import jsonable_encoder

logger = logging.getLogger(__name__)
 
 
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
        self.remarkRepo = TaskRemarkRepository()
        self.dependencies = Dependencies()
        self.timelogRepo = TaskTimeLogRepository()
 
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
                    await FastAPICache.get_backend().clear(namespace=TASK_CACHE_NAMESPACE)
 
                    return jsonable_encoder(result)
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 
    async def create_remark(self,taskId:str, payload: Dict[str, Any], user:Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(taskId):
                        raise AppException(400, "Invalid task object id")
                    
                    task_data = await self.repo.find_by_id(id=PydanticObjectId(taskId), populate=["assignedTo"])
                    
                    if not task_data:
                        raise AppException(404, "Task not found regarding taskId")
                    
                    if task_data.deletedAt:
                        raise AppException(400, "Sorry the task is deleted, you not make remark on it")
                    
                    is_admin = validate_admin(user["userRole"])
                    is_manager = False
                    is_creator = False

                    task_data = jsonable_encoder(task_data)
                    if not is_admin:
                        members = await self.getTeamMembers.get_team_members(user["_id"])
                        
                        
                        
                        if members:
                            
                            obj_members = [PydanticObjectId(item) for item in members]
                            
                            set1 = set(PydanticObjectId(item["id"]) for item in task_data["assignedTo"])
                            set2 = set(obj_members)
                            
                            common = set1 & set2
                            
                            if common:
                                is_manager = True

                        else:
                            if ObjectId(user["_id"]) in (PydanticObjectId(item["id"]) for item in task_data["assignedTo"]):
                                is_creator = True

                    
                    if not is_admin and not is_manager and not is_creator:
                        raise AppException(400, "You are invalid user to create")
                    
                    new_payload = {
                        **payload,
                        "task": taskId,
                        "createdBy": user["_id"],
                        
                    }

                    

                    result = await self.remarkRepo.create(data=new_payload)

                    if not result:
                        raise AppException(400, "Remark not created")
                    
                    activity = _activity(
                                task_id=str(taskId),
                                action=TASK_ACTIVITY_ACTION.REMARK_CREATED,
                                performer_id=user["_id"],
                                description=f"Remark created and description is {result.content}",
                                metadata={"taskId": taskId, "remark content": result.content, "mention": result.mentions if result.mentions else []}
                            )
                    result = await self.activityRepo.create(data=activity, session=session)

                    
                    
                    return result.model_dump(mode="json")


                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
    
    async def get_remarks(self,taskId: str, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            
            if not ObjectId.is_valid(taskId):
                raise AppException(400, "Invalid task id")
            
            query = {}
            
            result = await self.repo.find_by_id(PydanticObjectId(taskId),["assignedTo"])

            if not result:
                raise AppException(400, "Task not found")
            
            encoded_result = result.model_dump(mode="json")
            

            is_admin = validate_admin(user["userRole"])
            is_manager = False
            is_creator = False
            

            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])
                

                if members:
                    set1 = set(PydanticObjectId(item) for item in members)
                    set2 = set(PydanticObjectId(item["id"]) for item in encoded_result["assignedTo"])
                    

                    common = set1 & set2

                    if common:
                        is_manager = True

                else:
                    if PydanticObjectId(user["_id"]) in [PydanticObjectId(item["id"]) for item in encoded_result["assignedTo"]]:
                        is_creator = True

            
            if not is_admin and not is_manager and not is_creator:
                raise AppException(400, "You are invalid user to create")


            result = await self.remarkRepo.get_by_taskId(taskId=taskId, populate=["mentions", "createdBy", "acknowledgedBy"])

            if not result:
                raise AppException(404, f"Remarks not fount against {encoded_result["title"]} task")
            
            return jsonable_encoder(result)
                         

            

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")


    async def get_all_tasks(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 10))
            is_admin = validate_admin(user["userRole"])
            is_c_admin = validate_company_admin(user["userRole"])

            query: Dict[str, Any] = {"deletedAt": None}
            and_conditions = []

            

            if not is_admin and not is_c_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])
                user_object_id = PydanticObjectId(user["_id"])
                visibility_query = self._build_visibility_query(user, members, user_object_id)
                if visibility_query:
                    and_conditions.append(visibility_query)

            if "category" in filters:
                category_ids = [ObjectId(item) for item in filters["category"].split(",")]
                for item in category_ids:
                    if not ObjectId.is_valid(item):
                        raise AppException(400, "Invalid given category id")
                query["category.$id"] = {"$in": category_ids}

            if "status" in filters:
                if not ObjectId.is_valid(filters["status"]):
                    raise AppException(400, "Invalid status id")
                query["status.$id"] = ObjectId(filters["status"])

            if "priority" in filters:
                query["priority"] = filters["priority"]

            if "parentTask" in filters:
                if filters["parentTask"] == "null":
                    query["parentTask"] = None
                elif ObjectId.is_valid(filters["parentTask"]):
                    query["parentTask.$id"] = ObjectId(filters["parentTask"])

            if "isOverdue" in filters and str(filters["isOverdue"]).lower() == "true":
                query["dueDate"] = {"$lt": datetime.now(timezone.utc)}
                query["completedAt"] = None

            if "user" in filters:
                if not ObjectId.is_valid(filters["user"]):
                    raise AppException(400, "Invalid user id")
                and_conditions.append({
                    "$or": [
                        {"assignedTo.$id": PydanticObjectId(filters["user"])},
                        {"createdBy.$id": PydanticObjectId(filters["user"])}
                    ]
                })

            if "search" in filters and filters["search"].strip():
                regex_data = {"$regex": filters["search"].strip(), "$options": "i"}
                and_conditions.append({
                    "$or": [
                        {"title": regex_data},
                        {"priority": regex_data},
                        {"tags": regex_data},
                        {"entityId": regex_data},
                        {"entityType": regex_data},
                    ]
                })

            try:
                date_filter = {}
                if "fromDate" in filters:
                    from_date = datetime.fromisoformat(filters["fromDate"])
                    from_date = from_date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                    date_filter["$gte"] = from_date

                if "toDate" in filters:
                    to_date = datetime.fromisoformat(filters["toDate"])
                    to_date = to_date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc) + timedelta(days=1)
                    date_filter["$lt"] = to_date
            except ValueError:
                raise AppException(400, "Invalid date format. Use YYYY-MM-DD")

            if date_filter:
                and_conditions.append({
                    "$or": [
                        {"dueDate": date_filter},
                        {"createdAt": date_filter},
                    ]
                })

            if and_conditions:
                query["$and"] = and_conditions

            def serialize_for_cache(v):
                if isinstance(v, (PydanticObjectId, ObjectId)):
                    return str(v)
                elif isinstance(v, datetime):
                    return v.isoformat()
                elif isinstance(v, list):
                    return [serialize_for_cache(i) for i in v]
                elif isinstance(v, dict):
                    return {nk: serialize_for_cache(nv) for nk, nv in v.items()}
                return v

            cache_query = {k: serialize_for_cache(v) for k, v in query.items()}
            cache_key = cache_key_generator(prefix=TASK_CACHE_NAMESPACE, filters=cache_query, page=page, limit=limit)

            
            
            cache = await FastAPICache.get_backend().get(cache_key)
 
            if cache:
                
                return json.loads(cache)

            
            
            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["category", "status", "assignedTo", "createdBy"],
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

                except Exception:
                    task["isOverdue"] = False

            await FastAPICache.get_backend().set(key=cache_key, value=json.dumps(result), expire=900)



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

            members= []
 
            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])
                user_object_id = PydanticObjectId(user["_id"])
                base_query.update(self._build_visibility_query(user, members, user_object_id))
 
            if "assignedTo" in filters and ObjectId.is_valid(filters["assignedTo"]):
                base_query["assignedTo.$id"] = PydanticObjectId(filters["assignedTo"])

            if "users" in filters and ObjectId.is_valid(filters["users"]):
                if not is_admin:
                    if (ObjectId(filters["users"]) in members) or (str(filters["users"]).strip() == str(user["_id"]).strip()):
                        base_query.update({"$or": [
                            {"assignedTo.$id": PydanticObjectId(filters["users"])},
                            {"createdBy.$id": PydanticObjectId(filters["users"])}
                        ]})
                
                base_query.update({"$or": [
                            {"assignedTo.$id": PydanticObjectId(filters["users"])},
                            {"createdBy.$id": PydanticObjectId(filters["users"])}
                        ]})

 
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

            def to_aware(dt_val) -> datetime:
                if isinstance(dt_val, str):
                    dt_val = dt_val.replace("Z", "+00:00")
                    parsed = datetime.fromisoformat(dt_val)
                elif isinstance(dt_val, datetime):
                    parsed = dt_val
                else:
                    return datetime.now(timezone.utc)
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                return parsed

            try:
                task_timelog = await self.timelogRepo.find_by_taskId(taskId=task_id)
                final_total_seconds:int = 0
                
                if task_timelog:
                    timelog_data = jsonable_encoder(task_timelog)
                    
                    for item in timelog_data:
                    
                        
                        total_seconds = item.get("totalSeconds", 0)
                        final_total_seconds = int(final_total_seconds) + int(total_seconds)

                    ss = timelog_data[-1].get("segments", [])

                   
                    timer_stat = ("stopped" if ss[-1].get("pausedAt", None) else "continue")

                    
                    encoded["totalSeconds"] = final_total_seconds
                    encoded["timerStatus"] = timer_stat
                    encoded["lastStartedTime"] = ss[-1].get("startedAt", None) if (timer_stat == "continue") else None
                    encoded["timerLogId"] = None

                    
                else:
                    encoded["totalSeconds"] = 0
                    encoded["timerStatus"] = None
                    encoded["timerLogId"] = None
                    encoded["lastStartedTime"] = None

            except Exception:
                encoded["totalSeconds"] = 0
                encoded["timerStatus"] = None
                encoded["timerLogId"] = None

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
                    
                    if not ObjectId.is_valid(payload["category"]):
                        raise AppException(400, "Invalid category id")
                    
                    if not ObjectId.is_valid(payload["status"]):
                        raise AppException(400, "Invalid task id")
 
                    existing = await self.repo.find_by_id(PydanticObjectId(task_id), session=session)
                    if not existing or existing.deletedAt:
                        raise AppException(404, "Task not found")
                    
                    task_data = await self.statusRepo.find_by_id(id=PydanticObjectId(payload["status"]))

                    if not task_data:
                        raise AppException(404, "Selected task not found")
                    
                    task_data = jsonable_encoder(task_data)
                    
                    if not task_data.get("category"):
                        raise AppException(404, "Category not found in task status")
                    
                    if  str(task_data["category"]["id"]) != str(payload["category"]):
                        raise AppException(400, "Invalid task status regarding selected category")
                    
                    assignedTo = [DBRef("users", PydanticObjectId(item)) for item in payload["assignedTo"]]
                 
 
                    update_payload: Dict[str, Any] = {
                        **{k: v for k, v in payload.items() if v is not None},
                        "updatedBy": PydanticObjectId(user["_id"]),
                        "updatedAt": datetime.now(timezone.utc),
                        "status": DBRef("task_statuses", PydanticObjectId(payload["status"])),
                        "category": DBRef("task_categories", PydanticObjectId(payload["category"])),
                        "assignedTo": assignedTo
                    }
 
                    activities = []
 
                    if "title" in payload and payload["title"] != existing.title:
                        activities.append(_activity(task_id, TASK_ACTIVITY_ACTION.UPDATE, user["_id"], f"Title changed", "title", existing.title, payload["title"]))
 
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
                    
                    await FastAPICache.get_backend().clear(namespace=TASK_CACHE_NAMESPACE)
                    return True
 
                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
 

    async def update_remarks_acknowledge(self, remarkId: str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(remarkId):
                        raise AppException(400, "Invalid remark id")

                    remark = await self.remarkRepo.find_by_id(PydanticObjectId(remarkId), session=session)
                    if not remark or remark.deletedAt:
                        raise AppException(404, "Remark not found")

                    if remark.acknowledge:
                        raise AppException(400, "Remark is already acknowledged and cannot be reversed")

                    task_id = str(remark.task.ref.id)
                    task = await self.repo.find_by_id(PydanticObjectId(task_id), session=session)
                    if not task or task.deletedAt:
                        raise AppException(404, "Task not found")

                    is_admin = validate_admin(user["userRole"])
                    user_oid = PydanticObjectId(user["_id"])

                    if not is_admin:
                        task_assigned_oids = []
                        for ref in (task.assignedTo or []):
                            try:
                                task_assigned_oids.append(PydanticObjectId(str(ref.ref.id)))
                            except Exception:
                                try:
                                    task_assigned_oids.append(PydanticObjectId(str(ref.id)))
                                except Exception:
                                    continue

                        is_own_task = user_oid in task_assigned_oids

                        members = await self.getTeamMembers.get_team_members(user["_id"])
                        members_oids = [PydanticObjectId(str(m)) for m in members]

                        is_team_task = any(uid in members_oids for uid in task_assigned_oids)

                        if not is_own_task and not is_team_task:
                            raise AppException(403, "You do not have permission to acknowledge this remark")

                    update_payload = {
                        "acknowledge": True,
                        "acknowledgedBy": DBRef("users", ObjectId(str(user_oid))),
                        "updatedAt": datetime.now(timezone.utc)
                    }

                    updated = await self.remarkRepo.update(
                        id=PydanticObjectId(remarkId),
                        data=update_payload,
                        session=session
                    )

                    if not updated:
                        raise AppException(400, "Remark acknowledgement failed")

                    activity = _activity(
                        task_id=task_id,
                        action=TASK_ACTIVITY_ACTION.REMARK_ACKNOWLEDGED,
                        performer_id=user["_id"],
                        description=f"Remark acknowledged by {user.get('fullName', user['_id'])}",
                        metadata={
                            "taskId": task_id,
                            "remarkId": remarkId,
                            "acknowledgedBy": str(user["_id"])
                        }
                    )
                    await self.activityRepo.create(data=activity, session=session)

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
                        "status": DBRef(collection="task_statuses", id=ObjectId(new_status_id)),
                        "updatedBy": DBRef(collection="users", id=user["_id"]),
                        "updatedAt": datetime.now(timezone.utc),
                        
                    }

                    if not new_status.isFinal:
                        update_data["completedAt"] = None
                        update_data["rating"] = None
                        update_data["actual_hours"] = None
                        update_data["remark"] = None
                        update_data["actual_days"] = None

 
                    if new_status.isFinal:
                        update_data["completedAt"] = datetime.now(timezone.utc)
                        update_data["isOverdue"] = False
                        if payload.get("rating") is not None:
                            update_data["rating"] = payload.get("rating")   
                        if payload.get("actual_hours") is not None:
                            update_data["actual_hours"] = payload.get("actual_hours")
                        if payload.get("actual_days") is not None:
                            update_data["actual_days"] = payload.get("actual_days")
                        if payload.get("remark") is not None:
                            update_data["remark"] = payload.get("remark")

                    
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
                    await FastAPICache.get_backend().clear(namespace=TASK_CACHE_NAMESPACE)
 
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
    
                    is_admin = validate_admin(user["userRole"])
                    user_oid = PydanticObjectId(user["_id"])
    
                    if not is_admin:
                        members = await self.getTeamMembers.get_team_members(user["_id"])
                        members_oids = [PydanticObjectId(str(m)) for m in members]
    
                        task_assigned_oids = []
                        for ref in (existing.assignedTo or []):
                            try:
                                task_assigned_oids.append(PydanticObjectId(str(ref.ref.id)))
                            except Exception:
                                try:
                                    task_assigned_oids.append(PydanticObjectId(str(ref.id)))
                                except Exception:
                                    continue
    
                        is_own_task = user_oid in task_assigned_oids
                        is_team_task = any(uid in members_oids for uid in task_assigned_oids)
    
                        if not is_own_task and not is_team_task:
                            raise AppException(403, "You do not have permission to move this task")
    
                    category_id = str(existing.category.ref.id)
                    new_status = await self._validate_status_belongs_to_category(new_status_id, category_id)
    
                    old_status = await self.statusRepo.find_by_id(PydanticObjectId(str(existing.status.ref.id)))
                    old_status_name = old_status.name if old_status else "Unknown"
    
                    now = datetime.now(timezone.utc)
    
                    update_data: Dict[str, Any] = {
                        "status": DBRef(collection="task_statuses", id=ObjectId(new_status_id)),
                        "order": new_order,
                        "updatedBy": DBRef("users", ObjectId(str(user_oid))),
                        "updatedAt": now,
                        "completedAt": None,
                        "rating" : None,
                        "actual_hours": None,
                        "remark": None,
                        "actual_days": None
                    }
    
                    if new_status.isFinal:
                        has_permission = await check_permission(user, ["task:markStatusComplete"])
                        if not has_permission:
                            raise AppException(403, "You do not have permission to mark this task as complete")
    
                        update_data["completedAt"] = now
                        update_data["isOverdue"] = False
                        update_data["recurringProcessed"] = False  
                        update_data["rating"] = payload.get("rating") or None
                        update_data["actual_hours"] = payload.get("actual_hours") or None
                        update_data["actual_days"] = payload.get("actual_days") or None
                        update_data["remark"] = payload.get("remark") or None
    
                    updated = await self.repo.update(id=PydanticObjectId(task_id), data=update_data, session=session)
                    if not updated:
                        raise AppException(400, "Task move failed")

    
                    if new_status_id != str(existing.status.ref.id):
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
    
                    
                    if new_status.isFinal and existing.isRecurring:
                        try:
                            collection = TaskModel.get_pymongo_collection()
                            raw_task = await collection.find_one({"_id": ObjectId(task_id)})
                            if raw_task:
                                await handle_recurring_on_completion(raw_task, now)
                        except Exception as recurring_error:
                            
                            logger.warning(f"Inline recurring creation failed for {task_id}: {recurring_error}")


                    await FastAPICache.get_backend().clear(namespace=TASK_CACHE_NAMESPACE)
    
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
                    await FastAPICache.get_backend().clear(namespace=TASK_CACHE_NAMESPACE)
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
                    await FastAPICache.get_backend().clear(namespace=TASK_CACHE_NAMESPACE)
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

                    await FastAPICache.get_backend().clear(namespace=TASK_CACHE_NAMESPACE)
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
 
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def get_all_deleted(self, user: Dict[str, Any], filters=Dict[str, Any]):
        try:
            
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 10))
            is_admin = validate_admin(user["userRole"])
 
            query: Dict[str, Any] = {"deletedAt": {"$ne": None, "$exists": True}}
 
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

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
    async def delete_remark(self, remarkId: str, user: Dict[str, Any]):
        try:
            
            if not ObjectId.is_valid(remarkId):
                raise AppException(400, "Invalid task object id")

            task = await self.remarkRepo.find_by_id(PydanticObjectId(remarkId), ["createdBy"])
            
            if not task:
                raise AppException(400, "Task remark not found")
            
            if task.deletedAt:
                raise AppException(400, "Task remark is already deleted, action denied")
           
            is_admin = validate_admin(user["userRole"])
            is_manager = False
            is_creator = False

            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])
                
                if members:
                    mem = [PydanticObjectId(item) for item in members]
                    
                    if PydanticObjectId(task.createdBy.id) in mem or (PydanticObjectId(user["_id"]) == PydanticObjectId(task.createdBy.id)):
                        is_manager = True


                else:
                    if PydanticObjectId(user["_id"]) == PydanticObjectId(task.createdBy.id):
                        is_creator = True

            if not is_admin and not is_manager and not is_creator:
                raise AppException(403, "Permission denied, You are not authenticated user")
            
            delete = await self.remarkRepo.delete_by_id(PydanticObjectId(remarkId))

            if not delete:
                raise AppException(400, "Remark deletion failed")
            
            
            return True


        except AppException as e:
            raise e
        
        except Exception as e:
            raise AppException(status_code=500, message=f"Internal server error: {e}")


    # new

    def _parse_date(self, date_str: str, end_of_day: bool = False) -> datetime:
        try:
            dt = datetime.fromisoformat(date_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            if end_of_day:
                dt = dt.replace(hour=23, minute=59, second=59, microsecond=999999)
            else:
                dt = dt.replace(hour=0, minute=0, second=0, microsecond=0)
            return dt
        except ValueError:
            raise AppException(400, f"Invalid date format: '{date_str}'. Use ISO 8601.")
 
    def _build_base_query(self, user_id: str, filters: Dict[str, Any]) -> Dict[str, Any]:
        user_oid = ObjectId(user_id)
        query: Dict[str, Any] = {
            "deletedAt": None,
            "$or": [
                {"assignedTo.$id": user_oid},
                {"createdBy.$id": user_oid},
            ]
        }
        if filters.get("fromDate") or filters.get("toDate"):
            date_filter: Dict[str, Any] = {}
            if filters.get("fromDate"):
                date_filter["$gte"] = self._parse_date(filters["fromDate"])
            if filters.get("toDate"):
                date_filter["$lte"] = self._parse_date(filters["toDate"], end_of_day=True)
            query["createdAt"] = date_filter
        if filters.get("category") and ObjectId.is_valid(filters["category"]):
            query["category.$id"] = ObjectId(filters["category"])
        if filters.get("priority"):
            query["priority"] = filters["priority"]
        if filters.get("entityType"):
            query["entityType"] = filters["entityType"]
        return query
 
    def _extract_count(self, facet: Dict, key: str) -> int:
        arr = facet.get(key, [])
        return arr[0]["count"] if arr else 0
 
    def _extract_sum(self, facet: Dict, key: str) -> float:
        arr = facet.get(key, [])
        return round(arr[0]["total"], 1) if arr else 0.0
 
    async def _get_summary_facet(self, collection, base_query: Dict) -> Dict:
        now = datetime.now(timezone.utc)
        pipeline = [
            {"$match": base_query},
            {
                "$facet": {
                    "total": [{"$count": "count"}],
                    "completed": [
                        {"$match": {"completedAt": {"$ne": None}}},
                        {"$count": "count"}
                    ],
                    "inProgress": [
                        {"$match": {"completedAt": None, "startDate": {"$lte": now}, "dueDate": {"$gte": now}}},
                        {"$count": "count"}
                    ],
                    "overdue": [
                        {"$match": {"completedAt": None, "dueDate": {"$lt": now}}},
                        {"$count": "count"}
                    ],
                    "notStarted": [
                        {"$match": {"completedAt": None, "startDate": None}},
                        {"$count": "count"}
                    ],
                    "recurring": [
                        {"$match": {"isRecurring": True}},
                        {"$count": "count"}
                    ],
                    "withParent": [
                        {"$match": {"parentTask": {"$ne": None}}},
                        {"$count": "count"}
                    ],
                    "withAttachments": [
                        {"$match": {"attachments.0": {"$exists": True}}},
                        {"$count": "count"}
                    ],
                    "withTags": [
                        {"$match": {"tags.0": {"$exists": True}}},
                        {"$count": "count"}
                    ],
                    "dueSoon": [
                        {"$match": {"completedAt": None, "dueDate": {"$gte": now, "$lte": now + timedelta(days=3)}}},
                        {"$count": "count"}
                    ],
                    "dueToday": [
                        {"$match": {"completedAt": None, "dueDate": {"$gte": now.replace(hour=0, minute=0, second=0), "$lte": now.replace(hour=23, minute=59, second=59)}}},
                        {"$count": "count"}
                    ],
                    "estimatedHoursTotal": [
                        {"$match": {"estimatedHours": {"$ne": None}}},
                        {"$group": {"_id": None, "total": {"$sum": "$estimatedHours"}}}
                    ],
                    "actualHoursTotal": [
                        {"$match": {"actualHours": {"$ne": None}}},
                        {"$group": {"_id": None, "total": {"$sum": "$actualHours"}}}
                    ],
                }
            }
        ]
        result = await collection.aggregate(pipeline).to_list(length=1)
        return result[0] if result else {}
 
    async def _get_status_breakdown(self, collection, base_query: Dict) -> List[Dict]:
        pipeline = [
            {"$match": base_query},
            {"$group": {"_id": "$status.$id", "count": {"$sum": 1}}},
            {"$lookup": {"from": "task_statuses", "localField": "_id", "foreignField": "_id", "as": "s"}},
            {"$unwind": {"path": "$s", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "_id": 0,
                "statusId": {"$toString": "$_id"},
                "statusName": {"$ifNull": ["$s.name", "Unknown"]},
                "statusColor": {"$ifNull": ["$s.color", "#6B7280"]},
                "statusIcon": {"$ifNull": ["$s.icon", ""]},
                "statusType": {"$ifNull": ["$s.type", "not_started"]},
                "isFinal": {"$ifNull": ["$s.isFinal", False]},
                "isDefault": {"$ifNull": ["$s.isDefault", False]},
                "order": {"$ifNull": ["$s.order", 0]},
                "count": 1
            }},
            {"$sort": {"order": 1}}
        ]
        return await collection.aggregate(pipeline).to_list(length=None)
 
    async def _get_priority_breakdown(self, collection, base_query: Dict) -> List[Dict]:
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        pipeline = [
            {"$match": base_query},
            {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
            {"$project": {"_id": 0, "priority": "$_id", "count": 1}}
        ]
        results = await collection.aggregate(pipeline).to_list(length=None)
        return sorted(results, key=lambda x: priority_order.get(x.get("priority", ""), 99))
 
    async def _get_category_breakdown(self, collection, base_query: Dict) -> List[Dict]:
        pipeline = [
            {"$match": base_query},
            {"$group": {"_id": "$category.$id", "count": {"$sum": 1}}},
            {"$lookup": {"from": "task_categories", "localField": "_id", "foreignField": "_id", "as": "c"}},
            {"$unwind": {"path": "$c", "preserveNullAndEmptyArrays": True}},
            {"$project": {
                "_id": 0,
                "categoryId": {"$toString": "$_id"},
                "categoryName": {"$ifNull": ["$c.name", "Unknown"]},
                "categoryColor": {"$ifNull": ["$c.color", "#6B7280"]},
                "categoryIcon": {"$ifNull": ["$c.icon", ""]},
                "visibility": {"$ifNull": ["$c.visibility", "global"]},
                "count": 1
            }},
            {"$sort": {"count": -1}}
        ]
        return await collection.aggregate(pipeline).to_list(length=None)
 
    async def _get_entity_breakdown(self, collection, base_query: Dict) -> List[Dict]:
        pipeline = [
            {"$match": {**base_query, "entityType": {"$ne": None}}},
            {"$group": {"_id": "$entityType", "count": {"$sum": 1}}},
            {"$project": {"_id": 0, "entityType": "$_id", "count": 1}},
            {"$sort": {"count": -1}}
        ]
        return await collection.aggregate(pipeline).to_list(length=None)
 
    async def _get_recurrence_breakdown(self, collection, base_query: Dict) -> List[Dict]:
        pipeline = [
            {"$match": {**base_query, "isRecurring": True, "recurrenceType": {"$ne": None}}},
            {"$group": {"_id": "$recurrenceType", "count": {"$sum": 1}}},
            {"$project": {"_id": 0, "recurrenceType": "$_id", "count": 1}},
            {"$sort": {"count": -1}}
        ]
        return await collection.aggregate(pipeline).to_list(length=None)
 
    async def _get_status_type_breakdown(self, collection, base_query: Dict) -> List[Dict]:
        pipeline = [
            {"$match": base_query},
            {"$lookup": {"from": "task_statuses", "localField": "status.$id", "foreignField": "_id", "as": "s"}},
            {"$unwind": {"path": "$s", "preserveNullAndEmptyArrays": True}},
            {"$group": {"_id": {"$ifNull": ["$s.type", "unknown"]}, "count": {"$sum": 1}}},
            {"$project": {"_id": 0, "type": "$_id", "count": 1}},
            {"$sort": {"count": -1}}
        ]
        return await collection.aggregate(pipeline).to_list(length=None)
 
    async def _get_overdue_details(self, collection, base_query: Dict) -> Dict:
        now = datetime.now(timezone.utc)
        pipeline = [
            {"$match": {**base_query, "completedAt": None, "dueDate": {"$lt": now}}},
            {"$group": {
                "_id": None,
                "count": {"$sum": 1},
                "avgOverdueDays": {"$avg": {"$divide": [{"$subtract": [now, "$dueDate"]}, 1000 * 60 * 60 * 24]}},
                "maxOverdueDays": {"$max": {"$divide": [{"$subtract": [now, "$dueDate"]}, 1000 * 60 * 60 * 24]}}
            }},
            {"$project": {"_id": 0, "count": 1, "avgOverdueDays": {"$round": ["$avgOverdueDays", 1]}, "maxOverdueDays": {"$round": ["$maxOverdueDays", 1]}}}
        ]
        result = await collection.aggregate(pipeline).to_list(length=1)
        return result[0] if result else {"count": 0, "avgOverdueDays": 0, "maxOverdueDays": 0}
 
    async def _get_completion_time(self, collection, base_query: Dict) -> Dict:
        pipeline = [
            {"$match": {**base_query, "completedAt": {"$ne": None}, "createdAt": {"$ne": None}}},
            {"$group": {
                "_id": None,
                "avgHours": {"$avg": {"$divide": [{"$subtract": ["$completedAt", "$createdAt"]}, 1000 * 60 * 60]}},
                "minHours": {"$min": {"$divide": [{"$subtract": ["$completedAt", "$createdAt"]}, 1000 * 60 * 60]}},
                "maxHours": {"$max": {"$divide": [{"$subtract": ["$completedAt", "$createdAt"]}, 1000 * 60 * 60]}}
            }},
            {"$project": {"_id": 0, "avgHours": {"$round": ["$avgHours", 1]}, "minHours": {"$round": ["$minHours", 1]}, "maxHours": {"$round": ["$maxHours", 1]}}}
        ]
        result = await collection.aggregate(pipeline).to_list(length=1)
        return result[0] if result else {"avgHours": None, "minHours": None, "maxHours": None}
 
    async def _get_hours_accuracy(self, collection, base_query: Dict) -> Optional[float]:
        pipeline = [
            {"$match": {**base_query, "estimatedHours": {"$ne": None}, "actualHours": {"$ne": None}, "completedAt": {"$ne": None}}},
            {"$group": {
                "_id": None,
                "avgAccuracy": {"$avg": {"$multiply": [{"$subtract": [1, {"$abs": {"$divide": [{"$subtract": ["$actualHours", "$estimatedHours"]}, "$estimatedHours"]}}]}, 100]}}
            }},
            {"$project": {"_id": 0, "avgAccuracy": {"$round": ["$avgAccuracy", 1]}}}
        ]
        result = await collection.aggregate(pipeline).to_list(length=1)
        return result[0]["avgAccuracy"] if result else None
 
    async def _get_completion_trend(self, collection, base_query: Dict) -> List[Dict]:
        pipeline = [
            {"$match": {**base_query, "completedAt": {"$ne": None}}},
            {"$group": {"_id": {"y": {"$year": "$completedAt"}, "m": {"$month": "$completedAt"}, "d": {"$dayOfMonth": "$completedAt"}}, "completed": {"$sum": 1}}},
            {"$project": {"_id": 0, "date": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$dateFromParts": {"year": "$_id.y", "month": "$_id.m", "day": "$_id.d"}}}}, "completed": 1}},
            {"$sort": {"date": 1}},
            {"$limit": 60}
        ]
        return await collection.aggregate(pipeline).to_list(length=None)
 
    async def _get_creation_trend(self, collection, base_query: Dict) -> List[Dict]:
        pipeline = [
            {"$match": base_query},
            {"$group": {"_id": {"y": {"$year": "$createdAt"}, "m": {"$month": "$createdAt"}, "d": {"$dayOfMonth": "$createdAt"}}, "created": {"$sum": 1}}},
            {"$project": {"_id": 0, "date": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$dateFromParts": {"year": "$_id.y", "month": "$_id.m", "day": "$_id.d"}}}}, "created": 1}},
            {"$sort": {"date": 1}},
            {"$limit": 60}
        ]
        return await collection.aggregate(pipeline).to_list(length=None)
 
    async def _get_weekly_workload(self, collection, base_query: Dict) -> List[Dict]:
        pipeline = [
            {"$match": base_query},
            {"$group": {"_id": {"$dayOfWeek": "$createdAt"}, "count": {"$sum": 1}}},
            {"$project": {"_id": 0, "dayOfWeek": "$_id", "dayName": {"$arrayElemAt": [["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], "$_id"]}, "count": 1}},
            {"$sort": {"dayOfWeek": 1}}
        ]
        return await collection.aggregate(pipeline).to_list(length=None)
 
    async def _get_monthly_trend(self, collection, base_query: Dict) -> List[Dict]:
        pipeline = [
            {"$match": base_query},
            {"$group": {
                "_id": {"y": {"$year": "$createdAt"}, "m": {"$month": "$createdAt"}},
                "created": {"$sum": 1},
                "completed": {"$sum": {"$cond": [{"$ne": ["$completedAt", None]}, 1, 0]}}
            }},
            {"$project": {
                "_id": 0,
                "month": {"$dateToString": {"format": "%Y-%m", "date": {"$dateFromParts": {"year": "$_id.y", "month": "$_id.m", "day": 1}}}},
                "created": 1,
                "completed": 1,
                "completionRate": {"$round": [{"$multiply": [{"$divide": ["$completed", {"$max": ["$created", 1]}]}, 100]}, 1]}
            }},
            {"$sort": {"month": 1}},
            {"$limit": 12}
        ]
        return await collection.aggregate(pipeline).to_list(length=None)
 
    async def _get_activity_summary(self, user_id: str) -> Dict:
        activity_collection = TaskActivityModel.get_pymongo_collection()
        user_oid = ObjectId(user_id)
        pipeline = [
            {"$match": {"performedBy.$id": user_oid}},
            {"$facet": {
                "totalActions": [{"$count": "count"}],
                "byAction": [
                    {"$group": {"_id": "$action", "count": {"$sum": 1}}},
                    {"$project": {"_id": 0, "action": "$_id", "count": 1}},
                    {"$sort": {"count": -1}}
                ],
                "mostEditedFields": [
                    {"$match": {"field": {"$ne": None}}},
                    {"$group": {"_id": "$field", "count": {"$sum": 1}}},
                    {"$project": {"_id": 0, "field": "$_id", "count": 1}},
                    {"$sort": {"count": -1}},
                    {"$limit": 10}
                ],
                "recentActivity": [
                    {"$sort": {"createdAt": -1}},
                    {"$limit": 5},
                    {"$project": {"_id": 0, "action": 1, "description": 1, "field": 1, "oldValue": 1, "newValue": 1, "createdAt": 1}}
                ],
                "activityByDay": [
                    {"$group": {"_id": {"y": {"$year": "$createdAt"}, "m": {"$month": "$createdAt"}, "d": {"$dayOfMonth": "$createdAt"}}, "count": {"$sum": 1}}},
                    {"$project": {"_id": 0, "date": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$dateFromParts": {"year": "$_id.y", "month": "$_id.m", "day": "$_id.d"}}}}, "count": 1}},
                    {"$sort": {"date": -1}},
                    {"$limit": 30}
                ]
            }}
        ]
        result = await activity_collection.aggregate(pipeline).to_list(length=1)
        facet = result[0] if result else {}
        total_arr = facet.get("totalActions", [])
        return {
            "totalActions": total_arr[0]["count"] if total_arr else 0,
            "byAction": facet.get("byAction", []),
            "mostEditedFields": facet.get("mostEditedFields", []),
            "recentActivity": facet.get("recentActivity", []),
            "activityByDay": sorted(facet.get("activityByDay", []), key=lambda x: x["date"])
        }
 
    async def get_user_task_stats(self, user_id: str, filters: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if not ObjectId.is_valid(user_id):
                raise AppException(400, "Invalid user id")
 
            is_admin = validate_admin(user["userRole"])
            if not is_admin:
                members = await self.getTeamMembers.get_team_members(user["_id"])
                if user_id != str(user["_id"]) and user_id not in [str(m) for m in members]:
                    raise AppException(403, "You do not have permission to view this user's stats")
 
            collection = TaskModel.get_pymongo_collection()
            base_query = self._build_base_query(user_id, filters)
            now = datetime.now(timezone.utc)
 
            (
                facet,
                status_breakdown,
                priority_breakdown,
                category_breakdown,
                entity_breakdown,
                recurrence_breakdown,
                status_type_breakdown,
                overdue_details,
                completion_time,
                hours_accuracy,
                completion_trend,
                creation_trend,
                weekly_workload,
                monthly_trend,
                activity_summary,
            ) = await asyncio.gather(
                self._get_summary_facet(collection, base_query),
                self._get_status_breakdown(collection, base_query),
                self._get_priority_breakdown(collection, base_query),
                self._get_category_breakdown(collection, base_query),
                self._get_entity_breakdown(collection, base_query),
                self._get_recurrence_breakdown(collection, base_query),
                self._get_status_type_breakdown(collection, base_query),
                self._get_overdue_details(collection, base_query),
                self._get_completion_time(collection, base_query),
                self._get_hours_accuracy(collection, base_query),
                self._get_completion_trend(collection, base_query),
                self._get_creation_trend(collection, base_query),
                self._get_weekly_workload(collection, base_query),
                self._get_monthly_trend(collection, base_query),
                self._get_activity_summary(user_id),
            )
 
            total = self._extract_count(facet, "total")
            completed = self._extract_count(facet, "completed")
            overdue = self._extract_count(facet, "overdue")
            in_progress = self._extract_count(facet, "inProgress")
            not_started = self._extract_count(facet, "notStarted")
            estimated_hours = self._extract_sum(facet, "estimatedHoursTotal")
            actual_hours = self._extract_sum(facet, "actualHoursTotal")
 
            completion_rate = round((completed / total) * 100, 1) if total > 0 else 0.0
            overdue_rate = round((overdue / total) * 100, 1) if total > 0 else 0.0
            hours_variance = round(actual_hours - estimated_hours, 1) if estimated_hours and actual_hours else None
 
            return {
                "summary": {
                    "total": total,
                    "completed": completed,
                    "inProgress": in_progress,
                    "overdue": overdue,
                    "notStarted": not_started,
                    "dueSoon": self._extract_count(facet, "dueSoon"),
                    "dueToday": self._extract_count(facet, "dueToday"),
                    "recurring": self._extract_count(facet, "recurring"),
                    "subTasks": self._extract_count(facet, "withParent"),
                    "withAttachments": self._extract_count(facet, "withAttachments"),
                    "withTags": self._extract_count(facet, "withTags"),
                    "completionRate": completion_rate,
                    "overdueRate": overdue_rate,
                },
                "performance": {
                    "estimatedHoursTotal": estimated_hours,
                    "actualHoursTotal": actual_hours,
                    "hoursVariance": hours_variance,
                    "hoursAccuracyRate": hours_accuracy,
                    "avgCompletionHours": completion_time.get("avgHours"),
                    "minCompletionHours": completion_time.get("minHours"),
                    "maxCompletionHours": completion_time.get("maxHours"),
                    "avgOverdueDays": overdue_details.get("avgOverdueDays", 0),
                    "maxOverdueDays": overdue_details.get("maxOverdueDays", 0),
                    "overdueCount": overdue_details.get("count", 0),
                },
                "breakdowns": {
                    "byStatus": status_breakdown,
                    "byStatusType": status_type_breakdown,
                    "byPriority": priority_breakdown,
                    "byCategory": category_breakdown,
                    "byEntityType": entity_breakdown,
                    "byRecurrenceType": recurrence_breakdown,
                },
                "trends": {
                    "daily": {
                        "completion": completion_trend,
                        "creation": creation_trend,
                    },
                    "weekly": weekly_workload,
                    "monthly": monthly_trend,
                },
                "activity": activity_summary,
                "meta": {
                    "userId": user_id,
                    "generatedAt": now.isoformat(),
                    "filters": {k: v for k, v in filters.items() if v is not None}
                }
            }
 
        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 