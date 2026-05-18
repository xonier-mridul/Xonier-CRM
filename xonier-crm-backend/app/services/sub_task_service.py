from app.repositories.sub_task_repository import SubTaskRepository
from app.repositories.task_repository import TaskRepository
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.db.db import Client
from beanie import PydanticObjectId
from app.utils.validate_admin import validate_admin
from app.utils.get_team_members import GetTeamMembers
from app.repositories.task_activity_repository import TaskActivityRepository
from app.core.enums import TASK_ACTIVITY_ACTION
from bson import ObjectId, DBRef
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


IST = ZoneInfo("Asia/Kolkata")



class SubTaskService:
    def __init__(self):
        self.repo = SubTaskRepository()
        self.taskRepo = TaskRepository()
        self.client = Client
        self.getTeamMembers = GetTeamMembers()
        self.activityRepo = TaskActivityRepository()
    @staticmethod
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
    
    async def _get_task_or_raise(self, taskId: str):
        if not ObjectId.is_valid(taskId):
            raise AppException(400, "Invalid task Object Id")

        task_data = await self.taskRepo.find_by_id(PydanticObjectId(taskId), ["assignedBy"])

        if not task_data:
            raise AppException(404, "Task not found")

        json_task_data = task_data.model_dump(mode="json")

        if json_task_data["deletedAt"]:
            raise AppException(400, "Task is deleted, not found")

        return json_task_data

    async def _check_task_access(self, json_task_data: Dict[str, Any], user: Dict[str, Any]):
        is_admin = validate_admin(user["userRole"])
        is_manager = False
        is_creator = False

        if not is_admin:
            members = await self.getTeamMembers.get_team_members(user["_id"])

            if members:
                set1 = set(PydanticObjectId(item["id"]) for item in json_task_data["assignedTo"])
                set2 = set(members)
                common = set1 & set2

                if common or (PydanticObjectId(user["_id"]) in [PydanticObjectId(item["id"]) for item in json_task_data["assignedTo"]]):
                    is_manager = True
            else:
                if PydanticObjectId(user["_id"]) in [PydanticObjectId(item["id"]) for item in json_task_data["assignedTo"]]:
                    is_creator = True

        if not is_admin and not is_creator and not is_manager:
            raise AppException(403, "You are not authorized to access this task")

    async def create_subtask(self, taskId:str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    
                    if not ObjectId.is_valid(taskId):
                        raise AppException(400, "Invalid subtask Object Id")
                    
                    is_exist = await self.repo.find_one(filter={"title": payload["title"], "taskId.$id": PydanticObjectId(taskId), "deletedAt": None})
                    
                    if is_exist:
                        raise AppException(400, "Please use different title, subtask already exist with this title")
                    
                    task_data = await self.taskRepo.find_by_id(PydanticObjectId(taskId), ["assignedBy"])
                   
                    if not task_data:
                        raise AppException(400, "Task not found, please check id")
                    
                    
                    
                    json_task_data = task_data.model_dump(mode="json")

                    if json_task_data["deletedAt"]:
                        raise AppException(400, "Task is deleted, not found")
                    
                    if json_task_data["completedAt"]:
                        raise AppException(400, "Task is completed, action denied")
                    
                    is_admin = validate_admin(user["userRole"])
                    is_manager = False
                    is_creator = False

                    if not is_admin:
                        members = await self.getTeamMembers.get_team_members(user["_id"])
                       
                        if members:
                            set1 = set(PydanticObjectId(item["id"]) for item in json_task_data["assignedTo"])
                            set2 = set(members)
                            
                            common = set1 & set2
                       
                            if common or (PydanticObjectId(user["_id"]) in [PydanticObjectId(item["id"]) for item in json_task_data["assignedTo"]]):
                               
                                is_manager = True

                        else:
                            
                            if (PydanticObjectId(user["_id"]) in [ PydanticObjectId(item["id"]) for item in json_task_data["assignedTo"]]):
                                is_creator = True


                    
                    if not is_admin and not is_creator and not is_manager:
                        raise AppException(403, f"You are not authorized person for create sub task against")
                
                    new_payload = {
                        "taskId": taskId,
                        **payload,
                        "createdBy": user["_id"],

                    }
                  
                    result = await self.repo.create(data=new_payload, session=session)

                    if not result:
                        raise AppException(400, f"Sub task not created against {json_task_data["title"]}")
                    
                    
                    d_result = result.model_dump(mode="json")
                    
                   
                    activity_payload = self._activity(
                        task_id=taskId,
                        action=TASK_ACTIVITY_ACTION.CREATE_SUB_TASK,
                        performer_id=user["_id"],
                        description=f"Create sub task against {json_task_data["title"]}",
                        metadata={"taskId": taskId, "title": d_result["title"], "dueDate": d_result.get("dueDate") if d_result.get("dueDate") else None, "startDate": d_result.get("startDate") if d_result.get("startDate") else None }
                    )

                    await self.activityRepo.create(activity_payload, session)
                    
                    return d_result

        

                except AppException as e:
                    raise e
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                


    async def mark_complete(self, subtaskId: str, user:Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(subtaskId):
                        raise AppException(400, "Invalid subtask Object Id")
                    
                    is_exist = await self.repo.find_by_id(id=PydanticObjectId(subtaskId), populate=["taskId"])
                    
                    if not is_exist:
                        raise AppException(400, "Sub task not found regarding this id")
                    
                    task_data = await self.taskRepo.find_by_id(PydanticObjectId(is_exist.taskId.id), ["assignedBy"])
                   
                    if not task_data:
                        raise AppException(400, "Task not found, please check id")
                    
                    
                    
                    json_task_data = task_data.model_dump(mode="json")

                    if json_task_data["deletedAt"]:
                        raise AppException(400, "Task is deleted, not found")
                    
                    if json_task_data["completedAt"]:
                        raise AppException(400, "Task is completed, action denied")

                    is_admin = validate_admin(user["userRole"])

                    is_manager = False
                    is_creator = False

                    if not is_admin:
                        members = await self.getTeamMembers.get_team_members(user["_id"])
                       
                        if members:
                            set1 = set(PydanticObjectId(item["id"]) for item in json_task_data["assignedTo"])
                            set2 = set(members)
                            
                            common = set1 & set2
                       
                            if common or (PydanticObjectId(user["_id"]) in [PydanticObjectId(item["id"]) for item in json_task_data["assignedTo"]]):
                               
                                is_manager = True

                        else:
                            if (PydanticObjectId(user["_id"]) in [PydanticObjectId(item["id"]) for item in json_task_data["assignedTo"]]):
                                is_creator = True

                    if not is_admin and not is_creator and not is_manager:
                        raise AppException(403, f"You are not authorized person for create sub task against")
                    

                    new_payload = {
                        "isCompleted": True,
                        "completedBy": DBRef(collection="users",id=ObjectId(user["_id"])),
                        "completedAt": datetime.now(IST),

                    }

                    reverse_payload = {
                        "isCompleted": False,
                        "completedBy": None,
                        "completedAt": None,
                    }

                    result = await self.repo.update(id=PydanticObjectId(subtaskId), data= reverse_payload if is_exist.isCompleted else new_payload, session=session)

                    if not result:
                        raise AppException(400, "Sub task not updated")
                    
                    
                    activity_payload = self._activity(
                        task_id=is_exist.taskId.id,
                        action=TASK_ACTIVITY_ACTION.UNCOMPLETE_SUB_TASK if is_exist.isCompleted else TASK_ACTIVITY_ACTION.COMPLETE_SUB_TASK,
                        performer_id=user["_id"],
                        description=f"Mark sub task {"uncomplete" if is_exist.isCompleted else "complete" }",
                        metadata={"taskId": str(is_exist.taskId.id), "subtaskId": subtaskId, "title": is_exist.title}
                    )
                   
                    await self.activityRepo.create(activity_payload, session)
                    
                    return {"message": activity_payload["description"]}
   

                except AppException as e:
                    raise e
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                

    async def get_all_subtasks(self, taskId: str, user: Dict[str, Any], filters: Dict[str, Any]):
        try:
            
            if not ObjectId.is_valid(taskId):
                raise AppException(400, "Invalid task Object Id")

            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 10))
            
            json_task_data = await self._get_task_or_raise(taskId)

      
            
            # await self._check_task_access(json_task_data, user)
           
            query: Dict[str, Any] = {
                "taskId.$id": PydanticObjectId(taskId),
                "deletedAt": None
            }

            if "isCompleted" in filters:
                query["isCompleted"] = filters["isCompleted"]

            if "search" in filters and filters["search"].strip():
                query["title"] = {"$regex": filters["search"].strip(), "$options": "i"}

  
            
            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["createdBy", "completedBy"],
                sort=["order", "-createdAt"]
            )


            
            if not result or not result.get("data"):
                raise AppException(404, "No sub tasks found for this task")

            return result

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def get_subtask_by_id(self, subtaskId: str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(subtaskId):
                raise AppException(400, "Invalid subtask Object Id")

            subtask = await self.repo.find_by_id(
                id=PydanticObjectId(subtaskId),
                populate=["createdBy", "completedBy"]
            )

            if not subtask:
                raise AppException(404, "Sub task not found")

            if subtask.deletedAt:
                raise AppException(400, "Sub task is deleted, not found")

            json_task_data = await self._get_task_or_raise(str(subtask.taskId.ref.id))
            await self._check_task_access(json_task_data, user)

            return subtask.model_dump(mode="json")

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def update_subtask(self, id: str, payload: Dict[str, Any], user: Dict[str, Any])->bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(id):
                        raise AppException(400, "Invalid subtask Object Id")
                    

                    subtask = await self.repo.find_by_id(
                        id=PydanticObjectId(id),
                        populate=["createdBy", "completedBy"]
                    )

                    if not subtask:
                        raise AppException(404, "Sub task not found")

                    if subtask.deletedAt:
                        raise AppException(400, "Sub task is deleted, not found")
                    
                    json_task_data = await self._get_task_or_raise(str(subtask.taskId.ref.id))
                    await self._check_task_access(json_task_data, user)

                    new_payload = {
                        **payload,
                        "updateAt": datetime.now(IST)

                    }

                    result = await self.repo.update(id=PydanticObjectId(id), data=new_payload, session=session)

                    if not result:
                        raise AppException(400, "Sub task updation failed")
                    
                    return True
                            


                except AppException as e:
                    raise e
                
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")


    async def delete_subtask(self, id: str, user:Dict[str, Any])->bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(id):
                        raise AppException(400, "Invalid subtask Object Id")

                    subtask = await self.repo.find_by_id(
                        id=PydanticObjectId(id),
                        populate=["createdBy", "completedBy"]
                    )

                    if not subtask:
                        raise AppException(404, "Sub task not found")

                    if subtask.deletedAt:
                        raise AppException(400, "Sub task is already deleted")
                    
                    if subtask.isCompleted:
                        raise AppException(400, "Sub task is completed, operation denied")

                    json_task_data = await self._get_task_or_raise(str(subtask.taskId.ref.id))
                    await self._check_task_access(json_task_data, user)

                    

                    result = await self.repo.delete_by_id(id=PydanticObjectId(id))

                    if not result:
                        raise AppException(400, "Sub task deletion failed")
                    
                    activity_payload = self._activity(
                        task_id=str(subtask.taskId.ref.id),
                        action=TASK_ACTIVITY_ACTION.DELETE_SUBTASK,
                        performer_id=user["_id"],
                        description=f"{subtask.title} subtask deleted",
                        metadata={"taskId": str(subtask.taskId.ref.id), "subtaskId": str(subtask.id), "title": subtask.title}
                    )
                   
                    await self.activityRepo.create(activity_payload, session)
                    
                    return True

                except AppException:
                    raise
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")

