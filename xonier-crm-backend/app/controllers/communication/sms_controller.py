from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from typing import Dict, Any
from urllib.parse import unquote_plus

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
        
    async def bulk_send_sms(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
 
            result = await self.service.bulk_send_sms(payload=payload, user=user)
 
            sent = result["sentCount"]
            failed = result["failedCount"]
 
            if sent == 0:
                message = "No messages were sent"
            elif failed == 0:
                message = f"All {sent} message{'s' if sent > 1 else ''} sent successfully"
            else:
                message = f"{sent} message{'s' if sent > 1 else ''} sent, {failed} failed"
 
            return successResponse(200, message, result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        
    async def get_all_sms_history(self, request: Request):
        try:
            params = dict(request.query_params)
            result = await self.service.get_all_sms_history(filters=params, user=request.state.user)
            return successResponse(200, "SMS history fetched successfully", result)
        except AppException as e:
            raise e
        

    async def get_sms_by_id(self, request: Request, id:str):
        try:
            user = request.state.user

            result = await self.service.get_sms_by_id(id=id, user=user)

            return successResponse(200, "SMS fetched successfully", result)

        except AppException as e:
            raise e


    async def get_conversation(self, request: Request):
        try:
            params = dict(request.query_params)
            sent_to = unquote_plus(params.get("sentTo", ""))    # ← decodes %2B back to +
            sent_from = unquote_plus(params.get("sentFrom", ""))

            if not sent_to or not sent_from:
                raise AppException(400, "sentTo and sentFrom query params are required")

            result = await self.service.get_conversation(
                sent_to=sent_to,
                sent_from=sent_from,
                filters=params
            )
            return successResponse(200, "Conversation fetched successfully", result)
        except AppException as e:
            raise e

