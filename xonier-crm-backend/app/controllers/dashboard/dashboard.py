from fastapi import Request
from typing import Optional
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.utils.validate_admin import validate_admin, validate_company_admin
from app.utils.get_team_members import GetTeamMembers
from app.controllers.dashboard.admin_dashboard import AdminDashboardController
from app.controllers.dashboard.company_admin_dashboard import CompanyAdminDashboardController
from app.controllers.dashboard.manager_dashboard import ManagerDashboardController
from app.controllers.dashboard.user_dashboard import UserDashboardController


class DashboardController:
    def __init__(self):
        self.validate_manager = GetTeamMembers()
        self.admin_dashboard = AdminDashboardController()
        self.company_admin_dashboard = CompanyAdminDashboardController()
        self.manager_dashboard = ManagerDashboardController()
        self.user_dashboard = UserDashboardController()

    async def dashboard_stats(
        self,
        request: Request,
        filter: Optional[str] = "this_month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ):
        try:
            user = request.state.user

            
            if validate_admin(user["userRole"]):
                return await self.admin_dashboard.get_stats(
                    user=user,
                    filter=filter,
                    start_date=start_date,
                    end_date=end_date,
                )

            
            if validate_company_admin(user["userRole"]):
                return await self.company_admin_dashboard.get_stats(
                    request=request,
                    filter=filter,
                    start_date=start_date,
                    end_date=end_date,
                )

     
            is_manager = await self.validate_manager.validate_manager(user["_id"])
            if is_manager:
                return await self.manager_dashboard.get_stats(
                    user=user,
                    filter=filter,
                    start_date=start_date,
                    end_date=end_date,
                )

            
            return await self.user_dashboard.get_stats(
                user=user,
                filter=filter,
                start_date=start_date,
                end_date=end_date,
            )

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")