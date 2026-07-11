from typing import Dict, Any, Optional
from fastapi import Request
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.notification_service import NotificationService
from app.schemas.notification_schema import MarkAsReadSchema, NotificationFilterSchema


class NotificationController:
    def __init__(self):
        self.service = NotificationService()

    async def get_my_notifications(self, request: Request, filters: NotificationFilterSchema):
        try:
            user = request.state.user

            result = await self.service.get_my_notifications(
                user=user,
                page=filters.page,
                limit=filters.limit,
                status=filters.status,
                notification_type=filters.type,
                entity_type=filters.entityType,
                is_read=filters.isRead,
            )

            return successResponse(200, "Notifications fetched successfully", result)

        except AppException as e:
            raise e

    async def get_unread_count(self, request: Request):
        try:
            user = request.state.user
            result = await self.service.get_unread_count(user)
            return successResponse(200, "Unread count fetched successfully", result)

        except AppException as e:
            raise e

    async def mark_as_read(self, request: Request, payload: MarkAsReadSchema):
        try:
            user = request.state.user
            result = await self.service.mark_as_read(user, payload.notificationIds)
            return successResponse(200, "Notifications marked as read", result)

        except AppException as e:
            raise e

    async def mark_all_as_read(self, request: Request):
        try:
            user = request.state.user
            result = await self.service.mark_all_as_read(user)
            return successResponse(200, "All notifications marked as read", result)

        except AppException as e:
            raise e

    async def archive(self, request: Request, notification_id: str):
        try:
            user = request.state.user
            result = await self.service.archive(user, notification_id)
            return successResponse(200, "Notification archived", result)

        except AppException as e:
            raise e

    async def delete_notification(self, request: Request, notification_id: str):
        try:
            user = request.state.user
            await self.service.delete_notification(user, notification_id)
            return successResponse(200, "Notification deleted successfully")

        except AppException as e:
            raise e

    async def clear_all(self, request: Request):
        try:
            user = request.state.user
            result = await self.service.clear_all(user)
            return successResponse(200, "All notifications cleared", result)

        except AppException as e:
            raise e