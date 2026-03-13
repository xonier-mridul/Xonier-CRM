from fastapi import APIRouter, Request, Form
from app.controllers.communication.sms_webhook_controller import SMSWebhookController


router = APIRouter()

controller = SMSWebhookController()


@router.post("/status", status_code=200)
async def get_sms_status(request: Request):
    return await controller.get_sms_status(request)


@router.post("/reply", status_code=200)
async def handle_sms_reply(request: Request,From: str = Form(...), To: str = Form(...), Body: str = Form(...), MessageSid: str = Form(...)):
    return await controller.handle_sms_reply(request, From, To, Body, MessageSid)
