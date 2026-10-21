from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.encoders import jsonable_encoder
from beanie import PydanticObjectId
from app.core.tenant import system_query
from app.repositories.user_repository import UserRepository
from app.services.auth_sessions import SessionService
from app.utils.manage_tokens import verify_access_token
from app.utils.custom_exception import AppException


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request.state.user = None
        request.state.auth_payload = None
        request.state.auth_error = None
        header = request.headers.get("authorization", "")
        token = header[7:] if header.startswith("Bearer ") else request.cookies.get("accessToken")
        if token:
            try:
                payload = verify_access_token(token)
                if not payload:
                    raise AppException(401, "Access token expired or invalid", code="ACCESS_EXPIRED")
                if payload["sessionType"] == "mobile" and (not header.startswith("Bearer ")
                        or "origin" in request.headers or any(key.startswith("sec-fetch-") for key in request.headers)):
                    raise AppException(403, "Native mobile tokens cannot be used as a browser login", code="CLIENT_TYPE_MISMATCH")
                await SessionService().require(payload)
                with system_query():
                    user = await UserRepository().find_by_id(PydanticObjectId(payload["_id"]), ["userRole", "assignedPhoneNumber"])
                if not user or user.status != "active" or not user.isEmailVerified:
                    raise AppException(401, "This account is not active", clear_cookies=True, code="ACCOUNT_DISABLED")
                request.state.user = jsonable_encoder(user, exclude={"password", "refreshToken"})
                request.state.auth_payload = payload
            except AppException as error:
                request.state.auth_error = error
            except Exception:
                request.state.auth_error = AppException(503, "Authentication temporarily unavailable", code="AUTH_UNAVAILABLE")
        # Public login/recovery remains usable with a revoked old cookie. Never
        # clear cookies here: OTP verification may have just issued a new pair.
        response = await call_next(request)
        if request.url.path.startswith("/api/auth/"):
            response.headers["Cache-Control"] = "no-store"
            response.headers["Pragma"] = "no-cache"
        return response
