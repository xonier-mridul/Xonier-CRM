from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from fastapi import Request
from typing import Dict, Any
from beanie import PydanticObjectId

from app.services.team_service import TeamService


class TeamController:
    def __init__(self):
        self.service = TeamService()

    async def get_all(self, request: Request):
        try:
            filters = request.query_params

            result = await self.service.get_all(int(filters["page"]), int(filters["limit"]), filters)

            return successResponse(200, "All teams data fetched successfully", result)

        except AppException as e:
            raise e

    async def create(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user

            result = await self.service.create(
                payload,
                PydanticObjectId(user.get("_id")),
                ipAddress=request.client.host if request.client else None,
                userAgent=request.headers.get("user-agent"),
            )

            return successResponse(201, f"{result["name"]} Team created Successfully", result)

        except AppException as e:
            raise e

    async def get_by_id(self, request: Request, id: str):
        try:
            filters = request.query_params
            activityPage = int(filters.get("activityPage", 1))
            activityLimit = int(filters.get("activityLimit", 10))

            result = await self.service.get_by_id(PydanticObjectId(id), activityPage, activityLimit)

            return successResponse(200, "Team data fetched successfully", result)

        except AppException as e:
            raise e

    async def update(self, request: Request, id: str, payload: Dict[str, Any]):
        try:
            user = request.state.user

            await self.service.update(
                id=id,
                payload=payload,
                updatedBy=PydanticObjectId(user.get("_id")),
                ipAddress=request.client.host if request.client else None,
                userAgent=request.headers.get("user-agent"),
            )

            return successResponse(200, f"{payload.get("name")} team updated successfully")

        except AppException as e:
            raise e

    async def delete(self, request: Request, id: str):
        try:
            user = request.state.user

            await self.service.delete(
                id=id,
                deletedBy=PydanticObjectId(user.get("_id")) if user else None,
                ipAddress=request.client.host if request.client else None,
                userAgent=request.headers.get("user-agent"),
            )

            return successResponse(200, "Team delete successfully")

        except AppException as e:
            raise e

    async def get_activity(self, request: Request, id: str):
        try:
            filters = request.query_params
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 10))

            result = await self.service.get_activity(PydanticObjectId(id), page, limit)

            return successResponse(200, "Team activity fetched successfully", result)

        except AppException as e:
            raise e