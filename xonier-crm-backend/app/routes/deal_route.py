from fastapi import APIRouter, Request, Depends
from app.schemas.deal_schema import DealSchema, DealUpdateSchema
from app.controllers.deal_controller import DealController
from app.core.dependencies import Dependencies

router = APIRouter()
dependencies = Dependencies()
controller = DealController()


@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["deal:create"]))])
async def create(request: Request, payload: DealSchema):
    return await controller.create(request, payload.model_dump())


@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["deal:read"]))])
async def get_all(request: Request):
    return await controller.get_all(request=request)


@router.get("/get-by-id/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["deal:read"]))])
async def get_by_id(id: str, request: Request):
    return await controller.get_by_id(request=request, id=id)


@router.put("/update/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["deal:update"]))])
async def update(id: str, request: Request, payload: DealUpdateSchema):
    return await controller.update(id, request, payload.model_dump(exclude_unset=True))

