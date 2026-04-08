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
            filters = request.query_params
            result = await self.service.get_all_otp(user, filters)

            return successResponse(200, "All otps fetched successfully", result)


        except AppException as e:
            raise e
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")



        