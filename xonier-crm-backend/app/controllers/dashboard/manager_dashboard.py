 
from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.utils.validate_admin import validate_admin
from typing import Dict, Any

class  ManagerDashboardController:
    def __init__(self):
        pass

    async def get_stats(user: Dict[str, Any]):
        try:
            is_admin = validate_admin(user["userRole"])

        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")