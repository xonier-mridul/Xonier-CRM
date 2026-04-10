
from fastapi import APIRouter, Depends, Request, Query
from app.schemas.task_report_schema import (
    SubmitMorningAgendaSchema,
    UpdateMorningAgendaSchema,
    SubmitEveningReportSchema,
    UpdateEveningReportSchema,
    ManagerReviewSchema,
)
from app.core.dependencies import Dependencies
from app.controllers.task_report_controller import TaskReportController
from typing import Optional

router = APIRouter()
dependencies = Dependencies()
controller = TaskReportController()


@router.post(
    "/morning/submit",
    status_code=201,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["taskReport:create"]))
    ]
)
async def submit_morning_agenda(request: Request, payload: SubmitMorningAgendaSchema):
    return await controller.submit_morning_agenda(request, payload.model_dump(mode="json"))


@router.patch(
    "/{report_id}/morning/update",
    status_code=200,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["taskReport:update"]))
    ]
)
async def update_morning_agenda(request: Request, report_id: str, payload: UpdateMorningAgendaSchema):
    return await controller.update_morning_agenda(request, report_id, payload.model_dump(mode="json", exclude_none=True))


@router.post(
    "/{report_id}/evening/submit",
    status_code=200,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["taskReport:update"]))
    ]
)
async def submit_evening_report(request: Request, report_id: str, payload: SubmitEveningReportSchema):
    return await controller.submit_evening_report(request, report_id, payload.model_dump(mode="json"))


@router.patch(
    "/{report_id}/evening/update",
    status_code=200,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["taskReport:update"]))
    ]
)
async def update_evening_report(request: Request, report_id: str, payload: UpdateEveningReportSchema):
    return await controller.update_evening_report(request, report_id, payload.model_dump(mode="json", exclude_none=True))


@router.patch(
    "/{report_id}/review",
    status_code=200,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["taskReport:review"]))
    ]
)
async def review_task_report(request: Request, report_id: str, payload: ManagerReviewSchema):
    return await controller.review_task_report(request, report_id, payload.model_dump(mode="json"))


@router.get(
    "/all",
    status_code=200,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["taskReport:read"]))
    ]
)
async def get_all_reports(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    userId: Optional[str] = Query(None),
    fromDate: Optional[str] = Query(None),
    toDate: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    filters = {
        "page": page, "limit": limit,
        **({"status": status} if status else {}),
        **({"userId": userId} if userId else {}),
        **({"fromDate": fromDate} if fromDate else {}),
        **({"toDate": toDate} if toDate else {}),
        **({"search": search} if search else {}),
    }
    return await controller.get_all_reports(request, filters)


@router.get(
    "/my-reports",
    status_code=200,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["taskReport:read"]))
    ]
)
async def get_my_reports(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    fromDate: Optional[str] = Query(None),
    toDate: Optional[str] = Query(None),
):
    filters = {
        "page": page, "limit": limit,
        **({"status": status} if status else {}),
        **({"fromDate": fromDate} if fromDate else {}),
        **({"toDate": toDate} if toDate else {}),
    }
    return await controller.get_my_reports(request, filters)


@router.get(
    "/{report_id}",
    status_code=200,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["taskReport:read"]))
    ]
)
async def get_report_by_id(request: Request, report_id: str):
    return await controller.get_report_by_id(request, report_id)


@router.delete(
    "/{report_id}",
    status_code=200,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.permissions(["taskReport:delete"]))
    ]
)
async def delete_task_report(request: Request, report_id: str):
    return await controller.delete_task_report(request, report_id)