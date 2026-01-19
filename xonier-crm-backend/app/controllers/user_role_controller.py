from app.utils.custom_exception import AppException

from typing import Dict, Any
from fastapi import Request
from app.services.user_role_service import UserRoleService
from app.utils.custom_response import successResponse

class UserRoleController:
    def __init__(self):
        self.service = UserRoleService()
        

    async def create(self, request: Request, data:Dict[str, any]):
        try:
           user = request.state.user
          
           result = await self.service.create_role(user, data)
           print("result: ", result)
           return successResponse(200, f"{result["name"]} User role created successfully", result)
           
        except AppException as e:
           print("error: ", e)
           raise e
        
    async def get_all(self, request: Request):
        try:
            filters = request.query_params
            
            result = await self.service.get_all(int(filters["page"]), int(filters["limit"]), filters)
            return successResponse(200, f"All roles fetch successfully", result)

        except AppException as e:
            raise e
        
        
    async def get_all_active_without_pagination(self):
        try:
            result = await self.service.get_all_active()

            return successResponse(200, "All roles fetch successfully", result)

        except AppException as e:
            raise e
        

    async def get_by_id(self, id:str):
        try:
            result = await self.service.get_by_id(id)

            return successResponse(200, "Role fetch successfully", result)

        except AppException as e:
            raise e
        
    
    async def update(self, request: Request, roleId: str, data: Dict[str, Any]):
        try:
            user = request.state.user

            await self.service.update(data=data,roleId=roleId, updatedBy=user["_id"])
            return successResponse(200, "Role updated successfully")


        except AppException as e:
            raise e

            

        
    async def delete(self, request: Request, id: str):
        try:
           result = await self.service.delete(id)

           return successResponse(200, "Role deleted successfully", result)
        except AppException as e:
            raise e
