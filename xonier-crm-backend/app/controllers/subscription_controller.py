from fastapi import Request
from app.utils.custom_exception import AppException

class SubscriptionController:
    def __init__(self):
        pass

    async def getAll(self, request:Request):
        try:
            user = request.state.user

            filters = dict(request.query_params)

            

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")