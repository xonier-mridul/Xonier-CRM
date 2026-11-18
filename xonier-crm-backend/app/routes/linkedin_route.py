"""Authenticated proxy. LinkedIn cookies/credentials never travel via query strings or logs."""
import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field

from app.core.config import get_setting
from app.core.dependencies import Dependencies
from app.core.rate_limiter import limiter
from app.utils.custom_exception import AppException

logger = logging.getLogger("uvicorn.error")
_deps = Dependencies()
router = APIRouter(
    prefix="/api/linkedin",
    tags=["LinkedIn"],
    dependencies=[
        Depends(_deps.authorized),
        Depends(_deps.company_active),
        Depends(_deps.company_context),
    ],
)


_shared_client: httpx.AsyncClient | None = None


def _get_shared_client(timeout: int) -> httpx.AsyncClient:
    global _shared_client
    if _shared_client is None or _shared_client.is_closed:
        _shared_client = httpx.AsyncClient(
            timeout=timeout,
            trust_env=False,
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
        )
    return _shared_client


async def bridge(request: Request, method: str, path: str, body=None, params=None, timeout: int = 60):
    settings = get_setting()
    if not settings.LINKEDIN_BRIDGE_SECRET or not settings.LINKEDIN_BRIDGE_URL:
        raise AppException(503, "LinkedIn service is not configured. Ask your administrator to start the LinkedIn bridge.")
    user = request.state.user
    company = user.get("companyId")
    uid = user.get("_id") or user.get("id")
    if not company or not uid:
        raise AppException(403, "An active company account is required")
    payload = {
        "company": str(company),
        "user": str(uid),
        "aud": "linkedin-bridge",
        "exp": int(time.time()) + 30,
        "name": " ".join(filter(None, [user.get("firstName"), user.get("lastName")]))[:100],
        "admin": any(r.get("code") in {"COMPANY_ADMIN", "ADMIN"} for r in user.get("userRole", [])),
        "ua": (getattr(request, "headers", {}).get("user-agent") or "")[:300],
    }
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).rstrip(b"=")
    signature = base64.urlsafe_b64encode(
        hmac.new(settings.LINKEDIN_BRIDGE_SECRET.encode(), encoded, hashlib.sha256).digest()
    ).rstrip(b"=")
    ticket = (encoded + b"." + signature).decode()
    started = time.monotonic()
    try:
        if isinstance(httpx.AsyncClient, type):
            client = _get_shared_client(timeout)
            result = await client.request(
                method,
                settings.LINKEDIN_BRIDGE_URL.rstrip("/") + path,
                headers={"Authorization": f"Bearer {ticket}"},
                json=body,
                params=params,
                timeout=timeout,
            )
        else:
            async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
                result = await client.request(
                    method,
                    settings.LINKEDIN_BRIDGE_URL.rstrip("/") + path,
                    headers={"Authorization": f"Bearer {ticket}"},
                    json=body,
                    params=params,
                )
    except httpx.HTTPError as exc:
        logger.warning(
            "LinkedIn bridge request failed: %s %s (%s, %.2fs)",
            method,
            path,
            type(exc).__name__,
            time.monotonic() - started,
        )
        raise AppException(503, "LinkedIn service is unavailable. Please try again shortly.")
    if result.status_code >= 400:
        try:
            message = result.json().get("message", "LinkedIn request failed")
        except ValueError:
            message = "LinkedIn request failed"
        raise AppException(result.status_code, message)
    return result.json()


@router.get("/connections")
@limiter.exempt
async def connections(request: Request):
    return await bridge(request, "GET", "/connections")


@router.get("/connection")
@limiter.exempt
async def connection(request: Request):
    return await bridge(request, "GET", "/connection")


class ConnectLinkedIn(BaseModel):
    consent: Literal[True]
    mode: Literal["browser", "cookie"] = "browser"
    liAt: str | None = Field(default=None, max_length=2048)
    jsessionId: str | None = Field(default=None, max_length=512)
    cookies: list[dict] | None = Field(default=None, max_length=150)


@router.post("/connect")
@limiter.exempt
async def connect(request: Request, command: ConnectLinkedIn):
    return await bridge(request, "POST", "/connect", body=command.model_dump())


@router.delete("/connection")
@limiter.exempt
async def disconnect(request: Request, owner: str | None = None):
    return await bridge(request, "DELETE", "/connection", params={"owner": owner} if owner else None)


@router.get("/browser/frame")
@limiter.exempt
async def browser_frame(request: Request, url: str | None = Query(None, max_length=500)):
    return await bridge(request, "GET", "/browser/frame", params={"url": url} if url else None)


class BrowserAction(BaseModel):
    type: Literal["click", "scroll", "type", "key", "navigate", "back", "forward", "reload", "sync"]
    x: float | None = None
    y: float | None = None
    deltaX: float | None = None
    deltaY: float | None = None
    text: str | None = Field(default=None, max_length=4000)
    key: str | None = Field(default=None, max_length=32)
    url: str | None = Field(default=None, max_length=500)


@router.post("/browser/action")
@limiter.exempt
async def browser_action(request: Request, command: BrowserAction):
    return await bridge(request, "POST", "/browser/action", body=command.model_dump(exclude_none=True))


@router.post("/sync")
@limiter.exempt
async def sync(request: Request):
    return await bridge(request, "POST", "/sync")


@router.get("/chats")
@limiter.exempt
async def chats(request: Request, owner: str | None = None):
    return await bridge(request, "GET", "/chats", params={"owner": owner} if owner else None)


@router.get("/contacts")
@limiter.exempt
async def get_contacts(request: Request, q: str | None = Query(None, max_length=100), owner: str | None = None):
    params: dict = {}
    if q:
        params["q"] = q
    if owner:
        params["owner"] = owner
    return await bridge(request, "GET", "/contacts", params=params if params else None)


@router.get("/messages")
@limiter.exempt
async def messages(
    request: Request,
    threadId: str = Query(..., max_length=240),
    owner: str | None = None,
    before: int | None = Query(None, ge=1),
):
    params: dict = {"threadId": threadId}
    if owner:
        params["owner"] = owner
    if before:
        params["before"] = before
    return await bridge(request, "GET", "/messages", params=params)


class SendLinkedInMessage(BaseModel):
    threadId: str = Field(min_length=2, max_length=240)
    text: str = Field(min_length=1, max_length=4096)
    requestId: str = Field(pattern=r"^[a-f0-9-]{36}$")


@router.post("/messages")
@limiter.exempt
async def send(request: Request, command: SendLinkedInMessage):
    return await bridge(request, "POST", "/messages", body=command.model_dump())
