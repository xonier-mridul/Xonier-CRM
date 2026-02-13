from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.custom_form_field_schema import CreateCustomFormFieldSchema
from app.controllers.custom_form_field_controller import CustomFormFieldController

router = APIRouter()
dependencies = Dependencies()
controller = CustomFormFieldController()


@router.post("/create", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:create"]))])
async def create(request: Request, payload: CreateCustomFormFieldSchema):
    return await controller.create(request=request, payload=payload.model_dump(exclude_unset=True))

@router.get("/get_buy_creator", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:create"]))])
async def get_all_by_creator(request: Request):
    return await controller.get_all_by_creator(request)


@router.delete("/delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["lead:create"]))])
async def delete(request: Request, id:str):
    return await controller.delete(request, id)