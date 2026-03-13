
from fastapi import Request, Response
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.communication.sms_webhook_service import SMSWebhookService
from twilio.request_validator import RequestValidator



class SMSWebhookController:
    def __init__(self):
        self.service = SMSWebhookService()


    async def get_sms_status(self, request:Request):
        try:

            form = await request.form()


            await self.service.get_sms_status(formData=form)
            return successResponse(200, "Webhook status updated")


        except AppException as e:
            raise e
        

    async def handle_sms_reply(self, request: Request, From: str, To:str, Body:str, MessageSid:str):
        try:
            await self.service.handle_sms_reply(
                from_phone=From,
                to_phone=To,
                body=Body,
                message_sid=MessageSid
            )
            return Response(  
        content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        media_type="application/xml"
    )

        except AppException as e:
            raise e