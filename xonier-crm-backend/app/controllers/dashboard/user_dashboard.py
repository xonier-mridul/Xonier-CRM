from typing import Dict, Any, Optional
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.dashboard.user_dashboard_service import UserDashboardService


class UserDashboardController:
    def __init__(self):
        self.service = UserDashboardService()

    async def get_stats(
        self,
        user: Dict[str, Any],
        filter: Optional[str] = "this_month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ):
        try:
            if filter == "custom" and (not start_date or not end_date):
                raise AppException(400, "start_date and end_date are required for custom filter")

            result = await self.service.get_stats(
                user=user,
                filter=filter,
                start_date=start_date,
                end_date=end_date,
            )

            return successResponse(200, "User dashboard stats fetched successfully", result)

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")