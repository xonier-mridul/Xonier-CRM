"""Authenticated proxy. WhatsApp keys/QR never travel via query strings or logs."""
import base64
import hashlib
import hmac
import json
import logging
import time

import httpx
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field, model_validator
from typing import Literal, Optional

from app.core.config import get_setting
from app.core.dependencies import Dependencies
from app.utils.custom_exception import AppException

logger = logging.getLogger("uvicorn.error")
_deps = Dependencies()
router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"], dependencies=[
    Depends(_deps.authorized), Depends(_deps.company_active), Depends(_deps.company_context),
])


async def bridge(request: Request, method: str, path: str, body=None, params=None):
    settings = get_setting()
    if not settings.WHATSAPP_BRIDGE_SECRET or not settings.WHATSAPP_BRIDGE_URL:
        raise AppException(503, "WhatsApp service is not configured. Ask your administrator to start the WhatsApp bridge.")
    user = request.state.user
    company = user.get("companyId")
    uid = user.get("_id") or user.get("id")
    if not company or not uid:
        raise AppException(403, "An active company account is required")
    payload = {"company": str(company), "user": str(uid), "aud": "whatsapp-bridge",
               "exp": int(time.time()) + 30,
               "name": " ".join(filter(None, [user.get("firstName"), user.get("lastName")]))[:100],
               "admin": any(r.get("code") in {"COMPANY_ADMIN", "ADMIN"} for r in user.get("userRole", []))}
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).rstrip(b"=")
    signature = base64.urlsafe_b64encode(hmac.new(settings.WHATSAPP_BRIDGE_SECRET.encode(), encoded, hashlib.sha256).digest()).rstrip(b"=")
    ticket = (encoded + b"." + signature).decode()
    started = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=60, trust_env=False) as client:
            result = await client.request(method, settings.WHATSAPP_BRIDGE_URL.rstrip("/") + path,
                                          headers={"Authorization": f"Bearer {ticket}"}, json=body, params=params)
    except httpx.HTTPError as exc:
        logger.warning("WhatsApp bridge request failed: %s %s (%s, %.2fs)",
                       method, path, type(exc).__name__, time.monotonic() - started)
        raise AppException(503, "WhatsApp service is unavailable. Please try again shortly.")
    if result.status_code >= 400:
        try:
            message = result.json().get("message", "WhatsApp request failed")
        except ValueError:
            message = "WhatsApp request failed"
        raise AppException(result.status_code, message)
    return result.json()


@router.get("/connections")
async def connections(request: Request):
    return await bridge(request, "GET", "/connections")


@router.get("/connection")
async def connection(request: Request):
    return await bridge(request, "GET", "/connection")


@router.get("/profile")
async def profile(request: Request, jid: str = Query(..., min_length=3, max_length=160), owner: str | None = None):
    params = {"jid": jid}
    if owner:
        params["owner"] = owner
    return await bridge(request, "GET", "/profile", params=params)


class ConnectWhatsApp(BaseModel):
    consent: Literal[True]


@router.post("/connect")
async def connect(request: Request, command: ConnectWhatsApp):
    return await bridge(request, "POST", "/connect", body=command.model_dump())


@router.delete("/connection")
async def disconnect(request: Request, owner: str | None = None):
    return await bridge(request, "DELETE", "/connection", params={"owner": owner} if owner else None)


@router.get("/chats")
async def chats(request: Request, owner: str | None = None):
    return await bridge(request, "GET", "/chats", params={"owner": owner} if owner else None)


class ReadChat(BaseModel):
    jid: str = Field(min_length=3, max_length=160)


@router.post("/chats/read")
async def read_chat(request: Request, command: ReadChat):
    return await bridge(request, "POST", "/chats/read", body=command.model_dump())


@router.get("/contacts")
async def get_contacts(request: Request, q: str | None = Query(None, max_length=100), owner: str | None = None):
    params: dict = {}
    if q:
        params["q"] = q
    if owner:
        params["owner"] = owner
    return await bridge(request, "GET", "/contacts", params=params if params else None)


@router.get("/messages")
async def messages(request: Request, jid: str = Query(..., max_length=160), owner: str | None = None,
                   before: int | None = Query(None, ge=1)):
    params = {"jid": jid}
    if owner:
        params["owner"] = owner
    if before:
        params["before"] = before
    return await bridge(request, "GET", "/messages", params=params)


class MediaPayload(BaseModel):
    data: str = Field(min_length=1)
    mimeType: str = Field(default="application/octet-stream", max_length=120)
    fileName: str = Field(default="attachment", max_length=255)
    kind: Literal["image", "video", "audio", "document"] = "document"
    fileSize: Optional[int] = None


class SendMessage(BaseModel):
    jid: str = Field(min_length=3, max_length=160)
    text: str = Field(default="", max_length=4096)
    requestId: str = Field(pattern=r"^[a-f0-9-]{36}$")
    media: Optional[MediaPayload] = None

    @model_validator(mode="after")
    def require_text_or_media(self):
        if not self.text.strip() and not self.media:
            raise ValueError("Either message text or a media attachment is required")
        return self


class EditMessage(BaseModel):
    jid: str = Field(min_length=3, max_length=160)
    messageId: str = Field(min_length=1, max_length=160)
    text: str = Field(min_length=1, max_length=4096)


@router.post("/messages")
async def send(request: Request, command: SendMessage):
    return await bridge(request, "POST", "/messages", body=command.model_dump(exclude_none=True))


@router.patch("/messages")
async def edit_message(request: Request, command: EditMessage):
    return await bridge(request, "PATCH", "/messages", body=command.model_dump())
