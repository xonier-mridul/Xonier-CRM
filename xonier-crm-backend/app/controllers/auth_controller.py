
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
from bson import ObjectId


class AuthController:
    def __init__(self):
        self.service = AuthServices()
        self.settings = get_setting()


    async def getAll(self, request: Request, response:Response):
        try:
            filters = request.query_params

            page = filters.get("page") or 1
            limit =  filters.get("limit") or 10

           
            result = await self.service.getAll(int(page), int(limit), {**filters})

            return successResponse(200, "All users fetched successfully", result)

        except AppException as e:
            raise e
        
    async def get_all_active_without_pagination(self, request: Request):
        try:
          filters = request.query_params
          result = await self.service.get_all_active_without_pagination(filters=filters)

          return successResponse(200, "All active user fetched successfully", result)
        except AppException as e:

            raise e
             

    async def create(self, request:Request,  response: Response, data: RegisterUserSchema):
        try:
           user = request.state.user
          
           result = await self.service.create(user, data.model_dump())

           user_name= f"{result["firstName"]} {result["lastName"]}"
           return successResponse(201, f"{user_name} user created successfully")

        except AppException as e:
            raise e

    async def login(self, request: Request, data: Dict[str, Any]):
        try:
           
           
            result = await self.service.login(data=data)

            user_name= f"{result.get("firstName")} {result.get("lastName", "")}"
            
            return successResponse(200, f"{user_name} Credential accepted, verification otp send successfully")

        except AppException as e:

           raise e
        
    async def resend_verification_otp(self, data: Dict[str, Any]):
        try:
            
            result = await self.service.resend_verification_otp(data)
            return successResponse(200, f"Verification otp send successfully")

        except AppException as e:
           
           raise e


        
    async def verify_login_otp(self, request: Request, response: Response, data: dict[str, Any]):
        try:
            ip = request.client.host

            user_agent = request.headers.get("user-agent")
            result = await self.service.verify_login_otp(data=data, ip=ip, agent=user_agent)

            access_token_expiry = int(self.settings.ACCESS_TOKEN_EXPIRY) * 24 * 60 * 60
            # access_token_expiry = int(self.settings.ACCESS_TOKEN_EXPIRY) * 60
            refresh_token_expiry = int(self.settings.REFRESH_TOKEN_EXPIRY) * 24 * 60 * 60

            
            response.set_cookie(key="accessToken", value=result["access_token"], max_age=access_token_expiry, **JWT_OPTIONS)
            response.set_cookie(key="refreshToken", value=result["refresh_token"], max_age=refresh_token_expiry, **JWT_OPTIONS)

            user_name = f"{result['user']["firstName"]} {result['user']["lastName"]}"

            return successResponse(200, f"{user_name} logged in successfully", {**result["user"], "accessToken": result["access_token"], "refreshToken": result["refresh_token"]})


        except AppException as e:

           raise e
        
    async def getMe(self, request: Request, response: Response):
        try:
           user = request.state.user
               
           
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
        
    async def get_user_by_teams(self, request: Request):
        try:
           filters = request.query_params
           user = request.state.user
           
           result = await self.service.get_user_by_team(filters=filters, user=user)

           return successResponse(200, "All team users fetched successfully", result)

        except AppException as e:
            raise e

        

    async def get_all_deleted_users(self, request: Request):
        try:
            filters = dict(request.query_params)
            user = request.state.user
 
            page = int(filters.pop("page", 1))
            limit = int(filters.pop("limit", 10))
 
            result = await self.service.get_all_deleted_users(
                page=page,
                limit=limit,
                user=user,
                filters=filters
            )
 
            return successResponse(200, "Deleted users fetched successfully", result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

        
    async def get_user_by_id(self, request:Request, id: PydanticObjectId ):
        try:
           user = request.state.user
           result = await self.service.get_user_by_id(id, user)
           return successResponse(200, "User fetched successfully", result)
            
        except AppException as e:
            raise e
        
    async def get_user_profile(self, request:Request ):
        try:
           
           user = request.state.user
           result = await self.service.get_user_profile(user)
           return successResponse(200, "User profile fetched successfully", result)
            
        except AppException as e:
            raise e
        
    async def update(self, request: Request, userId: str, payload: UpdateUserSchema ):
        try:
           user = request.state.user
           result = await self.service.update(PydanticObjectId(userId), PydanticObjectId(user["_id"]), payload.model_dump())
           return successResponse(200, "User updated successfully" )
        except AppException as e:
            raise e
        
    async def update_status(self, request: Request, userId: str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            await self.service.update_status(userId=userId, updatedBy=user["_id"], payload=payload)

            return successResponse(200, "User status updated successfully")

        except AppException as e:
            raise e
    
    async def logout(self, request: Request, response: Response):
        try:
          
          user = request.state.user

          ip = request.client.host

          user_agent = request.headers.get("user-agent")


          result = await self.service.logout(user["_id"], ip, user_agent)
          
          response.delete_cookie(key="accessToken", **JWT_OPTIONS)
          response.delete_cookie(key="refreshToken", **JWT_OPTIONS)

          firstName = result.get("firstName") or ""
          lastName = result.get("lastName") or ""

          user_name= f"{firstName} {lastName}"

          return successResponse(200, f"{user_name} Logout successfully")


        except AppException as e:
           
           raise e
        
    async def soft_delete(self, request: Request, id: PydanticObjectId):
        try:
            user = request.state.user
         
            result = await self.service.soft_delete(id, user)
            
            user_name= f"{result["firstName"]} {result["lastName"]}"
            return successResponse(200, f"{user_name} deleted successfully")

        except AppException as e:
            raise e
        

    async def assign_phone_number(self, request: Request, id:str, payload: Dict[str, Any]):
        try:
            user = request.state.user
            
            result = await self.service.assign_phone_number(id=id, payload=payload, user=user)

            firstname = result.get("firstName") or ""
            lastname = result.get("lastName") or ""




            return successResponse(200, f"{firstname} {lastname} assigned  phone number successfully")



        except AppException as e:
            raise e  
        

    async def clear_phone_number(self, request: Request, id:str):
        try:
            user = request.state.user
            
            result = await self.service.clear_phone_number(id=id, user=user)

            firstname = result.get("firstName") or ""
            lastname = result.get("lastName") or ""




            return successResponse(200, f"{firstname} {lastname} assigned  phone number clear successfully")



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
        
    async def reset_user_password(self, request: Request, userId:str, data:Dict[str, Any]):
        try:
            user = request.state.user
            
            await self.service.reset_user_password(userId=userId, updatedBy=user, payload=data)

            return successResponse(200, f"Password reset successfully")

        except AppException as e:
    
            raise e
        

    
    async def permanent_delete(self, request: Request, userId: str):
        try:
            user = request.state.user
 
            if not ObjectId.is_valid(userId):
                raise AppException(400, "Invalid user ObjectId")
 
            await self.service.permanent_delete(
                userId=PydanticObjectId(userId),
                user=user
            )
 
            return successResponse(200, "User permanently deleted successfully", None)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        


    async def bulk_permanent_delete(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
 
            result = await self.service.bulk_permanent_delete(
                payload=payload,
                user=user
            )
 
            return successResponse(200, result["message"], result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def restore_user(self, request: Request, userId: str):
        try:
            user = request.state.user
 
            if not ObjectId.is_valid(userId):
                raise AppException(400, "Invalid user ObjectId")
 
            result = await self.service.restore_user(
                userId=PydanticObjectId(userId),
                user=user
            )
 
            return successResponse(200, "User restored successfully", result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
 
 
    async def bulk_restore_users(self, request: Request, payload: Dict[str, Any]):
        try:
            user = request.state.user
 
            result = await self.service.bulk_restore_users(
                payload=payload,
                user=user
            )
 
            return successResponse(200, result["message"], result)
 
        except AppException as e:
            raise e
 
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
        

    async def verify_refresh_token(self, request: Request, response: Response, payload: Dict[str, Any]):
        try:
            

            result = await self.service.verify_refresh_token(
                payload=payload,
               
            )

            access_token_expiry = int(self.settings.ACCESS_TOKEN_EXPIRY) * 24 * 60 * 60
            # access_token_expiry = int(self.settings.ACCESS_TOKEN_EXPIRY) * 60
            refresh_token_expiry = int(self.settings.REFRESH_TOKEN_EXPIRY) * 24 * 60 * 60

            
            response.set_cookie(key="accessToken", value=result["access_token"], max_age=access_token_expiry, **JWT_OPTIONS)
            response.set_cookie(key="refreshToken", value=result["refresh_token"], max_age=refresh_token_expiry, **JWT_OPTIONS)

            
            return successResponse(200, result["message"], {
                **result["user"],
                "accessToken": result["access_token"],
                "refreshToken": result["refresh_token"],
            })

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
    
            
            
        

