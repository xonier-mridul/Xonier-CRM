from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.schemas.communication.sms_schema import SEND_SMS_SCHEMA
from app.controllers.communication.sms_controller import SMSController


router = APIRouter()

dependencies = Dependencies()

controller = SMSController()


@router.post('/send', status_code=200, dependencies=[Depends(dependencies.authorized)])
async def send_sms(request: Request, payload: SEND_SMS_SCHEMA ):
    return await controller.send_sms(request=request, payload=payload.model_dump(mode="json"))


@router.get('/history', status_code=200, dependencies=[Depends(dependencies.authorized)])
async def get_all_sms_history(request: Request):
    return await controller.get_all_sms_history(request=request)


@router.get('/conversation', status_code=200, dependencies=[Depends(dependencies.authorized)])
async def get_conversation(request: Request):
    return await controller.get_conversation(request=request)