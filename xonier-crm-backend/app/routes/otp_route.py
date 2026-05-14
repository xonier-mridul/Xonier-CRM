from fastapi import APIRouter, Depends, Response, Request
from app.core.dependencies import Dependencies
from app.controllers.opt_controller import OPTController


router = APIRouter()
dependencies = Dependencies()
controller = OPTController()

@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["read:otp"]))])
async def get_all_otps(request: Request):
    return await controller.get_all_otp(request)
