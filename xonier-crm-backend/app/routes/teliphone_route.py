from fastapi import APIRouter,Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.communication.telephone_schema import TelephoneRegisterSchema
from app.controllers.telephone_controller import TelephoneController


router = APIRouter()

dependencies = Dependencies()

controller = TelephoneController()


@router.post("/register", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["telephone:create"]))])
async def register(request:Request, payload: TelephoneRegisterSchema):
    return await controller.register(request, payload.model_dump())

@router.get("/getall/active", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["telephone:read"]))])
async def get_all_active(request: Request):
    return await controller.get_all_active(request=request)