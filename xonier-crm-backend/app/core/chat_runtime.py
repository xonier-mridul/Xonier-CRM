"""Cross-worker WebSocket fan-out with a MongoDB transactional outbox.

Redis is a transient notification bus. The database is the source of truth and
clients resync on reconnect/periodically. Outbox delivery is at-least-once.
"""
import asyncio
import json
import logging
import secrets
from contextlib import suppress
from dataclasses import dataclass, field
from datetime import timedelta

from fastapi import WebSocket
from pymongo import ReturnDocument
from redis.asyncio import Redis

from app.core.config import get_setting
from app.services.chat_auth import database
from app.services.chat_policy import now, oid, public
from app.utils.custom_exception import AppException

log = logging.getLogger(__name__)


@dataclass(eq=False)
class Socket:
    ws: WebSocket
    actor: dict
    queue: asyncio.Queue = field(default_factory=lambda: asyncio.Queue(maxsize=100))
    connection_id: str = field(default_factory=lambda: secrets.token_hex(16))


class ChatRuntime:
    def __init__(self):
        settings = get_setting()
        self.channel = f"trakeroo:chat:{settings.ENV}:{settings.DATABASE_NAME}:events:v1"
        self.prefix = f"trakeroo:chat:{settings.ENV}:{settings.DATABASE_NAME}"
        self.redis = None
        self.sockets: set[Socket] = set()
        self.tasks = []
        self.ready = False
        self.error = "Chat is starting"

    async def start(self):
        if not get_setting().CHAT_ENABLED:
            self.error = "Team chat is disabled"
            return
        try:
            from app.services.chat_service import init_chat_indexes
            await init_chat_indexes()
            s = get_setting()
            self.redis = (Redis.from_url(s.CHAT_REDIS_URL, decode_responses=True,
                socket_connect_timeout=3, socket_timeout=5) if s.CHAT_REDIS_URL else Redis(
                host=s.REDIS_HOST, port=s.REDIS_PORT, decode_responses=True,
                socket_connect_timeout=3, socket_timeout=5))
            await self.redis.ping()
            self.tasks = [asyncio.create_task(self.listen()), asyncio.create_task(self.dispatch()),
                          asyncio.create_task(self.maintenance()), asyncio.create_task(self.media_maintenance())]
            self.ready, self.error = True, ""
        except Exception:
            self.error = "Chat needs a MongoDB replica set and a reachable Redis service; see server logs"
            # Keep unrelated CRM endpoints available if optional chat infrastructure is not ready.
            log.exception("Chat startup failed")

    async def stop(self):
        self.ready = False
        for task in self.tasks:
            task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)
        for socket in list(self.sockets):
            with suppress(Exception):
                await socket.ws.close(code=1012)
        if self.redis:
            await self.redis.aclose()

    def require_ready(self):
        if not self.ready:
            raise AppException(503, self.error)

    async def limit(self, actor, action, maximum=60, seconds=60):
        self.require_ready()
        key = f"{self.prefix}:limit:{actor['company']}:{actor['id']}:{action}"
        try:
            count = await self.redis.incr(key)
            if count == 1:
                await self.redis.expire(key, seconds)
        except Exception:
            raise AppException(503, "Chat is temporarily unavailable; please retry")
        if count > maximum:
            raise AppException(429, "Too many requests; please wait a moment")

    async def ticket(self, actor, token):
        await self.limit(actor, "tickets", 20)
        ticket = secrets.token_urlsafe(32)
        await self.redis.set(f"{self.prefix}:ticket:{ticket}", json.dumps({"actor": actor, "token": token}), ex=30)
        return ticket

    async def consume_ticket(self, ticket):
        if not ticket or len(ticket) > 100:
            return None
        raw = await self.redis.getdel(f"{self.prefix}:ticket:{ticket}")
        return json.loads(raw) if raw else None

    async def presence(self, actor, connection_id="legacy"):
        key = f"{self.prefix}:active:{actor['company']}:{actor['id']}"
        stamp = now().timestamp()
        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.zremrangebyscore(key, "-inf", stamp - 50)
            pipe.zadd(key, {connection_id: stamp})
            pipe.expire(key, 65)
            await pipe.execute()

    async def offline(self, actor, connection_id):
        await self.redis.zrem(f"{self.prefix}:active:{actor['company']}:{actor['id']}", connection_id)

    async def online(self, company, users):
        if not users:
            return []
        async with self.redis.pipeline(transaction=False) as pipe:
            for uid in users:
                pipe.zcount(f"{self.prefix}:active:{company}:{uid}", now().timestamp() - 50, "+inf")
            values = await pipe.execute()
        return [u for u, value in zip(users, values) if value]

    async def broadcast(self, actor, conversation_id, event, data):
        await self.redis.publish(self.channel, json.dumps({"event": event, "eventId": secrets.token_hex(12),
            "company": actor["company"], "conversationId": conversation_id, "data": data}))

    async def listen(self):
        while True:
            try:
                async with self.redis.pubsub() as subscription:
                    await subscription.subscribe(self.channel)
                    for socket in self.sockets:
                        self.enqueue(socket, {"event": "sync.required"})
                    async for message in subscription.listen():
                        if message["type"] != "message":
                            continue
                        event = json.loads(message["data"])
                        conversation = await database().chat_conversations.find_one({
                            "_id": oid(event["conversationId"]), "companyId": oid(event["company"])})
                        targets = []
                        for socket in list(self.sockets):
                            if socket.actor["company"] != event["company"]:
                                continue
                            uid = socket.actor["id"]
                            if event["event"] == "conversation.removed":
                                allowed = uid in (event.get("recipients") or [])
                            else:
                                allowed = bool(conversation and uid in conversation["memberIds"])
                            if allowed:
                                targets.append(socket)
                        if not targets:
                            continue
                        company = await database().companies.find_one({"_id": oid(event["company"]),
                            "status": "active", "deletedAt": None}, {"_id": 1})
                        if not company:
                            continue
                        user_ids = {s.actor["id"] for s in targets}
                        users = await database().users.find({"_id": {"$in": [oid(u) for u in user_ids]},
                            "companyId": oid(event["company"]), "status": "active", "deletedAt": None}, {"_id": 1}).to_list(len(user_ids))
                        active_ids = {str(u["_id"]) for u in users}
                        for socket in targets:
                            if socket.actor["id"] in active_ids:
                                self.enqueue(socket, {k: v for k, v in event.items() if k not in {"company", "recipients"}})
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("Chat realtime bus disconnected; reconnecting")
                await asyncio.sleep(2)

    def enqueue(self, socket, event):
        if socket.queue.full():
            # An explicit resync beats silently dropping a random event for a slow client.
            while not socket.queue.empty():
                socket.queue.get_nowait()
            socket.queue.put_nowait({"event": "sync.required"})
        else:
            socket.queue.put_nowait(event)

    async def dispatch(self):
        while True:
            try:
                db = database()
                event = await db.chat_outbox.find_one_and_update({"deliveredAt": None, "availableAt": {"$lte": now()}},
                    {"$set": {"availableAt": now() + timedelta(seconds=30)}, "$inc": {"attempts": 1}},
                    return_document=ReturnDocument.AFTER, sort=[("createdAt", 1)])
                if not event:
                    await asyncio.sleep(0.1)
                    continue
                await self.redis.publish(self.channel, json.dumps({"eventId": str(event["_id"]),
                    "event": event["event"], "company": str(event["companyId"]),
                    "conversationId": event["conversationId"], "data": event["data"], "recipients": event.get("recipients")}))
                await db.chat_outbox.update_one({"_id": event["_id"]}, {"$set": {"deliveredAt": now()}})
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("Chat outbox dispatch failed; event retained for retry")
                await asyncio.sleep(2)

    async def maintenance(self):
        from app.services.chat_storage import scan_one
        while True:
            try:
                await scan_one(database())
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("Chat maintenance failed; retrying")
            await asyncio.sleep(2)

    async def media_maintenance(self):
        from app.services.chat_calls import expire_one
        while True:
            try:
                await expire_one(database())
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("Chat media reconciliation failed; retrying")
            await asyncio.sleep(2)


chat_runtime = ChatRuntime()
