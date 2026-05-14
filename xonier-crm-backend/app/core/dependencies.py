from fastapi import Request, status, Response
from typing import List
from app.core.exception_handler import AppException
from app.repositories.permissions_repository import PermissionRepository
from app.repositories.company_repository import CompanyRepository
from app.utils.manage_tokens import verify_access_token, verify_refresh_token
from app.repositories.user_repository import UserRepository
from app.core.enums import USER_STATUS
from beanie import PydanticObjectId
from app.core.constants import SUPER_ADMIN_CODE
from app.core.tenant import current_company, is_admin_context
from app.core.enums import COMPANY_STATUS
from app.core.tenant import system_query



class Dependencies:
    def __init__(self):
        self.permissionRepo = PermissionRepository()
        self.userRepo = UserRepository()
        self.companyRepo = CompanyRepository()

    def permissions(self, permissions: List[str]):
        async def checking(request: Request):
            
            user = request.state.user

            if not user:
                raise AppException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    message="You are not authenticated, please login"
                )
            
            roles = user.get("userRole", [])

            if any(role.get("code") == "SUPER_ADMIN" for role in roles):
               return
            user_permissions_ids = []

            for item in user["userRole"]:
               for item in item["permissions"]:
                 user_permissions_ids.append(PydanticObjectId(item["id"]))

            user_permissions = await self.permissionRepo.get_permissions_code(
                ids=user_permissions_ids
            )

            user_permissions = set(user_permissions)
            required_permissions = set(permissions)

            if not user_permissions.intersection(required_permissions):
                raise AppException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    message="You do not have permission to perform this action"
                )

        return checking
    
    async def authorized(self,request: Request, response: Response):
        try:
           token = None
  
           auth_header = request.headers.get("Authorization")
           if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
           if not token: 
                token = request.cookies.get("accessToken")

           if not token:
               raise AppException(401, "You are logged out, please logged in again")
           payload = verify_access_token(token)
           
           if not payload:
               
               raise AppException(401, "Invalid or expired Tokens")
           with system_query():
                user = await self.userRepo.find_by_id(PydanticObjectId(payload["_id"]), populate=["userRole"])
           
           if not user:
               raise AppException(401, "User not found")
           
           user = user.model_dump(mode="json")

           if user["status"] == USER_STATUS.DELETED.value:
               raise AppException(400, "Bad request, Your account is deleted")
           
           if user["status"] == USER_STATUS.SUSPENDED.value:
               raise AppException(400, "Your account is suspended, please contact with the admin")
      
           return True

        except Exception as e:
            raise e
        


    async def validate_refreshToken(self, request: Request):
        try:
            token = None

            token = request.cookies.get("refreshToken")

            if not token:
                try:
                    body = await request.json()
                    token = body.get("refreshToken")
                except:
                    pass

            if not token:
                raise AppException(401, "Your session is expired, please login again")

            payload = verify_refresh_token(token)

            
            payload["raw_token"] = token

            return payload

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def onlyForAdmin(self, request:Request):
        try:
            
            user = request.state.user

            isAdmin = False
            
            for item in user["userRole"]:
                if item["code"] == SUPER_ADMIN_CODE:
                   isAdmin = True
                   break


            if not isAdmin:
                raise AppException(403, "Only admin can access this route")  

            return True


        except Exception as e:
            raise e

    async def company_context(self, request: Request):
        
        user = request.state.user

     

        
        if user["userRole"][0]["code"] == SUPER_ADMIN_CODE:
            print("admin")
            is_admin_context.set(True)
            current_company.set(None)
            return

        company = request.state.company
        current_company.set(str(company.id))
        is_admin_context.set(False)


    async def company_active(self, request: Request):
        
        user = request.state.user

        
        if user["userRole"][0]["code"] == SUPER_ADMIN_CODE:
            return

        # await user.fetch_link("companyId")
        with system_query():
            company = await self.companyRepo.find_by_id(PydanticObjectId(user["companyId"]))

        


        if not company:
            raise AppException(403, "No company associated with this account")

        if company.status == COMPANY_STATUS.DELETED:
            raise AppException(410, "This company no longer exists")

        if company.status == COMPANY_STATUS.SUSPENDED:
            raise AppException(403, "Your company has been suspended. Contact support.")

        if company.status == COMPANY_STATUS.INACTIVE:
            raise AppException(403, "Your company account is inactive.")

        if company.status == COMPANY_STATUS.PENDING_VERIFICATION:
            raise AppException(403, "Your company is pending verification.")

        request.state.company = company

