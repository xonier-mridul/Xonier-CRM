from app.utils.custom_exception import AppException

from typing import Dict
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
        
    async def delete(self, request: Request, id: str):
        try:
           result = await self.service.delete(id)

           return successResponse(200, "Role deleted successfully", result)
        except AppException as e:
            raise e
