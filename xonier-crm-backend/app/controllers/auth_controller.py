
from fastapi import Response, Request
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.services.auth_services import AuthServices
from app.utils.custom_response import successResponse
from datetime import datetime, timedelta, timezone
from app.core.config import get_setting
from app.core.constants import JWT_OPTIONS
from app.schemas.user_schema import RegisterUserSchema, UpdateUserSchema, ResetPasswordSchema
from beanie import PydanticObjectId


class AuthController:
    def __init__(self):
        self.service = AuthServices()
        self.settings = get_setting()


    async def getAll(self, request: Request, response:Response):
        try:
            filters = request.query_params

           
            result = await self.service.getAll(int(filters["page"]), int(filters["limit"]), {**filters})

            return successResponse(200, "All users fetched successfully", result)

        except AppException as e:
            raise e
        
    async def get_all_active_without_pagination(self, request: Request):
        try:
          filters = request.query_params
          result = await self.service.get_all_active_without_pagination(filters=filters)

          return successResponse(200, "All active user fetched successfully", result)
        except AppException as e:
            print("err: ", e)
            raise e
             

    async def create(self, request:Request,  response: Response, data: RegisterUserSchema):
        try:
           user = request.state.user
          
           result = await self.service.create(user, data.model_dump())

           user_name= f"{result["firstName"]} {result["lastName"]}"
           return successResponse(201, f"{user_name} user created successfully")

        except AppException as e:
            raise e

    async def login(self, response: Response, data: Dict[str, Any]):
        try:
            result = await self.service.login(data=data)

            user_name= f"{result["firstName"]} {result["lastName"]}"
            
            return successResponse(200, f"{user_name} Credential accepted, verification otp send successfully")

        except AppException as e:
           print("error: ", e)
           raise e
        
    async def resend_verification_otp(self, data: Dict[str, Any]):
       
        try:
           result = await self.service.resend_verification_otp(data)
           return successResponse(200, f"Verification otp send successfully")

        except AppException as e:
           print("error: ", e)
           raise e


        
        
    async def verify_login_otp(self, response: Response, data: dict[str, Any]):
        try:
            result = await self.service.verify_login_otp(data=data)

            access_token_expiry = int(self.settings.ACCESS_TOKEN_EXPIRY) * 24 * 60 * 60
            refresh_token_expiry = int(self.settings.REFRESH_TOKEN_EXPIRY) * 24 * 60 * 60

            
            response.set_cookie(key="accessToken", value=result["access_token"], max_age=access_token_expiry, **JWT_OPTIONS)
            response.set_cookie(key="refreshToken", value=result["refresh_token"], max_age=refresh_token_expiry, **JWT_OPTIONS)

            user_name = f"{result['user']["firstName"]} {result['user']["lastName"]}"

            return successResponse(200, f"{user_name} logged in successfully",  result["user"])


        except AppException as e:
           print("error: ", e)
           raise e
        
    async def getMe(self, request: Request):
        try:
           user = request.state.user
           print("111")
           result = await self.service.getMe(user["_id"])
           
           
           name = f"{user["firstName"]} {user["lastName"]}"
           return successResponse(200,  f"{name} logged in successfully",result)
           
        except AppException as e:
            raise e
        
    async def get_all_for_frontend(self, request: Request, response: Response):
        try:
           filters = request.query_params
           
           result = await self.service.getAll(int(filters["page"]), int(filters["limit"]), {**filters})

           return successResponse(200, "All users fetched successfully", result)

        except AppException as e:
            raise e
        
    async def get_user_by_id(self, id: PydanticObjectId ):
        try:
           result = await self.service.get_user_by_id(id)
           return successResponse(200, "User fetched successfully", result)
            
        except AppException as e:
            raise e
        
    async def update(self, request: Request, userId: str, payload: UpdateUserSchema ):
        try:
           user = request.state.user
           result = await self.service.update(PydanticObjectId(userId), PydanticObjectId(user["_id"]), payload.model_dump())
           return successResponse(200, "User updated successfully" )
        except AppException as e:
            raise e
    
    async def logout(self, request: Request, response: Response):
        try:
          
          user = request.state.user


          result = await self.service.logout(user["_id"])
          
          response.delete_cookie(key="accessToken", **JWT_OPTIONS)
          response.delete_cookie(key="refreshToken", **JWT_OPTIONS)

          user_name= f"{result["firstName"]} {result["lastName"]}"

          return successResponse(200, f"{user_name} Logout successfully")


        except AppException as e:
           print("error: ", e)
           raise e
        
    async def soft_delete(self, request: Request, id: PydanticObjectId):
        try:
            user = request.state.user
         
            result = await self.service.soft_delete(id, user)
            
            user_name= f"{result["firstName"]} {result["lastName"]}"
            return successResponse(200, f"{user_name} deleted successfully")

        except AppException as e:
            raise e
    
    async def reset_password(self, request: Request, data:Dict[str, Any]):
        try:
            user = request.state.user
            

            result = await self.service.reset_password(user["_id"], data)

            return successResponse(200, f"Password reset successfully")



        except AppException as e:
            raise e
        
        except Exception as e:
            raise e

