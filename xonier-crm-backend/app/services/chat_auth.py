"""Explicit tenant authorization, including for WebSockets (HTTP middleware is bypassed)."""
import importlib

from fastapi import Request

from app.core.config import get_setting
from app.services.chat_policy import oid
from app.utils.custom_exception import AppException
from app.utils.manage_tokens import verify_access_token


def database():
    db = importlib.import_module("app.db.db").db
    if db is None:
        raise AppException(503, "Chat database is unavailable")
    return db


async def authenticate(token: str | None):
    if not get_setting().CHAT_ENABLED:
        raise AppException(503, "Team chat is disabled")
    payload = verify_access_token(token) if token else None
    if not payload or payload.get("type") != "access":
        raise AppException(401, "Please sign in again")
    user = await database().users.find_one({"_id": oid(payload.get("_id")), "status": "active", "deletedAt": None})
    if not user or not user.get("companyId"):
        raise AppException(403, "An active company account is required for team chat")
    company = await database().companies.find_one({"_id": user["companyId"], "status": "active", "deletedAt": None})
    if not company:
        raise AppException(403, "Your company account is not active")
    return {"id": str(user["_id"]), "company": str(user["companyId"]),
            "name": " ".join(filter(None, [user.get("firstName"), user.get("lastName")]))}


async def actor(request: Request):
    header = request.headers.get("authorization", "")
    token = header[7:] if header.startswith("Bearer ") else request.cookies.get("accessToken")
    return await authenticate(token)
