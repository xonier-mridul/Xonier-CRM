from fastapi import APIRouter, Depends, Request
from app.schemas.task_category_schema import CreateTaskCategorySchema, UpdateTaskCategorySchema
from app.core.dependencies import Dependencies
from app.controllers.task_category_controller import TaskCategoryController
 
router = APIRouter()
dependencies = Dependencies()
controller = TaskCategoryController()
 
 
@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskCategory:create"]))])
async def create_task_category(request: Request, payload: CreateTaskCategorySchema):
    return await controller.create_task_category(request, payload.model_dump(mode="json"))
 
 
@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskCategory:read"]))])
async def get_all_task_categories(request: Request):
    return await controller.get_all_task_categories(request)
 
 
@router.get("/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskCategory:read"]))])
async def get_task_category_by_id(request: Request, category_id: str):
    return await controller.get_task_category_by_id(request, category_id)
 
 
@router.put("/update/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskCategory:update"]))])
async def update_task_category(request: Request, category_id: str, payload: UpdateTaskCategorySchema):
    return await controller.update_task_category(request, category_id, payload.model_dump(mode="json", exclude_none=True))
 
 
@router.patch("/toggle-active/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskCategory:update"]))])
async def toggle_active(request: Request, category_id: str):
    return await controller.toggle_active(request, category_id)
 
 
@router.delete("/delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["taskCategory:delete"]))])
async def delete_task_category(request: Request, category_id: str):
    return await controller.delete_task_category(request, category_id)
 