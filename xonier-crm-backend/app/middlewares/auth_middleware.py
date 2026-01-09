from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils.manage_tokens import verify_access_token
from app.db.models.user_model import UserModel
from fastapi.encoders import jsonable_encoder
from app.repositories.user_repository import UserRepository
from beanie import PydanticObjectId

repository = UserRepository()
class AuthMiddleware(BaseHTTPMiddleware):
    # def __init__(self):
    #     self.repository = UserRepository()

    async def dispatch(self, request: Request, call_next):
       
        token = request.cookies.get("accessToken")

        if token:
            try:
                payload = verify_access_token(token)

                if payload:
                 
                    user = await repository.find_by_id(PydanticObjectId(payload["_id"]), ["userRole"])
                    
                    if user:
                        request.state.user = jsonable_encoder(user, exclude={"password", "refreshToken"})
                    else: 
                        request.state.user = False
                
            except Exception as e:
                print("error: ", e)
                pass

        response = await call_next(request)
        return response
