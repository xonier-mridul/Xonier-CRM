from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.activity_service import ActivityService


class ActivityController:
    def __init__(self):
        self.service = ActivityService()

    async def get_user_activity(self, id: str, request: Request):
        try:
            user = request.state.user
            query_params = dict(request.query_params)

            result = await self.service.get_user_activity(
                user_id=id,
                current_user=user,
                filters=query_params
            )

            return successResponse(
                200,
                "User activity fetched successfully",
                result
            )

        except AppException as e:
            raise e
    




    async def get_user_activity_summary(self, id: str, request: Request):
        user = request.state.user
        filters = dict(request.query_params)

        result = await self.service.get_user_activity_summary(
            user_id=id,
            current_user=user,
            filters=filters
        )

        return successResponse(
            200,
            "User activity summary fetched successfully",
            result
        )

