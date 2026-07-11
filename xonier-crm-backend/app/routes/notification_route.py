from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.controllers.notification_controller import NotificationController
from app.schemas.notification_schema import MarkAsReadSchema, NotificationFilterSchema

router = APIRouter()
dependencies = Dependencies()
controller = NotificationController()

auth_deps = [
    Depends(dependencies.authorized),
    Depends(dependencies.company_active),
    Depends(dependencies.company_context),
]


@router.get("/", status_code=200, dependencies=auth_deps)
async def get_my_notifications(request: Request, filters: NotificationFilterSchema = Depends()):
    return await controller.get_my_notifications(request, filters)


@router.get("/unread-count", status_code=200, dependencies=auth_deps)
async def get_unread_count(request: Request):
    return await controller.get_unread_count(request)


@router.patch("/mark-read", status_code=200, dependencies=auth_deps)
async def mark_as_read(request: Request, payload: MarkAsReadSchema):
    return await controller.mark_as_read(request, payload)


@router.patch("/mark-all-read", status_code=200, dependencies=auth_deps)
async def mark_all_as_read(request: Request):
    return await controller.mark_all_as_read(request)


@router.patch("/archive/{notification_id}", status_code=200, dependencies=auth_deps)
async def archive(request: Request, notification_id: str):
    return await controller.archive(request, notification_id)


@router.delete("/clear-all", status_code=200, dependencies=auth_deps)
async def clear_all(request: Request):
    return await controller.clear_all(request)


@router.delete("/{notification_id}", status_code=200, dependencies=auth_deps)
async def delete_notification(request: Request, notification_id: str):
    return await controller.delete_notification(request, notification_id)