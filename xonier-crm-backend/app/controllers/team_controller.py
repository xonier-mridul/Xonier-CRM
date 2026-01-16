
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

            result = await self.service.create(payload, PydanticObjectId(user.get("_id")))

            return successResponse(201, f"{result["name"]} Team created Successfully", result)


        except AppException as e:
            raise e
        
        
    async def get_by_id(self,request: Request, id: str):
        try:
            result = await self.service.get_by_id(PydanticObjectId(id))

            return successResponse(200, "Team data fetched successfully", result)
           

        except AppException as e:
            raise e
        
    async def update(self, request: Request, id:str, payload: Dict[str, Any]):
        try:
            user = request.state.user

            await self.service.update(id=id, payload=payload, updatedBy=PydanticObjectId(user.get("_id")))
            
            return successResponse(200, f"{payload.get("name")} team updated successfully")


        except AppException as e:
            raise e
        

    async def delete(self, id:str):
        try:
            await self.service.delete(id=id)

            return successResponse(200, "Team delete successfully")

        except AppException as e:
            raise e