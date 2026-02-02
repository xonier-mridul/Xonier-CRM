
from app.schemas.user_form_schema import CreateFormSchema
from fastapi import APIRouter, Request, Depends
from app.controllers.user_form_controller import UserFormController
from app.core.dependencies import Dependencies

router = APIRouter()
controller = UserFormController()
dependencies = Dependencies()


@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:create"]))])
async def create(request: Request, payload: CreateFormSchema):
    return await controller.create(request=request, payload=payload.model_dump())


@router.get("/user-id/lead", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:create"]))])
async def find_by_user_id(request: Request):
    return await controller.get_lead_by_user_id(request)

@router.get("/user-id/deal", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:create"]))])
async def find_by_user_id(request: Request):
    return await controller.get_deal_by_user_id(request)

@router.put("/update/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:create"]))])
async def update(request: Request, id: str, payload: CreateFormSchema):
    return await controller.update(request, id,  payload.model_dump())
