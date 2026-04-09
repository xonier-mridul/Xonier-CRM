from fastapi import APIRouter, Depends, Request, Query
from app.schemas.task_schema import (
    CreateTaskSchema, UpdateTaskSchema, UpdateTaskStatusSchema,
    UpdateTaskPrioritySchema, AssignTaskSchema, ReorderTaskSchema,
    MoveTaskSchema, BulkAssignTaskSchema, BulkStatusUpdateSchema, AddWatcherSchema
)
from app.schemas.task_remark_schema import CreateTaskRemarkSchema, UpdateAcknowledgeRemark
from app.core.dependencies import Dependencies
from app.controllers.task_controller import TaskController
from typing import Optional
 
router = APIRouter()
dependencies = Dependencies()
controller = TaskController()
 
 
@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:create"]))])
async def create_task(request: Request, payload: CreateTaskSchema):
    return await controller.create_task(request, payload.model_dump(mode="json"))


@router.post("/{taskId}/remark", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["remark:create"]))])
async def create_remark(taskId: str, request: Request, payload: CreateTaskRemarkSchema):
    return await controller.create_remark(taskId, request, payload.model_dump(mode="json"))


@router.get("/{taskId}/remarks", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["remark:read"]))])
async def get_remarks(taskId: str, request:Request):
    return await controller.get_remarks(taskId, request)
 
 
@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:read"]))])
async def get_all_tasks(request: Request):
    return await controller.get_all_tasks(request)
 
 
@router.get("/kanban/{category_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:read"]))])
async def get_kanban_board(request: Request, category_id: str):
    return await controller.get_kanban_board(request, category_id)
 
 
@router.get("/my-tasks", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:read"]))])
async def get_my_tasks(request: Request):
    return await controller.get_my_tasks(request)
 
 
@router.get("/due-today", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:read"]))])
async def get_due_today(request: Request):
    return await controller.get_due_today(request)
 
 
@router.get("/overdue", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:read"]))])
async def get_overdue_tasks(request: Request):
    return await controller.get_overdue_tasks(request)
 
 
@router.get("/by-entity/{entity_type}/{entity_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:read"]))])
async def get_tasks_by_entity(request: Request, entity_type: str, entity_id: str):
    return await controller.get_tasks_by_entity(request, entity_type, entity_id)
 
 
@router.get("/{task_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:read"]))])
async def get_task_by_id(request: Request, task_id: str):
    return await controller.get_task_by_id(request, task_id)
 
 
@router.get("/{task_id}/activity", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:read"]))])
async def get_task_activity(request: Request, task_id: str):
    return await controller.get_task_activity(request, task_id)
 
 
@router.put("/update/{task_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:update"]))])
async def update_task(request: Request, task_id: str, payload: UpdateTaskSchema):
    return await controller.update_task(request, task_id, payload.model_dump(mode="json", exclude_none=True))
 

@router.patch("/{remarkId}/remarks/acknowledge", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["remark:read"]))])
async def update_remarks_acknowledge(remarkId: str, request:Request, payload:UpdateAcknowledgeRemark):
    return await controller.update_remarks_acknowledge(request,remarkId, payload.model_dump(mode="json", exclude_unset=True))


@router.patch("/status/{task_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:statusChange"]))])
async def update_task_status(request: Request, task_id: str, payload: UpdateTaskStatusSchema):
    return await controller.update_task_status(request, task_id, payload.model_dump(mode="json"))
 
 
@router.patch("/move/{task_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:update"]))])
async def move_task(request: Request, task_id: str, payload: MoveTaskSchema):
    return await controller.move_task(request, task_id, payload.model_dump(mode="json"))



 
@router.patch("/reorder", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:update"]))])
async def reorder_tasks(request: Request, payload: ReorderTaskSchema):
    return await controller.reorder_tasks(request, payload.model_dump(mode="json"))
 
 
@router.patch("/assign/{task_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:assign"]))])
async def assign_task(request: Request, task_id: str, payload: AssignTaskSchema):
    return await controller.assign_task(request, task_id, payload.model_dump(mode="json"))
 
 
@router.post("/{task_id}/watcher", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:update"]))])
async def add_watcher(request: Request, task_id: str, payload: AddWatcherSchema):
    return await controller.add_watcher(request, task_id, payload.model_dump(mode="json"))
 
 
@router.delete("/{task_id}/watcher/{watcher_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:update"]))])
async def remove_watcher(request: Request, task_id: str, watcher_id: str):
    return await controller.remove_watcher(request, task_id, watcher_id)
 
 
@router.post("/bulk-assign", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:assign"]))])
async def bulk_assign_tasks(request: Request, payload: BulkAssignTaskSchema):
    return await controller.bulk_assign_tasks(request, payload.model_dump(mode="json"))
 
 
@router.patch("/bulk-status", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:update"]))])
async def bulk_update_status(request: Request, payload: BulkStatusUpdateSchema):
    return await controller.bulk_update_status(request, payload.model_dump(mode="json"))
 
 
@router.delete("/delete/{task_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:delete"]))])
async def delete_task(request: Request, task_id: str):
    return await controller.delete_task(request, task_id)


@router.get("/all/deleted", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["task:read"]))])
async def get_all_deleted(request: Request):
    return await controller.get_all_deleted(request)
 

@router.get("/stats/user/{user_id}")
async def get_user_task_stats(
    request: Request,
    user_id: str,
    fromDate: Optional[str] = Query(None),
    toDate: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    entityType: Optional[str] = Query(None),
):
    return await controller.get_user_task_stats(
        request=request,
        user_id=user_id,
        filters={
            "fromDate": fromDate,
            "toDate": toDate,
            "category": category,
            "priority": priority,
            "entityType": entityType,
        }
    )

