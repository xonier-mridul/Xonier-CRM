import asyncio
import json
from contextlib import suppress

from fastapi import APIRouter, Depends, Query, Request, WebSocket, WebSocketDisconnect

from app.core.chat_runtime import Socket, chat_runtime
from app.core.config import get_setting
from app.schemas.chat_schema import (CallCreate, ConversationCreate, ConversationUpdate, FileUpload, MemberAdd,
    MessageCreate, MessageEdit, Reaction, ReadPosition)
from app.services import chat_calls, chat_storage
from app.services.chat_auth import actor, authenticate
from app.services.chat_policy import oid, public
from app.services.chat_service import ChatService
from app.utils.custom_exception import AppException
from app.utils.custom_response import successResponse

router = APIRouter(prefix="/api/chat", tags=["Team chat"])


def service(user=Depends(actor)):
    chat_runtime.require_ready()
    return ChatService(user)


@router.get("/capabilities")
async def capabilities(user=Depends(actor)):
    s = get_setting()
    return successResponse(data={"ready": chat_runtime.ready, "reason": chat_runtime.error,
        "files": chat_storage.storage_configured(), "calls": chat_calls.configured(),
        "callsReason": "" if chat_calls.configured() else "Voice and video require a configured LiveKit media server. Ask your administrator to set LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET on the backend.",
        "filesReason": "" if chat_storage.storage_configured() else "Private file storage and malware scanning are not configured.",
        "maxFileBytes": s.CHAT_MAX_FILE_BYTES, "maxMembers": s.CHAT_MAX_MEMBERS,
        "maxCallParticipants": s.CHAT_MAX_CALL_PARTICIPANTS, "currentUserId": user["id"]})


@router.get("/users")
async def users(search: str = Query("", max_length=80), svc=Depends(service)):
    return successResponse(data=await svc.users(search))


@router.get("/conversations")
async def conversations(svc=Depends(service)):
    return successResponse(data=await svc.list_conversations())


@router.get("/presence")
async def company_presence(userIds: str = Query("", max_length=2500), svc=Depends(service)):
    ids = sorted(set(filter(None, userIds.split(","))))
    if len(ids) > 100:
        raise AppException(422, "At most 100 presence lookups per request")
    users = await svc.db.users.find(svc.scope(_id={"$in": [oid(uid) for uid in ids]}, status="active", deletedAt=None), {"_id": 1}).to_list(100)
    return successResponse(data={"onlineIds": await chat_runtime.online(svc.actor["company"], [str(u["_id"]) for u in users])})


@router.patch("/conversations/{cid}")
async def update_conversation(cid: str, command: ConversationUpdate, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "settings", 30)
    return successResponse(data=await svc.update_conversation(cid, command))


@router.post("/conversations", status_code=201)
async def create(command: ConversationCreate, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "create", 20)
    return successResponse(201, data=await svc.create(command))


@router.get("/channels/discover")
async def discover(svc=Depends(service)):
    return successResponse(data=await svc.discover())


@router.post("/conversations/{cid}/join")
async def join_channel(cid: str, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "membership", 30)
    return successResponse(data=await svc.membership(cid, join=True))


@router.post("/conversations/{cid}/members")
async def members(cid: str, command: MemberAdd, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "membership", 30)
    return successResponse(data=await svc.membership(cid, add=command.userIds))


@router.delete("/conversations/{cid}/members/{uid}")
async def remove_member(cid: str, uid: str, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "membership", 30)
    oid(uid)
    return successResponse(data=await svc.membership(cid, remove=uid))


@router.get("/conversations/{cid}/messages")
async def messages(cid: str, before: int | None = Query(None, ge=1), after: int | None = Query(None, ge=0),
                   parentId: str | None = None, search: str = Query("", max_length=100), svc=Depends(service)):
    if before is not None and after is not None:
        raise AppException(400, "Use either before or after")
    return successResponse(data=await svc.messages(cid, before, after, parentId, search))


@router.post("/conversations/{cid}/messages", status_code=201)
async def send(cid: str, command: MessageCreate, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "send", 120)
    return successResponse(201, data=await svc.send(cid, command))


@router.patch("/conversations/{cid}/messages/{mid}")
async def edit(cid: str, mid: str, command: MessageEdit, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "edit", 60)
    return successResponse(data=await svc.change_message(cid, mid, text=command.text, version=command.version))


@router.delete("/conversations/{cid}/messages/{mid}")
async def delete(cid: str, mid: str, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "edit", 60)
    return successResponse(data=await svc.change_message(cid, mid, delete=True))


@router.post("/conversations/{cid}/messages/{mid}/reactions")
async def reaction(cid: str, mid: str, command: Reaction, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "reactions", 120)
    return successResponse(data=await svc.change_message(cid, mid, emoji=command.emoji))


@router.post("/conversations/{cid}/read")
async def read(cid: str, command: ReadPosition, svc=Depends(service)):
    return successResponse(data=await svc.mark_read(cid, command.seq))


@router.get("/conversations/{cid}/presence")
async def presence(cid: str, svc=Depends(service)):
    conversation = await svc.conversation(cid)
    return successResponse(data={"onlineIds": await chat_runtime.online(svc.actor["company"], conversation["memberIds"])})


@router.post("/conversations/{cid}/files")
async def upload(cid: str, command: FileUpload, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "upload", 15)
    return successResponse(data=await chat_storage.create_upload(svc, cid, command))


@router.post("/conversations/{cid}/files/{fid}/complete")
async def complete(cid: str, fid: str, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "complete", 30)
    return successResponse(data=await chat_storage.complete_upload(svc, cid, fid))


@router.get("/conversations/{cid}/files/{fid}")
async def file_status(cid: str, fid: str, svc=Depends(service)):
    await svc.conversation(cid)
    file = await svc.db.chat_files.find_one(svc.scope(_id=oid(fid), conversationId=cid))
    if not file or (not file.get("messageId") and file["uploaderId"] != svc.uid):
        raise AppException(404, "File not found")
    return successResponse(data=public(file))


@router.get("/conversations/{cid}/files/{fid}/download")
async def download(cid: str, fid: str, svc=Depends(service)):
    return successResponse(data=await chat_storage.download(svc, cid, fid))


@router.get("/conversations/{cid}/calls")
async def calls(cid: str, svc=Depends(service)):
    await svc.conversation(cid)
    return successResponse(data=public(await svc.db.chat_calls.find(svc.scope(conversationId=cid)).sort("createdAt", -1).limit(20).to_list(20)))


@router.post("/conversations/{cid}/calls", status_code=201)
async def start_call(cid: str, command: CallCreate, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "call", 10)
    return successResponse(201, data=await chat_calls.start(svc, cid, command.kind))


@router.post("/conversations/{cid}/calls/{call_id}/join")
async def join_call(cid: str, call_id: str, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "join_call", 20)
    return successResponse(data=await chat_calls.join(svc, cid, call_id))


@router.post("/conversations/{cid}/calls/{call_id}/end")
async def end_call(cid: str, call_id: str, svc=Depends(service)):
    return successResponse(data=await chat_calls.end(svc, cid, call_id))


@router.post("/conversations/{cid}/calls/{call_id}/connected")
async def call_connected(cid: str, call_id: str, svc=Depends(service)):
    await chat_runtime.limit(svc.actor, "call_connected", 30)
    return successResponse(data=await chat_calls.connected(svc, cid, call_id))


@router.post("/conversations/{cid}/calls/{call_id}/decline")
async def decline_call(cid: str, call_id: str, svc=Depends(service)):
    return successResponse(data=await chat_calls.decline(svc, cid, call_id))


@router.post("/media-webhook")
async def media_webhook(request: Request):
    body = await request.body()
    if len(body) > 256000:
        raise AppException(413, "Webhook too large")
    await chat_calls.webhook(body.decode(), request.headers.get("authorization", ""))
    return {"ok": True}


@router.post("/ws-ticket")
async def ws_ticket(request: Request, svc=Depends(service)):
    header = request.headers.get("authorization", "")
    token = header[7:] if header.startswith("Bearer ") else request.cookies.get("accessToken")
    return successResponse(data={"ticket": await chat_runtime.ticket(svc.actor, token), "expiresIn": 30})


@router.websocket("/ws")
async def websocket(ws: WebSocket, ticket: str = ""):
    settings = get_setting()
    allowed = {settings.CLIENT_URL.rstrip("/"), *[o.strip().rstrip("/") for o in settings.CHAT_ALLOWED_ORIGINS.split(",") if o.strip()]}
    if settings.ENV.lower() in ("development", "dev", "local"):
        allowed.update({"http://localhost:3000", "http://127.0.0.1:3000"})
    # Native mobile clients may omit Origin; browser clients must match our allowlist.
    origin = ws.headers.get("origin")
    if origin and origin.rstrip("/") not in allowed:
        await ws.close(code=4403)
        return
    socket = None
    sender = None
    guard = None
    try:
        chat_runtime.require_ready()
        credentials = await chat_runtime.consume_ticket(ticket)
        if not credentials:
            await ws.close(code=4401)
            return
        user = await authenticate(credentials["token"])
        await chat_runtime.limit(user, "ws_connect", 20)
        if sum(s.actor["id"] == user["id"] for s in chat_runtime.sockets) >= 5:
            await ws.close(code=4429)
            return
        await ws.accept()
        socket = Socket(ws, user)
        chat_runtime.sockets.add(socket)
        chat_runtime.enqueue(socket, {"event": "connected", "userId": user["id"]})

        async def send_queue():
            while True:
                event = await socket.queue.get()
                await authenticate(credentials["token"])
                await asyncio.wait_for(ws.send_json(event), timeout=10)
        async def check_session():
            while True:
                await asyncio.sleep(5)
                try:
                    await authenticate(credentials["token"])
                except Exception:
                    with suppress(Exception):
                        await ws.close(code=4401)
                    return
        sender = asyncio.create_task(send_queue())
        guard = asyncio.create_task(check_session())
        while True:
            # Short-lived tickets keep the access JWT out of proxy logs. Revalidate the
            # original JWT/user/company on every heartbeat, including expiry/suspension.
            user = await authenticate(credentials["token"])
            await chat_runtime.presence(user, socket.connection_id)
            raw = await asyncio.wait_for(ws.receive_text(), timeout=45)
            user = await authenticate(credentials["token"])
            await chat_runtime.limit(user, "ws_commands", 120)
            if len(raw) > 2048:
                await ws.close(code=1009)
                break
            try:
                message = json.loads(raw)
                if not isinstance(message, dict):
                    raise ValueError()
            except (ValueError, TypeError):
                await ws.close(code=1007)
                break
            if message.get("type") == "ping":
                chat_runtime.enqueue(socket, {"event": "pong"})
            elif message.get("type") == "typing":
                try:
                    await chat_runtime.limit(user, "typing", 20, 10)
                    cid = str(message.get("conversationId", ""))
                    await ChatService(user).conversation(cid)
                    await chat_runtime.broadcast(user, cid, "typing", {"userId": user["id"], "name": user["name"]})
                except AppException:
                    pass
    except WebSocketDisconnect:
        pass
    except AppException as exc:
        with suppress(Exception):
            await ws.close(code={401: 4401, 403: 4403, 429: 4429}.get(exc.status_code, 1011))
    except asyncio.TimeoutError:
        with suppress(Exception):
            await ws.close(code=1001)
    finally:
        if socket:
            chat_runtime.sockets.discard(socket)
            with suppress(Exception):
                await chat_runtime.offline(socket.actor, socket.connection_id)
        if sender:
            sender.cancel()
            await asyncio.gather(sender, return_exceptions=True)
        if guard:
            guard.cancel()
            await asyncio.gather(guard, return_exceptions=True)
