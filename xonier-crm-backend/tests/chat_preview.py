"""Opt-in localhost UI fixture. Uses synthetic users and IN-MEMORY data only.

CHAT_PREVIEW=1 venv/bin/python tests/chat_preview.py
Not a production entry point. No application database/storage connections.
CHAT_PREVIEW_LOCAL_MEDIA=1 permits only the disposable loopback LiveKit fixture.
"""
import asyncio
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

if os.environ.get("CHAT_PREVIEW") != "1":
    raise SystemExit("This isolated fixture requires CHAT_PREVIEW=1")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from chat_test_env import seed_test_settings
seed_test_settings()
# Both loopback spellings are valid for this explicitly isolated UI fixture.
os.environ["CHAT_ALLOWED_ORIGINS"] = "http://localhost:3100,http://127.0.0.1:3100"
if os.environ.get("CHAT_PREVIEW_LOCAL_MEDIA") == "1":
    os.environ.update(LIVEKIT_URL="ws://127.0.0.1:17880", LIVEKIT_API_KEY="previewkey",
        LIVEKIT_API_SECRET="local-preview-only-not-a-production-secret-123456")

import uvicorn
from bson import ObjectId
from fakeredis import FakeServer
from fakeredis.aioredis import FakeRedis
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mongomock_motor import AsyncMongoMockClient

from app.core.chat_runtime import chat_runtime
from app.routes import chat_route
from app.schemas.chat_schema import ConversationCreate, MessageCreate
from app.services import chat_auth, chat_calls, chat_service
from app.services.chat_policy import oid, now
from app.utils.custom_exception import AppException

db = AsyncMongoMockClient().preview
company = ObjectId("000000000000000000000001")
alice = "000000000000000000000011"
bob = "000000000000000000000012"
carol = "000000000000000000000013"
names = {alice: "Alice Sharma", bob: "Bob Singh", carol: "Carol Patel",
    "000000000000000000000014": "David Chen", "000000000000000000000015": "Sara Wilson"}


async def authenticate(token):
    uid = bob if token == "preview-bob" else alice
    return {"id": uid, "company": str(company), "name": names[uid]}


async def transaction(self, callback):
    return await callback(None)


chat_auth.database = lambda: db
chat_service.database = lambda: db
chat_calls.database = lambda: db
import app.core.chat_runtime as runtime_module
runtime_module.database = lambda: db
chat_auth.authenticate = authenticate
chat_route.authenticate = authenticate
chat_service.ChatService.transaction = transaction
preview_realtime_enabled = True
original_consume_ticket = chat_runtime.consume_ticket


async def preview_consume_ticket(ticket):
    credentials = await original_consume_ticket(ticket)
    return credentials if preview_realtime_enabled else None


chat_runtime.consume_ticket = preview_consume_ticket


@asynccontextmanager
async def lifespan(app):
    await db.companies.insert_one({"_id": company, "status": "active"})
    await db.users.insert_many([{"_id": oid(uid), "companyId": company, "firstName": name.split()[0],
        "lastName": name.split()[1], "status": "active"} for uid, name in names.items()])
    chat_runtime.redis = FakeRedis(server=FakeServer(), decode_responses=True)
    chat_runtime.ready = True
    chat_runtime.error = ""
    chat_runtime.tasks = [asyncio.create_task(chat_runtime.listen()), asyncio.create_task(chat_runtime.dispatch())]
    svc = chat_service.ChatService(await authenticate("preview-alice"))
    general = await svc.create(ConversationCreate(kind="channel", name="general", description="Company updates, ideas and good conversations.", visibility="public", memberIds=[bob, carol]))
    bob_service = chat_service.ChatService(await authenticate("preview-bob"))
    from uuid import uuid4
    await svc.send(general["id"], MessageCreate(clientId=uuid4(), text="Welcome to our team space 👋\nLet's keep ideas, decisions and project updates together."))
    await bob_service.send(general["id"], MessageCreate(clientId=uuid4(), text="Looks great! We can use threads for project discussions and keep this channel focused."))
    await svc.create(ConversationCreate(kind="dm", memberIds=[bob]))
    await svc.send(general["id"], MessageCreate(clientId=uuid4(), text="Release readiness checklist\n\n" + "Keep the owner, delivery date, review notes and decision in this channel. Follow up in a thread when details need more room.\n" * 35))
    await chat_runtime.presence(await authenticate("preview-bob"), "preview-phone")
    yield
    await chat_runtime.stop()


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3100", "http://127.0.0.1:3100"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(chat_route.router)


@app.post("/__preview/realtime")
async def preview_realtime(enabled: bool):
    """Synthetic-only outage control for browser recovery checks; never in app.main."""
    global preview_realtime_enabled
    preview_realtime_enabled = enabled
    if not enabled:
        for socket in list(chat_runtime.sockets):
            await socket.ws.close(code=1012)
    return {"enabled": enabled}


@app.middleware("http")
async def synthetic_latency(request, call_next):
    if request.method == "POST" and request.url.path.endswith("/messages"):
        await asyncio.sleep(float(os.getenv("CHAT_PREVIEW_MESSAGE_DELAY", "0")))
    return await call_next(request)


@app.get("/api/auth/session")
async def active_session():
    return {"success": True, "data": {"active": True}}


@app.exception_handler(AppException)
async def error(request, exc):
    return JSONResponse(status_code=exc.status_code, content={"success": False, "message": exc.message})


@app.get("/api/auth/me")
async def me(response: Response):
    response.set_cookie("accessToken", "preview-alice", httponly=True)
    return {"success": True, "data": {"id": alice, "_id": alice, "firstName": "Alice", "lastName": "Sharma",
        "email": "alice@example.test", "status": "active", "userRole": [{"code": "COMPANY_ADMIN", "permissions": [], "name": "Company admin"}],
        "companyId": {"id": str(company), "companyName": "Trakeroo Preview", "subscription": {"planId": {"features": []}}}}}


@app.get("/api/v1/notifications/unread-count")
async def unread():
    return {"success": True, "data": {"unreadCount": 0}}


@app.get("/api/v1/notifications/")
async def notifications():
    return {"success": True, "data": {"data": [], "page": 1, "limit": 20, "total": 0, "totalPages": 0}}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("CHAT_PREVIEW_PORT", "8137")))
