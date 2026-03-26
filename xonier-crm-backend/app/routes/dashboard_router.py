from fastapi import APIRouter, Depends, Request, Query
from typing import Optional
from app.core.dependencies import Dependencies
from app.controllers.dashboard.dashboard import DashboardController

dependencies = Dependencies()
controller = DashboardController()

router = APIRouter(prefix="/api/dashboard")

@router.get("/stats", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["dashboard:read"]))])
async def dashboard_stats(
    request: Request,
    filter: Optional[str] = Query(default="this_month", enum=["today", "this_week", "this_month", "this_year", "custom"]),
    start_date: Optional[str] = Query(default=None),
    end_date: Optional[str] = Query(default=None),
):
    return await controller.dashboard_stats(request=request, filter=filter, start_date=start_date, end_date=end_date)