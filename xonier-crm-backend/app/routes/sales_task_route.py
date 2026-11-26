from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request, Response

from app.core.dependencies import Dependencies
from app.core.enums import FEATURE
from app.schemas.sales_task_schema import RecordId, SalesTaskCreate, SalesTaskSelection
from app.services.lead_service import LeadService
from app.services.sales_task_service import complete_sales_task, list_sales_tasks
from app.utils.custom_response import successResponse
from app.utils.lead_assignment_access import is_active_role

dependencies = Dependencies()


async def use_active_roles(request: Request):
    user = request.state.user
    request.state.user = {
        **user,
        "userRole": [
            role for role in user.get("userRole", [])
            if is_active_role(role) and role.get("companyId") in (None, user.get("companyId"))
        ],
    }


router = APIRouter(dependencies=[
    Depends(dependencies.authorized),
    Depends(use_active_roles),
    Depends(dependencies.company_active),
    Depends(dependencies.company_context),
    Depends(dependencies.feature_access(FEATURE.SALES.value)),
    Depends(dependencies.feature_access(FEATURE.CRM.value)),
    Depends(dependencies.permissions(["lead:read"], active_only=True)),
])
lead_service = LeadService()
assignment_permission = {
    "assign": dependencies.permissions(["lead:assign"], active_only=True),
    "reassign": dependencies.permissions(["lead:reassign"], active_only=True),
}


@router.post("/preview")
async def preview(request: Request, payload: SalesTaskSelection):
    await assignment_permission[payload.mode](request)
    result = await lead_service.preview_sales_task(payload, request.state.user)
    return successResponse(data=result)


@router.post("/assign")
async def assign(request: Request, payload: SalesTaskCreate):
    await assignment_permission[payload.mode](request)
    result = await lead_service.assign_with_sales_tasks(payload, request.state.user)
    return successResponse(data=result)


@router.get("")
async def list_own(
    request: Request,
    response: Response,
    dateField: Literal["assignedAt", "dueDate"] = "dueDate",
    dateFrom: date | None = None,
    dateTo: date | None = None,
    dueToday: bool = False,
    team: bool = False,
    assigneeId: RecordId | None = None,
    search: Annotated[str, Query(max_length=100)] = "",
    status: Literal["pending", "completed"] | None = None,
    page: Annotated[int, Query(ge=1, le=1000000)] = 1,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
):
    response.headers["Cache-Control"] = "private, no-store"
    if team:
        await assignment_permission["assign"](request)
    result = await list_sales_tasks(
        request.state.user, date_field=dateField, date_from=dateFrom, date_to=dateTo,
        due_today=dueToday, status=status, page=page, limit=limit, team=team, assignee_id=assigneeId, search=search,
    )
    return successResponse(data=result)


@router.patch("/{task_id}/complete")
async def complete(request: Request, task_id: RecordId):
    result = await complete_sales_task(request.state.user, task_id)
    return successResponse(data=result)
