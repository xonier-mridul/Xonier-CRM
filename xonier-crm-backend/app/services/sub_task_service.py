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


class SubTaskService:
    def __init__(self):
        self.repo = SubTaskRepository()
        self.taskRepo = TaskRepository()
        self.client = Client
        self.getTeamMembers = GetTeamMembers()
        self.activityRepo = TaskActivityRepository()

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

    async def create_subtask(self, taskId:str, payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    print("yo yo")
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
                            set1 = set(PydanticObjectId(item["id"]) for item in json_task_data["assignedBy"])
                            set2 = set(members)

                            common = set1 & set2

                            if common or (PydanticObjectId(user["_id"]) in [PydanticObjectId(item["id"]) for item in json_task_data["assignedBy"]]):
                                is_manager = True

                        else:
                            if (PydanticObjectId(user["_id"]) in [PydanticObjectId(item["id"]) for item in json_task_data["assignedBy"]]):
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
                        action=TASK_ACTIVITY_ACTION.CREATE_SUB_TASK,
                        performer_id=user["_id"],
                        description=f"Create sub task against {json_task_data["title"]}",
                        metadata={"taskId": taskId, "title": result["title"], "dueDate": result.get("dueDate") if result.get("dueDate") else None, "startDate": result.get("startDate") if result.get("startDate") else None }
                    )

                    await self.activityRepo.create(activity_payload, session)
                    
                    return d_result

        

                except AppException as e:
                    raise e
                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")

