from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils.manage_tokens import verify_access_token
from app.db.models.user_model import UserModel
from fastapi.encoders import jsonable_encoder
from app.repositories.user_repository import UserRepository
from beanie import PydanticObjectId
from app.core.constants import JWT_OPTIONS
from app.core.tenant import current_company
from app.core.tenant import system_query

repository = UserRepository()
class AuthMiddleware(BaseHTTPMiddleware):


    async def dispatch(self, request: Request, call_next):
       
        
        delete_cookie = False
        token = None

        
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        
        if not token:
            token = request.cookies.get("accessToken")
        if token:
            try:
                payload = verify_access_token(token)

                if not payload:
                    delete_cookie = True

                else:
                    
                    with system_query():
                        user = await repository.find_by_id(PydanticObjectId(payload["_id"]), ["userRole", "assignedPhoneNumber"])

                       
            
                    
                    if user:
                        request.state.user = jsonable_encoder(user, exclude={"password", "refreshToken"})
                        # current_company.set(user.companyId)

                    else: 
                        request.state.user = False
                
            except Exception as e:
                delete_cookie = True
                pass

        response = await call_next(request)

        if delete_cookie:
            response.delete_cookie(key="accessToken", **JWT_OPTIONS)
        return response
