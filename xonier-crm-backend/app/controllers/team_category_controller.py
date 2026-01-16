
from fastapi import Request
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.services.team_category_service import TeamCategoryService

class TeamCategoryController:
    def __init__(self):
        self.service = TeamCategoryService()

    async def create(self, request: Request, payload:Dict[str, Any] ):
        try:
            user = request.state.user

            result = await self.service.create(payload, user["_id"])
            return successResponse(201, "Category created successfully", result)


        except AppException as e:
            raise e
        
    async def get_all(self, request:Request):
        try:
           filters = request.query_params

           result = await self.service.get_all(filters=filters)

           return successResponse(200, "Team category data fetched successfully", result)


        except AppException as e:
            raise e
        
    async def get_all_without_pagination(self, request:Request):
        try:
            filters = request.query_params

            result = await self.service.get_all_without_pagination(filters)

            return successResponse(200, "All team category fetched successfully", result)

        except AppException as e:
            raise e
        

    async def delete(self, request:Request, id:str):
        try:
            user = request.state.user

            result = await self.service.delete(id)

            return successResponse(200, "Category deleted successfully")


        except AppException as e:
            raise e