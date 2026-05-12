from typing import Dict, Any
from app.utils.custom_exception import AppException

class SubscriptionService:
    def __init__(self):
        pass


    async def getAll(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")