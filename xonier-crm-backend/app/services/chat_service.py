"""Tenant-scoped durable chat. Transactions atomically persist data and outbox events.

MongoDB must be a replica set (Atlas is supported). No process-local message state.
"""
import asyncio
import hashlib
import json
import re
from datetime import timedelta

from bson import ObjectId
from pymongo import ASCENDING, DESCENDING, IndexModel, ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.config import get_setting
from app.services.chat_auth import database
from app.services.chat_policy import now, oid, public, require_author, require_member, require_owner, validate_members
from app.utils.custom_exception import AppException


class ChatService:
    def __init__(self, actor):
        self.actor = actor
        self.uid, self.company = actor["id"], oid(actor["company"])
        self.db = database()

    def scope(self, **query):
        return {"companyId": self.company, **query}

    async def transaction(self, callback):
        async with await self.db.client.start_session() as session:
            return await session.with_transaction(callback)

    async def conversation(self, conversation_id, session=None):
        doc = await self.db.chat_conversations.find_one(self.scope(_id=oid(conversation_id)), session=session)
        require_member(doc, self.uid)
        return doc

    async def event(self, name, conversation_id, data, session=None, recipients=None):
        await self.db.chat_outbox.insert_one({
            "companyId": self.company, "event": name, "conversationId": str(conversation_id),
            "data": public(data), "recipients": recipients, "createdAt": now(),
            "availableAt": now(), "attempts": 0,
        }, session=session)

    async def users(self, search=""):
        query = self.scope(status="active", deletedAt=None)
        if search:
            query["$or"] = [{k: {"$regex": re.escape(search), "$options": "i"}} for k in ("firstName", "lastName")]
        docs = await self.db.users.find(query, {"firstName": 1, "lastName": 1}).sort("firstName", 1).limit(100).to_list(100)
        return [{"id": str(d["_id"]), "name": " ".join(filter(None, [d.get("firstName"), d.get("lastName")]))} for d in docs]

    async def list_conversations(self):
        docs = await self.db.chat_conversations.find(self.scope(memberIds=self.uid)).sort("updatedAt", -1).limit(200).to_list(200)
        # One aggregation, rather than a database round trip per conversation.
        counts = {}
        if docs:
            unread = await self.db.chat_messages.aggregate([
                {"$match": self.scope(senderId={"$ne": self.uid}, parentId=None, deletedAt=None,
                    **{"$or": [{"conversationId": str(doc["_id"]), "seq": {"$gt": doc.get("read", {}).get(self.uid, 0)}} for doc in docs]})},
                {"$group": {"_id": "$conversationId", "count": {"$sum": 1}}},
            ]).to_list(len(docs))
            counts = {item["_id"]: item["count"] for item in unread}
        for doc in docs:
            doc["unread"] = counts.get(str(doc["_id"]), 0)
        return public(docs)

    async def discover(self):
        return public(await self.db.chat_conversations.find(self.scope(
            kind="channel", visibility="public", archived={"$ne": True}, memberIds={"$ne": self.uid}),
            {"name": 1, "description": 1}).sort("name", 1).limit(100).to_list(100))

    async def create(self, command):
        members = validate_members(command.kind, command.memberIds, self.uid, get_setting().CHAT_MAX_MEMBERS)
        valid = await self.db.users.count_documents(self.scope(_id={"$in": [oid(u) for u in members]}, status="active", deletedAt=None))
        if valid != len(members):
            raise AppException(400, "Every member must be an active user in your company")
        dm_key = ":".join(members) if command.kind == "dm" else None
        if dm_key:
            existing = await self.db.chat_conversations.find_one(self.scope(dmKey=dm_key))
            if existing:
                return public(existing)
        people = await self.db.users.find(self.scope(_id={"$in": [oid(u) for u in members]}), {"firstName": 1, "lastName": 1}).to_list(len(members))
        names = {str(p["_id"]): " ".join(filter(None, [p.get("firstName"), p.get("lastName")])) for p in people}
        doc = {"_id": ObjectId(), "companyId": self.company, "kind": command.kind,
               "name": command.name, "description": command.description, "visibility": command.visibility,
               "ownerId": self.uid, "memberIds": members, "memberNames": names, "read": {},
               "lastSeq": 0, "settingsVersion": 1, "archived": False,
               "createdAt": now(), "updatedAt": now(), "lastMessage": None}
        if dm_key:
            doc["dmKey"] = dm_key

        async def commit(session):
            await self.db.chat_conversations.insert_one(doc, session=session)
            await self.event("conversation.updated", doc["_id"], doc, session)
        try:
            await self.transaction(commit)
        except DuplicateKeyError:
            if not dm_key:
                raise
            return public(await self.db.chat_conversations.find_one(self.scope(dmKey=dm_key)))
        return public(doc)

    async def membership(self, conversation_id, add=None, remove=None, join=False):
        async def commit(session):
            doc = await self.db.chat_conversations.find_one(self.scope(_id=oid(conversation_id)), session=session)
            if not doc:
                raise AppException(404, "Conversation not found")
            if join:
                if doc["kind"] != "channel" or doc["visibility"] != "public":
                    raise AppException(404, "Channel not found")
                adding = [self.uid]
            else:
                if remove == self.uid and doc["kind"] != "dm":
                    require_member(doc, self.uid)
                else:
                    require_owner(doc, self.uid)
                adding = add or []
            if doc.get("archived"):
                raise AppException(409, "Restore this conversation before changing membership")
            if remove == doc["ownerId"]:
                raise AppException(400, "Transfer ownership before leaving this conversation")
            old_members = doc["memberIds"][:]
            members = validate_members(doc["kind"], [*doc["memberIds"], *adding], doc["ownerId"], get_setting().CHAT_MAX_MEMBERS)
            if adding:
                people = await self.db.users.find(self.scope(_id={"$in": [oid(u) for u in adding]}, status="active", deletedAt=None), session=session).to_list(len(adding))
                if len(people) != len(set(adding)):
                    raise AppException(400, "Members must be active users in your company")
                for p in people:
                    doc["memberNames"][str(p["_id"])] = " ".join(filter(None, [p.get("firstName"), p.get("lastName")]))
            if remove:
                members = [u for u in members if u != remove]
                doc["memberNames"].pop(remove, None)
                # Calls are closed before removal, ensuring issued media grants cannot linger.
                if doc.get("activeCallId"):
                    raise AppException(409, "End the active call before removing a member")
            doc.update(memberIds=members, updatedAt=now(), settingsVersion=doc.get("settingsVersion", 1) + 1)
            await self.db.chat_conversations.replace_one(self.scope(_id=doc["_id"]), doc, session=session)
            await self.event("conversation.updated", doc["_id"], doc, session)
            if remove in old_members:
                await self.event("conversation.removed", doc["_id"], {"id": str(doc["_id"])}, session, [remove])
            return public(doc)
        return await self.transaction(commit)

    async def update_conversation(self, conversation_id, command):
        changes = command.model_dump(exclude_none=True, exclude={"version"})
        if not changes:
            raise AppException(400, "No settings provided")
        async def commit(session):
            doc = await self.conversation(conversation_id, session)
            require_owner(doc, self.uid)
            if doc.get("settingsVersion", 1) != command.version:
                raise AppException(409, "Conversation settings changed. Reload before saving.")
            if changes.get("archived") and doc.get("activeCallId"):
                raise AppException(409, "End the active call before archiving this conversation")
            if "ownerId" in changes:
                owner = changes["ownerId"]
                if owner not in doc["memberIds"] or not await self.db.users.find_one(
                        self.scope(_id=oid(owner), status="active", deletedAt=None), session=session):
                    raise AppException(400, "The new owner must be an active member of this conversation")
            doc.update(**changes, settingsVersion=command.version + 1, updatedAt=now())
            await self.db.chat_conversations.replace_one(self.scope(_id=doc["_id"]), doc, session=session)
            await self.event("conversation.updated", doc["_id"], doc, session)
            return public(doc)
        return await self.transaction(commit)

    async def messages(self, conversation_id, before=None, after=None, parent_id=None, search=""):
        await self.conversation(conversation_id)
        query = self.scope(conversationId=conversation_id, parentId=parent_id)
        if before is not None:
            query["seq"] = {"$lt": before}
        if after is not None:
            query["seq"] = {"$gt": after}
        if search:
            query.update(text={"$regex": re.escape(search), "$options": "i"}, deletedAt=None)
        direction = 1 if after is not None else -1
        docs = await self.db.chat_messages.find(query).sort("seq", direction).limit(51).to_list(51)
        more = len(docs) > 50
        docs = docs[:50]
        if direction == -1:
            docs.reverse()
        return {"items": public(docs), "hasMore": more}

    async def send(self, conversation_id, command):
        client_id = str(command.clientId)
        request_hash = hashlib.sha256(json.dumps({"text": command.text, "parentId": command.parentId,
            "attachments": sorted(set(command.attachmentIds))}, sort_keys=True).encode()).hexdigest()

        def replay(existing):
            if existing.get("requestHash") != request_hash:
                raise AppException(409, "This message id was already used for different content")
            return public(existing)

        async def commit(session):
            doc = await self.conversation(conversation_id, session)
            if doc.get("archived"):
                raise AppException(409, "This conversation is archived")
            existing = await self.db.chat_messages.find_one(self.scope(
                conversationId=conversation_id, senderId=self.uid, clientId=client_id), session=session)
            if existing:
                return replay(existing)
            if command.parentId:
                parent = await self.db.chat_messages.find_one(self.scope(
                    _id=oid(command.parentId), conversationId=conversation_id, parentId=None, deletedAt=None), session=session)
                if not parent:
                    raise AppException(404, "Thread not found")
            attachments = []
            for file_id in set(command.attachmentIds):
                file = await self.db.chat_files.find_one(self.scope(_id=oid(file_id), conversationId=conversation_id,
                    uploaderId=self.uid, state={"$in": ["scanning", "ready"]}, messageId=None), session=session)
                if not file:
                    raise AppException(400, "Attachment is unavailable or already attached")
                attachments.append({"id": file_id, "name": file["name"], "size": file["size"], "contentType": file["contentType"]})
            # The counter and message commit together: cursors cannot skip a late commit.
            updated = await self.db.chat_conversations.find_one_and_update(self.scope(_id=doc["_id"]),
                {"$inc": {"lastSeq": 1}, "$set": {"updatedAt": now()}}, session=session, return_document=ReturnDocument.AFTER)
            message = {"_id": ObjectId(), "companyId": self.company, "conversationId": conversation_id,
                "senderId": self.uid, "senderName": self.actor["name"], "clientId": client_id, "requestHash": request_hash,
                "text": command.text, "parentId": command.parentId, "attachments": attachments,
                "seq": updated["lastSeq"], "version": 1, "reactions": {}, "replyCount": 0,
                "createdAt": now(), "editedAt": None, "deletedAt": None}
            await self.db.chat_messages.insert_one(message, session=session)
            if attachments:
                await self.db.chat_files.update_many(self.scope(_id={"$in": [oid(a["id"]) for a in attachments]}),
                    {"$set": {"messageId": str(message["_id"]) }}, session=session)
            if command.parentId:
                parent = await self.db.chat_messages.find_one_and_update(self.scope(_id=oid(command.parentId)),
                    {"$inc": {"replyCount": 1, "version": 1}}, session=session, return_document=ReturnDocument.AFTER)
                await self.event("message.updated", conversation_id, parent, session)
            else:
                await self.db.chat_conversations.update_one(self.scope(_id=doc["_id"]), {"$set": {"lastMessage": {
                    "text": command.text[:140] or "Shared a file", "senderName": self.actor["name"], "seq": message["seq"]}}}, session=session)
            await self.event("message.created", conversation_id, message, session)
            return public(message)
        try:
            return await self.transaction(commit)
        except DuplicateKeyError:
            await self.conversation(conversation_id)
            return replay(await self.db.chat_messages.find_one(self.scope(conversationId=conversation_id, senderId=self.uid, clientId=client_id)))

    async def change_message(self, conversation_id, message_id, text=None, version=None, emoji=None, delete=False):
        async def commit(session):
            conversation = await self.conversation(conversation_id, session)
            if conversation.get("archived"):
                raise AppException(409, "Restore this conversation before changing messages")
            message = await self.db.chat_messages.find_one(self.scope(_id=oid(message_id), conversationId=conversation_id), session=session)
            if not message:
                raise AppException(404, "Message not found")
            if emoji:
                if message.get("deletedAt"):
                    raise AppException(409, "Message has been deleted")
                users = set(message["reactions"].get(emoji, []))
                users.symmetric_difference_update({self.uid})
                if users:
                    message["reactions"][emoji] = sorted(users)
                else:
                    message["reactions"].pop(emoji, None)
            else:
                require_author(message, self.uid)
                if version is not None and message["version"] != version:
                    raise AppException(409, "Message changed; refresh before editing")
                message["text"] = "" if delete else text
                message["editedAt"] = now()
                if delete:
                    message.update(deletedAt=now(), attachments=[], reactions={})
            message["version"] += 1
            await self.db.chat_messages.replace_one(self.scope(_id=message["_id"]), message, session=session)
            if (conversation.get("lastMessage") or {}).get("seq") == message["seq"]:
                await self.db.chat_conversations.update_one(self.scope(_id=conversation["_id"]), {"$set": {
                    "lastMessage.text": "Message deleted" if delete else message["text"][:140] or "Shared a file"}}, session=session)
            await self.event("message.updated", conversation_id, message, session)
            return public(message)
        return await self.transaction(commit)

    async def mark_read(self, conversation_id, seq):
        doc = await self.conversation(conversation_id)
        seq = min(seq, doc["lastSeq"])
        await self.db.chat_conversations.update_one(self.scope(_id=doc["_id"], memberIds=self.uid), {"$max": {f"read.{self.uid}": seq}})
        return {"seq": seq}


async def init_chat_indexes():
    db = database()
    hello = await db.command("hello")
    if not hello.get("setName") and hello.get("msg") != "isdbgrid":
        raise RuntimeError("Team chat requires MongoDB replica set/Atlas for atomic message delivery")
    await db.chat_conversations.create_indexes([
        IndexModel([("companyId", ASCENDING), ("memberIds", ASCENDING), ("updatedAt", DESCENDING)]),
        IndexModel([("companyId", ASCENDING), ("dmKey", ASCENDING)], unique=True,
                   partialFilterExpression={"dmKey": {"$type": "string"}}),
    ])
    await db.chat_messages.create_indexes([
        IndexModel([("companyId", 1), ("conversationId", 1), ("seq", 1)], unique=True),
        IndexModel([("companyId", 1), ("conversationId", 1), ("senderId", 1), ("clientId", 1)], unique=True),
        IndexModel([("companyId", 1), ("conversationId", 1), ("parentId", 1), ("seq", -1)]),
    ])
    await db.chat_outbox.create_indexes([
        IndexModel([("availableAt", 1)]),
        IndexModel([("deliveredAt", 1)], expireAfterSeconds=86400),
    ])
    await db.chat_files.create_index([("state", 1), ("scanLease", 1)])
    await db.chat_calls.create_index([("companyId", 1), ("conversationId", 1), ("createdAt", -1)])
