from fastapi import APIRouter, Depends, Request, Query
from app.core.dependencies import Dependencies
from app.schemas.sub_task_schema import CreateTaskSchema, UpdateSubTaskSchema
from app.controllers.sub_task_controller import SubTaskController
from typing import Optional
router = APIRouter()
dependencies = Dependencies()
controller = SubTaskController()


@router.post("/{taskId}", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:create"]))])
async def create_subtask(taskId: str, request: Request, payload: CreateTaskSchema):
    return await controller.create_subtask(taskId, request, payload.model_dump(mode="json"))

@router.patch("/{subtaskId}/complete", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:create"]))])
async def mark_complete(subtaskId: str, request: Request):
    return await controller.mark_complete(subtaskId, request)


@router.get("/task/{taskId}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:read"]))])
async def get_all_subtasks(
    taskId: str,
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    isCompleted: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
):
    filters = {
        "page": page,
        "limit": limit,
        **({"isCompleted": isCompleted} if isCompleted is not None else {}),
        **({"search": search} if search else {}),
    }
    return await controller.get_all_subtasks(taskId, request, filters)


@router.get("/{subtaskId}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:read"]))])
async def get_subtask_by_id(subtaskId: str, request: Request):
    return await controller.get_subtask_by_id(subtaskId, request)


@router.put("/{subtaskId}/update", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:update"]))])
async def update_subtask(subtaskId: str, request: Request, payload: UpdateSubTaskSchema):
    return await controller.update_subtask(subtaskId=subtaskId, request=request, payload=payload.model_dump(exclude_unset=True))


@router.delete("/{id}/delete", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:delete"]))])
async def delete_subtask(id:str, request: Request):
    return await controller.delete_subtask(id, request)