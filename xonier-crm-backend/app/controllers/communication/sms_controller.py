from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from typing import Dict, Any


class SMSController:
    def __init__(self):
        pass

    async def send_sms(self, request: Request, payload: Dict[str, Any]):
        try:

            user = request.state.user

            

        except AppException as e:
            raise e

