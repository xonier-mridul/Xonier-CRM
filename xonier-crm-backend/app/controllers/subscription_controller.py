from fastapi import Request
from app.utils.custom_exception import AppException
from app.services.subscription_service import SubscriptionService
from app.utils.custom_response import successResponse

class SubscriptionController:
    def __init__(self):
        self.service = SubscriptionService()

    async def getAll(self, request:Request):
        try:
            user = request.state.user

            filters = dict(request.query_params)

            result = await self.service.getAll(filters=filters, user=user)

            return successResponse(200, "All subscription data fetched successfully", result)

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")