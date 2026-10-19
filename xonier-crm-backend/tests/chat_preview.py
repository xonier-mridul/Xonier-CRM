"""Opt-in localhost UI fixture. Uses synthetic users and IN-MEMORY data only.

CHAT_PREVIEW=1 venv/bin/python tests/chat_preview.py
Not a production entry point. No application database/storage/media connections.
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
names = {alice: "Alice Sharma", bob: "Bob Singh", carol: "Carol Patel"}


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
    yield
    await chat_runtime.stop()


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3100", "http://127.0.0.1:3100"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(chat_route.router)


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


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
