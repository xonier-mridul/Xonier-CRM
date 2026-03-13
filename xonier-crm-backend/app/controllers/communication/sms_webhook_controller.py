
from fastapi import Request
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
        

    async def handle_sms_reply(self, request: Request):
        try:

            form_data = await request.form()

            



        except AppException as e:
            raise e