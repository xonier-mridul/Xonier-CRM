from fastapi import Request
from typing import Optional
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.utils.validate_admin import validate_company_admin
from app.services.dashboard.company_admin_dashboard_service import CompanyAdminDashboardService


class CompanyAdminDashboardController:
    def __init__(self):
        self.service = CompanyAdminDashboardService()

    async def get_stats(
        self,
        request: Request,
        filter: Optional[str] = "this_month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ):
        try:
            user = request.state.user

            if not validate_company_admin(user["userRole"]):
                raise AppException(403, "Unauthorized — company admin access required")

            if filter == "custom" and (not start_date or not end_date):
                raise AppException(
                    400, "start_date and end_date are required for custom filter"
                )

            result = await self.service.get_stats(
                user=user,
                filter=filter,
                start_date=start_date,
                end_date=end_date,
            )

            return successResponse(
                200, "Company dashboard stats fetched successfully", result
            )

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")