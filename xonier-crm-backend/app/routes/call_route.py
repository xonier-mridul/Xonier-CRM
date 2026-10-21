from typing import Literal, Optional
import asyncio
from contextlib import suppress
from app.services.auth_sessions import SessionService

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field

from app.core.dependencies import Dependencies
from app.core.enums import FEATURE
from app.core.tenant import system_query
from app.core.ws_manager import manager
from app.repositories.user_repository import UserRepository
from app.repositories.company_repository import CompanyRepository
from app.services.call_service import CallService
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse
from app.utils.manage_tokens import verify_access_token

dependencies = Dependencies()
callService = CallService()

_base_deps = [
    Depends(dependencies.authorized),
    Depends(dependencies.company_active),
    Depends(dependencies.company_context),
    Depends(dependencies.feature_access(FEATURE.CRM)),
]


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CallRequestSchema(BaseModel):
    leadId: str
    # Present only when the request originates from the campaign lead table.
    campaignId: Optional[str] = None
    campaignLeadId: Optional[str] = None


class CallDisposeSchema(BaseModel):
    connected: bool


class CallStatusSchema(BaseModel):
    status: Literal["received", "dialing", "ended", "failed"]
    durationSec: Optional[int] = Field(None, ge=0, description="Call duration in seconds (for status=ended)")
    reason: Optional[str] = Field(None, max_length=300, description="Failure reason (for status=failed)")


# ═══════════════════════════════════════════════════════════════════════════════
# WEB APP  (/api/call)
# ═══════════════════════════════════════════════════════════════════════════════

web_router = APIRouter()
_web_deps = [*_base_deps, Depends(dependencies.web_session), Depends(dependencies.permissions(["lead:read"]))]


@web_router.post("/request", status_code=201, dependencies=_web_deps)
async def request_call(request: Request, payload: CallRequestSchema):
    """Ask the logged-in user's mobile app to dial a lead."""
    result = await callService.request_call(
        request.state.user, payload.leadId, payload.campaignId, payload.campaignLeadId
    )
    msg = "Call request sent to your mobile app" if result["mobileOnline"] \
        else "Call request created, but your mobile app is not connected"
    return successResponse(201, msg, result)


@web_router.get("/presence", status_code=200, dependencies=_web_deps)
async def mobile_presence(request: Request):
    """Is the user's mobile app currently connected?"""
    return successResponse(200, "Presence fetched", callService.presence(request.state.user))


@web_router.get("/lead/{lead_id}/history", status_code=200, dependencies=_web_deps)
async def lead_call_history(request: Request, lead_id: str):
    """Mobile call events shown in the lead activity timeline."""
    result = await callService.lead_history(request.state.user, lead_id)
    return successResponse(200, "Lead call history fetched", result)


@web_router.get("/session/{session_id}", status_code=200, dependencies=_web_deps)
async def get_call_session(request: Request, session_id: str):
    result = await callService.get_session(request.state.user, session_id)
    return successResponse(200, "Call session fetched", result)


@web_router.post("/session/{session_id}/cancel", status_code=200, dependencies=_web_deps)
async def cancel_call_session(request: Request, session_id: str):
    result = await callService.cancel_session(request.state.user, session_id)
    return successResponse(200, "Call request cancelled", result)


@web_router.post("/session/{session_id}/dispose", status_code=200, dependencies=_web_deps)
async def dispose_call_session(request: Request, session_id: str, payload: CallDisposeSchema):
    """'Was call connected?' -> connected=true / false."""
    result = await callService.dispose(request.state.user, session_id, payload.connected)
    label = "connected" if payload.connected else "not connected"
    return successResponse(200, f"Call marked as {label}", result)


# ═══════════════════════════════════════════════════════════════════════════════
# MOBILE APP  (/api/mobile/...)
# ═══════════════════════════════════════════════════════════════════════════════

mobile_router = APIRouter()
_mobile_deps = [*_base_deps, Depends(dependencies.mobile_session)]


@mobile_router.get("/calls/pending", status_code=200, dependencies=_mobile_deps)
async def pending_call(request: Request):
    """Polling fallback: returns the newest call request waiting for this phone (or null)."""
    result = await callService.pending_for_agent(request.state.user)
    return successResponse(200, "Pending call fetched", {"session": result})


@mobile_router.post("/calls/{session_id}/status", status_code=200, dependencies=_mobile_deps)
async def report_call_status(request: Request, session_id: str, payload: CallStatusSchema):
    """Mobile reports progress: received -> dialing -> ended (with durationSec) | failed (with reason)."""
    result = await callService.mobile_update(
        request.state.user, session_id, payload.status, payload.durationSec, payload.reason
    )
    return successResponse(200, "Call status updated", result)


async def _ws_user(websocket: WebSocket, token: Optional[str]):
    """Authenticate a websocket (?token=<accessToken> or Authorization: Bearer ...)."""
    if not token:
        header = websocket.headers.get("authorization") or ""
        if header.startswith("Bearer "):
            token = header.split(" ", 1)[1]
    if not token:
        return None
    payload = verify_access_token(token)
    if (not payload or payload.get("sessionType") != "mobile" or "origin" in websocket.headers
            or any(key.startswith("sec-fetch-") for key in websocket.headers)):
        return None
    try:
        await SessionService().require(payload)
    except AppException:
        return None
    websocket.scope["auth_payload"] = payload
    with system_query():
        user = await UserRepository().find_by_id(PydanticObjectId(payload["_id"]), ["userRole"])
    if not user or not getattr(user, "companyId", None):
        return None
    with system_query():
        company = await CompanyRepository().find_by_id(user.companyId)
    if not company or company.status != "active" or company.deletedAt:
        return None
    user = jsonable_encoder(user, exclude={"password", "refreshToken"})
    if str(user.get("status", "")).lower() != "active":
        return None
    return user


@mobile_router.websocket("/ws")
async def mobile_socket(websocket: WebSocket, token: Optional[str] = Query(None)):
    """
    Realtime channel for the mobile app.

    Connect:  ws://<host>/api/mobile/ws?token=<accessToken>
    Server -> app : {"event":"call_request","session":{...}} | {"event":"call_cancelled","sessionId":"..."}
                    {"event":"connected"} | {"event":"pong"} | {"event":"ack","session":{...}} | {"event":"error","message":"..."}
    App -> server : {"type":"ping"}
                    {"type":"call_status","sessionId":"...","status":"received|dialing|ended|failed",
                     "durationSec":42,"reason":"..."}
    """
    user = await _ws_user(websocket, token)
    if not user:
        await websocket.close(code=4401)
        return

    uid = str(user["_id"])
    await manager.connect(uid, websocket)
    async def check_session():
        while True:
            await asyncio.sleep(5)
            try:
                await SessionService().require(websocket.scope["auth_payload"])
            except Exception:
                with suppress(Exception):
                    await websocket.close(code=4401)
                return
    guard = asyncio.create_task(check_session())
    try:
        await websocket.send_json({"event": "connected"})
        pending = await callService.pending_for_agent(user)
        if pending:  # request created while the app was offline
            await websocket.send_json({"event": "call_request", "session": pending})

        while True:
            message = await websocket.receive_json()
            await SessionService().require(websocket.scope["auth_payload"])
            manager.touch(uid)
            kind = message.get("type") if isinstance(message, dict) else None
            if kind == "ping":
                await websocket.send_json({"event": "pong"})
            elif kind == "call_status":
                try:
                    session = await callService.mobile_update(
                        user,
                        str(message.get("sessionId") or ""),
                        str(message.get("status") or ""),
                        message.get("durationSec"),
                        message.get("reason"),
                    )
                    await websocket.send_json({"event": "ack", "session": session})
                except AppException as e:
                    await websocket.send_json({"event": "error", "message": e.message})
    except WebSocketDisconnect:
        pass
    except AppException:
        with suppress(Exception):
            await websocket.close(code=4401)
    except Exception:
        pass
    finally:
        guard.cancel()
        await asyncio.gather(guard, return_exceptions=True)
        manager.disconnect(uid, websocket)
