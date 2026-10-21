"""Native companion authentication. Never establishes browser cookies.

Route-defined slots and signed JWT claims cannot be changed via a device header.
The browser-context guard is defense-in-depth, NOT mobile app attestation.
"""
from fastapi import APIRouter, Depends, Request
from app.routes.auth_routes import auth_controller
from app.core.dependencies import Dependencies
from app.schemas.user_schema import UserLoginSchema, VerifyLoginOtpSchema, ResendOTPSchema
from app.services.credential_auth import CredentialAuth
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse


def native_context(request: Request):
    if "origin" in request.headers or any(key.startswith("sec-fetch-") for key in request.headers):
        raise AppException(403, "Use browser authentication for browser sessions", code="CLIENT_TYPE_MISMATCH")
    client_id = request.headers.get("x-client-id", "")
    if not client_id or len(client_id) > 128:
        raise AppException(422, "Native app must supply a stable X-Client-ID (1–128 characters)")
    return {"client_id": client_id, "ip": request.client.host if request.client else None}


dependencies = Dependencies()
router = APIRouter(dependencies=[Depends(native_context)])


@router.post("/login")
async def login(request: Request, data: UserLoginSchema):
    auth = CredentialAuth(auth_controller.service)
    result = await auth.begin(data.model_dump(), session_type="mobile", **native_context(request),
        existing_sid=(getattr(request.state, "auth_payload", None) or {}).get("sid"))
    return successResponse(200, "Verification email queued", result)


@router.post("/resend-login-otp")
async def resend(request: Request, data: ResendOTPSchema):
    result = await CredentialAuth(auth_controller.service).resend(data.model_dump(), session_type="mobile", **native_context(request))
    return successResponse(200, "Verification email queued", result)


@router.post("/verify-login-otp")
async def verify(request: Request, data: VerifyLoginOtpSchema):
    result = await CredentialAuth(auth_controller.service).verify(data.model_dump(), session_type="mobile",
        **native_context(request), agent=request.headers.get("user-agent"),
        existing_sid=(getattr(request.state, "auth_payload", None) or {}).get("sid"))
    return successResponse(200, "Mobile login successful", {**result["user"], "sessionType": "mobile",
        "accessToken": result["access_token"], "refreshToken": result["refresh_token"]})


@router.post("/refresh")
async def refresh(payload: dict = Depends(dependencies.validate_refreshToken)):
    result = await CredentialAuth(auth_controller.service).refresh(payload)
    return successResponse(200, "Mobile session refreshed", {**result["user"], "sessionType": "mobile",
        "accessToken": result["access_token"], "refreshToken": result["refresh_token"]})


@router.post("/logout", dependencies=[Depends(dependencies.authorized), Depends(dependencies.mobile_session)])
async def logout(request: Request):
    await auth_controller.service.logout(request.state.user["_id"], request.client.host if request.client else None,
        request.headers.get("user-agent"), session_id=request.state.auth_payload["sid"])
    return successResponse(200, "Mobile session ended; browser session is unchanged")
