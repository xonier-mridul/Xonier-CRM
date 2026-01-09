from fastapi import Request, status
from typing import List
from app.core.exception_handler import AppException
from app.repositories.permissions_repository import PermissionRepository
from app.utils.manage_tokens import verify_access_token
from app.repositories.user_repository import UserRepository
from beanie import PydanticObjectId


class Dependencies:
    def __init__(self):
        self.permissionRepo = PermissionRepository()
        self.userRepo = UserRepository()

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
            user_permissions = await self.permissionRepo.get_permissions_code(
                role_ids=user["userRole"]
            )

            user_permissions = set(user_permissions)
            required_permissions = set(permissions)

            if not user_permissions.intersection(required_permissions):
                raise AppException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    message="You do not have permission to perform this action"
                )

        return checking
    
    async def authorized(self,request: Request):
        try:
           token = request.cookies.get("accessToken")

           if not token:
               raise AppException(400, "Token not found")
           payload = verify_access_token(token)
           
           if not payload:
               raise AppException(400, "Invalid or expired Tokens")
           
           user = await self.userRepo.find_by_id(PydanticObjectId(payload["_id"]), populate=["userRole"])
           
           if not user:
               raise AppException(401, "User not found")

           return True

        except Exception as e:
            print("Err: ", e)
            raise e
