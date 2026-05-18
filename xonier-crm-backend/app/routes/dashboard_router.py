from fastapi import APIRouter, Depends, Request, Query
from typing import Optional
from app.controllers.dashboard.dashboard import DashboardController
from app.core.dependencies import Dependencies

router = APIRouter(prefix="/api/dashboard")

dashboard_controller = DashboardController()

dependencies = Dependencies()


@router.get(
    "/stats",
    status_code=200,
    dependencies=[
        Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context),
        Depends(dependencies.permissions(["dashboard:read"]))
    ]
)
async def get_dashboard_stats(
    request: Request,
    filter: str = Query(
        default="this_month",
        enum=["today", "this_week", "this_month", "this_year", "custom"]
    ),
    start_date: Optional[str] = Query(
        default=None,
        description="Required only for custom filter. Format: YYYY-MM-DD"
    ),
    end_date: Optional[str] = Query(
        default=None,
        description="Required only for custom filter. Format: YYYY-MM-DD"
    ),
):
    return await dashboard_controller.dashboard_stats(
        request=request,
        filter=filter,
        start_date=start_date,
        end_date=end_date,
    )