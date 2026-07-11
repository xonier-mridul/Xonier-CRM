from typing import Dict, Any, Optional
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.utils.get_team_members import GetTeamMembers
from app.services.dashboard.manager_dashboard_service import ManagerDashboardService


class ManagerDashboardController:
    def __init__(self):
        self.service = ManagerDashboardService()
        self.validate_manager = GetTeamMembers()

    async def get_stats(
        self,
        user: Dict[str, Any],
        filter: str = "this_month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ):
        try:
      
            is_manager = await self.validate_manager.validate_manager(user["_id"])

            if not is_manager:
                raise AppException(403, "Unauthorized, you are not a manager of any team")

            result = await self.service.get_stats(
                user=user,
                filter=filter,
                start_date=start_date,
                end_date=end_date,
            )

            return successResponse(200, "Manager dashboard stats fetched successfully", result)

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
