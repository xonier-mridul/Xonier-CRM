from fastapi import APIRouter, Depends, Response, Request


from app.middlewares.auth_middleware import AuthMiddleware
from app.schemas.user_schema import UserLoginSchema, VerifyLoginOtpSchema, RegisterUserSchema, ResendOTPSchema, UpdateUserSchema, ResetPasswordSchema
from app.controllers.auth_controller import AuthController
from app.core.dependencies import Dependencies
from beanie import PydanticObjectId

router = APIRouter()

auth_controller = AuthController()
dependencies = Dependencies()

@router.post("/register", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["user:create"]))])
async def create(request: Request, response: Response, data: RegisterUserSchema):
    return await auth_controller.create( request,response, data)

@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def getAll(request: Request, response: Response):
    return await auth_controller.getAll(request, response)

@router.get("/active/all-without-pagination", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def getAllForFrontend(request: Request):
    return await auth_controller.get_all_active_without_pagination(request)
    
@router.get("/frontend", status_code=200)
async def get_all_for_frontend(request: Request, response):
    return await auth_controller.get_all_for_frontend(request, response) 

@router.get("/user/{id}", status_code=200)
async def get_user_by_id(id: PydanticObjectId):
    return await auth_controller.get_user_by_id(id)

@router.post("/login", status_code=200)
async def register_users(response: Response, data: UserLoginSchema):
    return await auth_controller.login(response, data.model_dump())

@router.post("/resend-login-otp", status_code=200)
async def resend_login_otp(data: ResendOTPSchema):
    return await auth_controller.resend_verification_otp(data.model_dump())

@router.post("/verify-login-otp", status_code=200)
async def verify_login_otp(response: Response, data: VerifyLoginOtpSchema):
    return await auth_controller.verify_login_otp(response, data.model_dump())

@router.get("/me", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def getMe(request: Request, response: Response):
    return await auth_controller.getMe(request=request)

@router.put("/update/{id}", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def update(request: Request,id: PydanticObjectId, payload: UpdateUserSchema ):
    return await auth_controller.update(request, id, payload)

@router.post("/logout", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def logout(request: Request, response: Response):
    return await auth_controller.logout(request, response)

@router.patch("/user/{id}/soft-delete", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def soft_delete(request: Request, id: PydanticObjectId):
    return await auth_controller.soft_delete(request, id)

@router.patch("/reset-password", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def reset_password(request: Request, data: ResetPasswordSchema):
    return await auth_controller.reset_password(request, data.model_dump())