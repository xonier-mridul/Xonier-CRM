from fastapi import APIRouter, Depends, Request
from app.schemas.task_status_schema import CreateTaskStatusSchema, UpdateTaskStatusSchema, ReorderTaskStatusSchema
from app.core.dependencies import Dependencies
from app.controllers.task_status_controller import TaskStatusController
 
router = APIRouter()
dependencies = Dependencies()
controller = TaskStatusController()
 
 
@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskStatus:create"]))])
async def create_task_status(request: Request, payload: CreateTaskStatusSchema):
    return await controller.create_task_status(request, payload.model_dump(mode="json"))
 
 
@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskStatus:read"]))])
async def get_all_task_statuses(request: Request):
    return await controller.get_all_task_statuses(request)
 
 
@router.get("/by-category/{category_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskStatus:read"]))])
async def get_statuses_by_category(request: Request, category_id: str):
    return await controller.get_statuses_by_category(request, category_id)
 
 
@router.get("/{status_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskStatus:read"]))])
async def get_task_status_by_id(request: Request, status_id: str):
    return await controller.get_task_status_by_id(request, status_id)
 
 
@router.put("/update/{status_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskStatus:update"]))])
async def update_task_status(request: Request, status_id: str, payload: UpdateTaskStatusSchema):
    return await controller.update_task_status(request, status_id, payload.model_dump(mode="json", exclude_none=True))
 
 
@router.patch("/reorder", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskStatus:update"]))])
async def reorder_task_statuses(request: Request, payload: ReorderTaskStatusSchema):
    return await controller.reorder_task_statuses(request, payload.model_dump(mode="json"))
 
 
@router.delete("/delete/{status_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskStatus:delete"]))])
async def delete_task_status(request: Request, status_id: str):
    return await controller.delete_task_status(request, status_id)


@router.get("/deleted/all-deleted", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskStatus:read"]))])
async def get_all_deleted_statuses(request: Request):
    return await controller.get_all_deleted_statuses(request)
 
 
@router.delete("/permanent-delete/{status_id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskStatus:delete"]))])
async def permanent_delete_task_status(request: Request, status_id: str):
    return await controller.permanent_delete_task_status(request, status_id)
