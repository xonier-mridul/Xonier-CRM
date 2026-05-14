from fastapi import APIRouter, Depends, Request, Query
from app.core.dependencies import Dependencies
from app.controllers.task_timelog_controller import TimeLogController
from typing import Optional

router = APIRouter()

dependencies = Dependencies()
controller = TimeLogController()


@router.post("/{task_id}/timer/start", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["task_timer:start"]))])
async def start_timer(request: Request, task_id: str):
    return await controller.start(request, task_id)


@router.patch("/timer/{log_id}/pause", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["task_timer:pause"]))])
async def pause_timer(request: Request, log_id: str):
    return await controller.pause(request, log_id)


@router.patch("/timer/{log_id}/resume", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["task_timer:resume"]))])
async def resume_timer(request: Request, log_id: str):
    return await controller.resume(request, log_id)


@router.patch("/timer/{log_id}/stop", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["task_timer:stop"]))])
async def stop_timer(request: Request, log_id: str, note: Optional[str] = Query(None)):
    return await controller.stop(request, log_id, note)


@router.get("/{task_id}/timer", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["task_timer:read"]))])
async def get_by_task(request: Request, task_id: str):
    return await controller.get_by_task(request, task_id)


@router.get("/{task_id}/timer/active", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["task_timer:read"]))])
async def get_active_timer(request: Request, task_id: str):
    return await controller.get_active_timer(request, task_id)