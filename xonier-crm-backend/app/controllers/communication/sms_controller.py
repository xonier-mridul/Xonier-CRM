from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from typing import Dict, Any

from app.services.communication.sms_service import SMSService


class SMSController:
    def __init__(self):
        self.service = SMSService()

    async def send_sms(self, request: Request, payload: Dict[str, Any]):
        try:

            user = request.state.user

            result = await self.service.send_sms(payload=payload, user=user)

            return successResponse(200, f"message send successfully ", result)

            

        except AppException as e:
            print("error: ", e)
            raise e

