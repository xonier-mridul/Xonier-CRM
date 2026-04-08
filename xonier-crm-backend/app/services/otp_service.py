from app.repositories.otp_repository import OtpRepository
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.validate_admin import validate_admin
from app.core.crypto import encryptor
from fastapi.encoders import jsonable_encoder

class OTPService:
    def __init__(self):
        self.repo = OtpRepository()
        self.crypto = encryptor


    async def get_all_otp(self, user: Dict[str, Any], filters: Dict[str, Any]):
        try:
            page = filters.get("page") or 1
            limit = filters.get("limit") or 20
            is_admin = validate_admin(user["userRole"])

            if not is_admin:
                raise AppException(403, "You are not authorized person to access this data")
            
            query = {}
            
            result = await self.repo.get_all(page=int(page), limit=int(limit), filters=query)

            if not result:
                raise AppException(404, "Otps not found")
            
            
            result = jsonable_encoder(result)
            if not result.get("Data") and result["data"] == []:
                raise AppException(400, "OTPs collection is empty, No OTPs in database")
            

            for item in result["data"]:
                
                email = item.get("encrypt_mail")
                otp = item.get("encrypt_opt")
                
                if email:
                    item["encrypt_mail"] = self.crypto.decrypt_data(email)
                if otp:
                    item["encrypt_opt"] = self.crypto.decrypt_data(otp)
            
            
            return result


        except AppException as e:
            raise e
        
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
