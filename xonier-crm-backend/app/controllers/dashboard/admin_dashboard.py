from typing import Dict, Any, Optional
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.utils.validate_admin import validate_admin
from app.services.dashboard.admin_dashboard_service import SuperAdminDashboardService


class AdminDashboardController:
    def __init__(self):
        self.service = SuperAdminDashboardService()

    async def get_stats(
        self,
        user: Dict[str, Any],
        filter: Optional[str] = "this_month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ):
        try:
            is_admin = validate_admin(user["userRole"])

            if not is_admin:
                raise AppException(403, "Unauthorized, only admin can access this dashboard")

            if filter == "custom" and (not start_date or not end_date):
                raise AppException(400, "start_date and end_date are required for custom filter")

            result = await self.service.get_stats(
                user=user,
                filter=filter,
                start_date=start_date,
                end_date=end_date,
            )

            return successResponse(200, "Admin dashboard stats fetched successfully", result)

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")