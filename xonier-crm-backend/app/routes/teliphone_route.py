from fastapi import APIRouter,Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.communication.telephone_schema import TelephoneRegisterSchema, TelephoneUpdateStatusSchema
from app.controllers.telephone_controller import TelephoneController


router = APIRouter()

dependencies = Dependencies()

controller = TelephoneController()


@router.post("/register", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["telephone:create"]))])
async def register(request:Request, payload: TelephoneRegisterSchema):
    return await controller.register(request, payload.model_dump())

@router.get("/getall/active", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["telephone:read"]))])
async def get_all_active(request: Request):
    return await controller.get_all_active(request=request)


@router.patch("/update/status/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["telephone:update"]))])
async def update_status(request: Request, id: str, payload: TelephoneUpdateStatusSchema):
    return await controller.update_status(request=request, id=id, payload=payload.model_dump(exclude_unset=True))


@router.delete("/soft-delete/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["telephone:read"]))])
async def soft_delete(request: Request, id:str):
    return await controller.soft_delete(request=request, id=id)