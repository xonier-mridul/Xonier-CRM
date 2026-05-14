from fastapi import APIRouter, Depends, Response, Request


from app.middlewares.auth_middleware import AuthMiddleware
from app.schemas.user_schema import UserLoginSchema, VerifyLoginOtpSchema, RegisterUserSchema, ResendOTPSchema, UpdateUserSchema, ResetPasswordSchema, UpdateUserStatusSchema, ResetPasswordByAdminSchema, AssignPhoneNumberSchema, BulkPermanentDeleteSchema, BulkRestoreUsersSchema
from app.controllers.auth_controller import AuthController
from app.core.dependencies import Dependencies
from beanie import PydanticObjectId

router = APIRouter()

auth_controller = AuthController()
dependencies = Dependencies()

@router.post("/register", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context), Depends(dependencies.permissions(["user:create"]))])
async def create(request: Request, response: Response, data: RegisterUserSchema):
    return await auth_controller.create( request,response, data)

@router.get("/all", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context)])
async def getAll(request: Request, response: Response):
    return await auth_controller.getAll(request, response)

@router.get("/active/all-without-pagination", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context)])
async def getAllForFrontend(request: Request):
    return await auth_controller.get_all_active_without_pagination(request)
    
@router.get("/frontend", status_code=200, dependencies=[Depends(dependencies.authorized),Depends(dependencies.company_active),
Depends(dependencies.company_context)])
async def get_all_for_frontend(request: Request, response):
    return await auth_controller.get_all_for_frontend(request, response) 

@router.get("/by-team", status_code=200, dependencies=[Depends(dependencies.authorized),
Depends(dependencies.company_active), Depends(dependencies.company_context)])
async def get_user_by_teams(request: Request):
    return await auth_controller.get_user_by_teams(request)


@router.get("/all-deleted", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context),  Depends(dependencies.permissions(["user:read"]))])
async def get_all_deleted_users(request: Request):
    return await auth_controller.get_all_deleted_users(request=request)

@router.get("/user/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context)])
async def get_user_by_id(id: PydanticObjectId, request: Request):
    return await auth_controller.get_user_by_id(request, id)


@router.get("/profile", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_context)])
async def get_user_profiles( request: Request):
    return await auth_controller.get_user_profile(request)

@router.post("/login", status_code=200)
async def register_users( request:Request, data: UserLoginSchema):
    return await auth_controller.login( request,  data.model_dump())

@router.post("/resend-login-otp", status_code=200)
async def resend_login_otp(data: ResendOTPSchema):
    return await auth_controller.resend_verification_otp(data.model_dump())

@router.post("/verify-login-otp", status_code=200)
async def verify_login_otp(request: Request, response: Response, data: VerifyLoginOtpSchema):
    return await auth_controller.verify_login_otp(request, response, data.model_dump())

@router.get("/me", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context)])
async def getMe(request: Request, response: Response):
    return await auth_controller.getMe(request=request, response=response)

@router.put("/update/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["user:update"]))])
async def update(request: Request,id: str, payload: UpdateUserSchema ):
    return await auth_controller.update(request, id, payload)

@router.patch("/update-status/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["user:update"]))])
async def update_status(request: Request, id: str, payload: UpdateUserStatusSchema):
    return await auth_controller.update_status(request, id, payload.model_dump())

@router.post("/logout", status_code=200, dependencies=[Depends(dependencies.authorized),Depends(dependencies.company_active),
Depends(dependencies.company_context)])
async def logout(request: Request, response: Response):
    return await auth_controller.logout(request, response)

@router.patch("/user/{id}/soft-delete", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context)])
async def soft_delete(request: Request, id: PydanticObjectId):
    return await auth_controller.soft_delete(request, id)

@router.patch("/assign-phone-number/{id}", status_code=200, dependencies=[Depends(dependencies.authorized),Depends(dependencies.company_active),
Depends(dependencies.company_context)])
async def assign_phone_number(request: Request, id:str, payload: AssignPhoneNumberSchema):
    return await auth_controller.assign_phone_number(request, id, payload.model_dump(exclude_unset=True))

@router.patch("/clear-phone-number/{id}", status_code=200, dependencies=[Depends(dependencies.authorized),Depends(dependencies.company_active),
Depends(dependencies.company_context)])
async def clear_phone_number(request: Request, id:str):
    return await auth_controller.clear_phone_number(request, id)

@router.patch("/reset-password", status_code=200, dependencies=[Depends(dependencies.authorized)])
async def reset_password(request: Request, data: ResetPasswordSchema):
    return await auth_controller.reset_password(request, data.model_dump(exclude_unset=True))

@router.patch("/reset-user-password/{id}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["user:update"]))])
async def reset_user_password(request:Request, id:str, payload: ResetPasswordByAdminSchema):
    return await auth_controller.reset_user_password(request, id, payload.model_dump())

@router.delete("/permanent-delete/{userId}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.permissions(["user:delete"]))])
async def permanent_delete_user(request: Request, userId: str):
    return await auth_controller.permanent_delete(request=request, userId=userId)

@router.delete("/bulk-permanent-delete", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["user:delete"]))])
async def bulk_permanent_delete_users(request: Request, payload: BulkPermanentDeleteSchema):
    return await auth_controller.bulk_permanent_delete(request=request, payload=payload.model_dump(mode="json"))

@router.patch("/restore/{userId}", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["user:update"]))])
async def restore_user(request: Request, userId: str):
    return await auth_controller.restore_user(request=request, userId=userId)
 
@router.patch("/bulk-restore", status_code=200, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active),
Depends(dependencies.company_context), Depends(dependencies.permissions(["user:update"]))])
async def bulk_restore_users(request: Request, payload: BulkRestoreUsersSchema):
    return await auth_controller.bulk_restore_users(request=request, payload=payload.model_dump(mode="json"))


@router.post("/refresh", status_code=200, dependencies=[Depends(dependencies.company_active),
Depends(dependencies.company_context)])
async def refresh_access_token(
    request: Request,
    response: Response,                                  
    payload=Depends(dependencies.validate_refreshToken)
):
    return await auth_controller.verify_refresh_token(request, response, payload)
   
