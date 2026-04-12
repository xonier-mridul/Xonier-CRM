from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.sub_task_schema import CreateTaskSchema
from app.controllers.sub_task_controller import SubTaskController
router = APIRouter()
dependencies = Dependencies()
controller = SubTaskController()


@router.post("/{taskId}", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:create"]))])
async def create_subtask(taskId: str, request: Request, payload: CreateTaskSchema):
    return await controller.create_subtask(taskId, request, payload.model_dump(mode="json"))


