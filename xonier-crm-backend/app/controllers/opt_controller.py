from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse

from app.services.otp_service import OTPService


class OPTController:
    def __init__(self):
        self.service = OTPService()

    async def get_all_otp(self, request: Request):
        try:
            user = request.state.user
            
            result = await self.service.get_all_otp(user)

            return successResponse(200, "All otps fetched successfully")


        except AppException as e:
            raise e
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")



        