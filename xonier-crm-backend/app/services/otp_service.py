from app.repositories.otp_repository import OtpRepository
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.validate_admin import validate_admin

class OTPService:
    def __init__(self):
        self.repo = OtpRepository()


    async def get_all_otp(user: Dict[str, Any]):
        try:
            is_admin = validate_admin(user["userRole"])

            if not is_admin:
                raise AppException(403, "You are not authorized person to access this data")
            

            




        except AppException as e:
            raise e
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
