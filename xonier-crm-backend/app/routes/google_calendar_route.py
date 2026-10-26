from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse

from app.core.config import get_setting
from app.core.dependencies import Dependencies
from app.services.google_calendar_service import GoogleCalendarService

router = APIRouter()
dependencies = Dependencies()
service = GoogleCalendarService()
settings = get_setting()
user_access = [Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context)]


@router.get("/connection", dependencies=user_access)
async def connection_status(request: Request):
    return await service.connection_status(request.state.user)


@router.post("/connect", dependencies=user_access)
async def connect(request: Request):
    try:
        return {"authorizationUrl": service.authorization_url(request.state.user)}
    except ValueError as error:
        from app.utils.custom_exception import AppException
        raise AppException(503, str(error))


@router.delete("/connection", dependencies=user_access)
async def disconnect(request: Request):
    await service.disconnect(request.state.user)
    return {"success": True}


@router.get("/oauth/callback")
async def oauth_callback(code: str | None = None, state: str | None = None, error: str | None = None):
    destination = f"{settings.CLIENT_URL.rstrip('/')}/calender"
    if error or not code or not state:
        return RedirectResponse(f"{destination}?googleCalendar=error")
    try:
        await service.handle_callback(code, state)
        return RedirectResponse(f"{destination}?googleCalendar=connected")
    except Exception:
        return RedirectResponse(f"{destination}?googleCalendar=error")
