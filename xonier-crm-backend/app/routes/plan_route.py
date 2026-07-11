from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.plan_schema import PlanCreateSchema, PlanUpdateSchema
from app.controllers.plan_controller import PlanController

router = APIRouter()

dependencies = Dependencies()

controller = PlanController()


@router.post("/", status_code=201, dependencies=[Depends(dependencies.authorized) ,Depends(dependencies.company_active), Depends(dependencies.company_context), Depends(dependencies.onlyForAdmin)])
async def create(request: Request, payload: PlanCreateSchema):
    return await controller.create(request, payload.model_dump(mode="json"))


@router.get("/", status_code=200)
async def getAll(request: Request):
    return await controller.getAll(request)


@router.get("/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context), Depends(dependencies.onlyForAdmin)])
async def getById(request: Request, id: str):
    return await controller.getById(request, id)

@router.put("/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.onlyForAdmin)])
async def update(request: Request, id:str, payload: PlanUpdateSchema ):
    return await controller.update(request, id, payload.model_dump(exclude_unset=True))

@router.delete("/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.onlyForAdmin)])
async def delete(request: Request, id:str):
    return await controller.delete(request, id)