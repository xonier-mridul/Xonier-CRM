"""Isolated chat tests. Never connects to the configured application database.

Default: in-memory Mongo/Redis. For real transactions use a disposable local replica
set: CHAT_TEST_MONGO_URI=mongodb://127.0.0.1:27029/?replicaSet=chat-test ...
"""
import asyncio
import os
import io
import unittest
from types import SimpleNamespace
from datetime import timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from chat_test_env import seed_test_settings
seed_test_settings()

from bson import ObjectId
from fakeredis import FakeServer
from fakeredis.aioredis import FakeRedis
from mongomock_motor import AsyncMongoMockClient
from pydantic import ValidationError

from app.core.chat_runtime import ChatRuntime, Socket
from app.schemas.chat_schema import ConversationCreate, ConversationUpdate, MessageCreate, MessageEdit
from app.services import chat_auth, chat_calls, chat_storage
from app.services.chat_policy import now, oid, public
from app.services.chat_service import ChatService
from app.utils.custom_exception import AppException


class ChatTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.real = os.getenv("CHAT_TEST_MONGO_URI", "")
        if self.real:
            from motor.motor_asyncio import AsyncIOMotorClient
            from urllib.parse import urlparse
            if urlparse(self.real).hostname not in ("127.0.0.1", "localhost"):
                raise RuntimeError("Chat tests only allow a disposable LOCAL database")
            self.client = AsyncIOMotorClient(self.real, serverSelectionTimeoutMS=3000)
        else:
            self.client = AsyncMongoMockClient()
        self.db = self.client[f"trakeroo_chat_test_{uuid4().hex}"]
        self.patches = [patch("app.services.chat_service.database", return_value=self.db),
            patch("app.services.chat_auth.database", return_value=self.db),
            patch("app.services.chat_calls.database", return_value=self.db),
            patch("app.core.chat_runtime.database", return_value=self.db)]
        for p in self.patches:
            p.start()
        self.company, self.other_company = ObjectId(), ObjectId()
        self.alice, self.bob, self.charlie, self.mallory = [str(ObjectId()) for _ in range(4)]
        await self.db.companies.insert_many([{"_id": self.company, "status": "active"}, {"_id": self.other_company, "status": "active"}])
        await self.db.users.insert_many([{"_id": oid(uid), "companyId": company, "firstName": name, "status": "active"}
            for uid, name, company in [(self.alice, "Alice", self.company), (self.bob, "Bob", self.company),
                (self.charlie, "Charlie", self.company), (self.mallory, "Mallory", self.other_company)]])
        self.service = self.as_user(self.alice)
        await self.db.chat_messages.create_index([("companyId", 1), ("conversationId", 1), ("senderId", 1), ("clientId", 1)], unique=True)
        await self.db.chat_conversations.create_index([("companyId", 1), ("dmKey", 1)], unique=True, partialFilterExpression={"dmKey": {"$type": "string"}})

    async def asyncTearDown(self):
        await self.client.drop_database(self.db.name)
        self.client.close()
        for p in reversed(self.patches):
            p.stop()

    def as_user(self, uid, company=None):
        svc = ChatService({"id": uid, "company": str(company or self.company), "name": "Test user"})
        if not self.real:
            async def transaction(callback):
                return await callback(None)
            svc.transaction = transaction
        return svc

    async def conversation(self, kind="group", members=None, visibility="private"):
        return await self.service.create(ConversationCreate(kind=kind, name="Team", memberIds=members or [self.bob], visibility=visibility))

    async def test_tenant_isolation_and_membership_on_reads_writes(self):
        conversation = await self.conversation()
        cid = conversation["id"]
        for outsider in [self.as_user(self.charlie), self.as_user(self.mallory, self.other_company)]:
            for operation in [outsider.messages(cid), outsider.send(cid, MessageCreate(clientId=uuid4(), text="attack"))]:
                with self.assertRaises(AppException) as error:
                    await operation
                self.assertEqual(error.exception.status_code, 404)
        with self.assertRaises(AppException):
            await self.service.create(ConversationCreate(kind="group", name="Leak", memberIds=[self.mallory]))
        self.assertEqual(await self.db.chat_messages.count_documents({}), 0)

    async def test_idempotency_counter_and_durable_outbox(self):
        cid = (await self.conversation())["id"]
        command = MessageCreate(clientId=uuid4(), text="hello")
        first = await self.service.send(cid, command)
        second = await self.service.send(cid, command)
        self.assertEqual(first["id"], second["id"])
        self.assertEqual(await self.db.chat_messages.count_documents({}), 1)
        self.assertEqual((await self.service.conversation(cid))["lastSeq"], 1)
        self.assertEqual(await self.db.chat_outbox.count_documents({"event": "message.created"}), 1)
        self.assertNotIn("companyId", first)
        with self.assertRaises(AppException) as error:
            await self.service.send(cid, MessageCreate(clientId=command.clientId, text="different content"))
        self.assertEqual(error.exception.status_code, 409)

    async def test_thread_validation_edit_conflict_and_authorization(self):
        cid = (await self.conversation())["id"]
        message = await self.service.send(cid, MessageCreate(clientId=uuid4(), text="original"))
        bob = self.as_user(self.bob)
        with self.assertRaises(AppException) as error:
            await bob.change_message(cid, message["id"], text="hijack", version=1)
        self.assertEqual(error.exception.status_code, 403)
        await self.service.change_message(cid, message["id"], text="edited", version=1)
        with self.assertRaises(AppException) as error:
            await self.service.change_message(cid, message["id"], text="stale", version=1)
        self.assertEqual(error.exception.status_code, 409)
        reply = await bob.send(cid, MessageCreate(clientId=uuid4(), text="reply", parentId=message["id"]))
        self.assertEqual(len((await self.service.messages(cid))["items"]), 1)
        self.assertEqual((await self.service.messages(cid, parent_id=message["id"]))["items"][0]["id"], reply["id"])
        with self.assertRaises(AppException):
            await bob.send(cid, MessageCreate(clientId=uuid4(), text="nested", parentId=reply["id"]))

    async def test_reply_ack_updates_only_its_parent_and_retry_never_increments_twice(self):
        cid = (await self.conversation())["id"]
        parents = [await self.service.send(cid, MessageCreate(clientId=uuid4(), text=text)) for text in ("First", "Second")]
        for index in (0, 1, 0, 0, 1):
            command = MessageCreate(clientId=uuid4(), text="Reply", parentId=parents[index]["id"])
            reply = await self.service.send(cid, command)
            replay = await self.service.send(cid, command)
            self.assertEqual(reply["threadParent"]["id"], parents[index]["id"])
            self.assertEqual(replay["threadParent"]["replyCount"], reply["threadParent"]["replyCount"])
        rows = (await self.service.messages(cid))["items"]
        self.assertEqual([row["replyCount"] for row in rows], [3, 2])
        self.assertEqual([row["version"] for row in rows], [4, 3])

    async def test_message_snapshot_sync_refreshes_old_rows_without_leaking_other_rooms(self):
        cid = (await self.conversation())["id"]
        first = await self.service.send(cid, MessageCreate(clientId=uuid4(), text="Old parent"))
        for i in range(51):
            await self.service.send(cid, MessageCreate(clientId=uuid4(), text=str(i)))
        self.assertNotIn(first["id"], [row["id"] for row in (await self.service.messages(cid))["items"]])
        await self.as_user(self.bob).change_message(cid, first["id"], emoji="👍")
        other = (await self.conversation())["id"]
        foreign = await self.service.send(other, MessageCreate(clientId=uuid4(), text="Other room"))
        result = await self.service.messages(cid, message_ids=[first["id"], foreign["id"]])
        self.assertEqual([row["id"] for row in result["items"]], [first["id"]])
        self.assertEqual(result["items"][0]["reactions"], {"👍": [self.bob]})
        with self.assertRaises(AppException):
            await self.as_user(self.mallory, self.other_company).messages(cid, message_ids=[first["id"]])

    def test_dev_frontend_port_3100_is_allowed_but_production_stays_explicit(self):
        from app.core.chat_origins import allowed_chat_origins
        settings = SimpleNamespace(CLIENT_URL="https://chat.example.test", CHAT_ALLOWED_ORIGINS="", ENV="development")
        self.assertIn("http://127.0.0.1:3100", allowed_chat_origins(settings))
        self.assertIn("http://localhost:3100", allowed_chat_origins(settings))
        self.assertNotIn("https://evil.example.test", allowed_chat_origins(settings))
        settings.ENV = "production"
        self.assertEqual(allowed_chat_origins(settings), {"https://chat.example.test"})

    async def test_reaction_toggle_delete_tombstone_and_read_cursor(self):
        cid = (await self.conversation())["id"]
        message = await self.service.send(cid, MessageCreate(clientId=uuid4(), text="hello"))
        bob = self.as_user(self.bob)
        self.assertEqual((await bob.list_conversations())[0]["unread"], 1)
        reaction = await bob.change_message(cid, message["id"], emoji="👍")
        self.assertEqual(reaction["reactions"]["👍"], [self.bob])
        self.assertEqual((await bob.change_message(cid, message["id"], emoji="👍"))["reactions"], {})
        await bob.mark_read(cid, 999999)
        await bob.mark_read(cid, 0)
        self.assertEqual((await bob.conversation(cid))["read"][self.bob], 1)
        self.assertEqual((await bob.list_conversations())[0]["unread"], 0)
        deleted = await self.service.change_message(cid, message["id"], delete=True)
        self.assertEqual(deleted["text"], "")
        self.assertIsNotNone(deleted["deletedAt"])

    async def test_membership_revocation_and_public_channel_join(self):
        conversation = await self.conversation()
        cid = conversation["id"]
        with self.assertRaises(AppException):
            await self.as_user(self.bob).membership(cid, add=[self.charlie])
        await self.service.membership(cid, remove=self.bob)
        with self.assertRaises(AppException):
            await self.as_user(self.bob).messages(cid)
        removed = await self.db.chat_outbox.find_one({"event": "conversation.removed"})
        self.assertEqual(removed["recipients"], [self.bob])
        public_channel = await self.conversation(kind="channel", visibility="public")
        joined = await self.as_user(self.charlie).membership(public_channel["id"], join=True)
        self.assertIn(self.charlie, joined["memberIds"])
        self.assertEqual(await self.as_user(self.mallory, self.other_company).discover(), [])

    async def test_dm_is_unique_and_can_only_have_two_members(self):
        first = await self.conversation(kind="dm")
        other = await self.as_user(self.bob).create(ConversationCreate(kind="dm", memberIds=[self.alice]))
        self.assertEqual(first["id"], other["id"])
        with self.assertRaises(AppException):
            await self.service.create(ConversationCreate(kind="dm", memberIds=[self.bob, self.charlie]))

    async def test_settings_permissions_version_fencing_and_ownership_transfer(self):
        cid = (await self.conversation())["id"]
        with self.assertRaises(AppException) as error:
            await self.as_user(self.bob).update_conversation(cid, ConversationUpdate(version=1, name="Hijack"))
        self.assertEqual(error.exception.status_code, 403)
        updated = await self.service.update_conversation(cid, ConversationUpdate(version=1, name="Design team", description="Decisions"))
        self.assertEqual(updated["settingsVersion"], 2)
        self.assertEqual(updated["name"], "Design team")
        with self.assertRaises(AppException) as error:
            await self.service.update_conversation(cid, ConversationUpdate(version=1, name="Stale"))
        self.assertEqual(error.exception.status_code, 409)
        with self.assertRaises(AppException):
            await self.service.update_conversation(cid, ConversationUpdate(version=2, ownerId=self.charlie))
        await self.service.update_conversation(cid, ConversationUpdate(version=2, ownerId=self.bob))
        with self.assertRaises(AppException):
            await self.service.membership(cid, add=[self.charlie])
        await self.service.membership(cid, remove=self.alice)
        with self.assertRaises(AppException):
            await self.service.messages(cid)

    async def test_owner_must_transfer_before_leaving_and_dm_settings_are_fixed(self):
        cid = (await self.conversation())["id"]
        with self.assertRaises(AppException):
            await self.service.membership(cid, remove=self.alice)
        dm = (await self.conversation(kind="dm"))["id"]
        with self.assertRaises(AppException):
            await self.service.update_conversation(dm, ConversationUpdate(version=1, name="Rename"))

    async def test_archiving_preserves_history_but_blocks_mutations_and_discovery(self):
        cid = (await self.conversation(kind="channel", visibility="public"))["id"]
        message = await self.service.send(cid, MessageCreate(clientId=uuid4(), text="Keep history"))
        await self.service.update_conversation(cid, ConversationUpdate(version=1, archived=True))
        self.assertEqual((await self.service.messages(cid))["items"][0]["text"], "Keep history")
        self.assertEqual(await self.as_user(self.charlie).discover(), [])
        for operation in [self.service.send(cid, MessageCreate(clientId=uuid4(), text="No")),
                self.service.change_message(cid, message["id"], emoji="👍"),
                self.service.change_message(cid, message["id"], delete=True),
                self.service.membership(cid, add=[self.charlie])]:
            with self.assertRaises(AppException) as error:
                await operation
            self.assertEqual(error.exception.status_code, 409)
        await self.service.update_conversation(cid, ConversationUpdate(version=2, archived=False))
        self.assertEqual((await self.service.send(cid, MessageCreate(clientId=uuid4(), text="Restored")))["text"], "Restored")

    async def test_thread_count_updates_are_published_without_full_conversation_refresh(self):
        cid = (await self.conversation())["id"]
        parent = await self.service.send(cid, MessageCreate(clientId=uuid4(), text="Topic"))
        await self.as_user(self.bob).send(cid, MessageCreate(clientId=uuid4(), text="Reply", parentId=parent["id"]))
        event = await self.db.chat_outbox.find_one({"event": "message.updated"})
        self.assertEqual(event["data"]["replyCount"], 1)
        self.assertEqual(event["data"]["version"], 2)

    async def test_presence_keeps_other_device_online_and_expires_stale_connections(self):
        runtime = ChatRuntime()
        runtime.redis = FakeRedis(decode_responses=True)
        runtime.ready = True
        actor = self.service.actor
        try:
            await runtime.presence(actor, "browser")
            await runtime.presence(actor, "mobile")
            await runtime.offline(actor, "browser")
            self.assertEqual(await runtime.online(actor["company"], [self.alice, self.bob]), [self.alice])
            self.assertEqual(await runtime.online(str(self.other_company), [self.alice]), [])
            with patch("app.core.chat_runtime.now", return_value=now() + timedelta(seconds=51)):
                self.assertEqual(await runtime.online(actor["company"], [self.alice]), [])
            await runtime.offline(actor, "mobile")
            self.assertEqual(await runtime.online(actor["company"], [self.alice]), [])
        finally:
            await runtime.stop()

    async def test_call_connection_uses_provider_participants_and_handles_provider_failure(self):
        cid = (await self.conversation())["id"]
        settings = SimpleNamespace(LIVEKIT_URL="ws://127.0.0.1:17880", LIVEKIT_API_KEY="test-key",
            LIVEKIT_API_SECRET="local-test-secret-with-at-least-thirty-two-characters", CHAT_MAX_CALL_PARTICIPANTS=16)
        client = MagicMock()
        client.__aenter__ = AsyncMock(return_value=client)
        client.__aexit__ = AsyncMock(return_value=None)
        client.room.create_room = AsyncMock(side_effect=ConnectionError("offline"))
        client.room.list_participants = AsyncMock(return_value=SimpleNamespace(participants=[SimpleNamespace(identity=self.bob)]))
        with patch.object(chat_calls, "get_setting", return_value=settings), patch.object(chat_calls, "media_client", return_value=client):
            call = await chat_calls.start(self.service, cid, "video")
            with self.assertRaises(AppException) as error:
                await chat_calls.join(self.service, cid, call["id"])
            self.assertEqual(error.exception.status_code, 503)
            with self.assertRaises(AppException) as error:
                await chat_calls.connected(self.service, cid, call["id"])
            self.assertEqual(error.exception.status_code, 409)
            client.room.list_participants.return_value = SimpleNamespace(participants=[SimpleNamespace(identity=self.alice), SimpleNamespace(identity=self.bob)])
            connected = await chat_calls.connected(self.service, cid, call["id"])
            self.assertEqual(connected["status"], "live")
            self.assertCountEqual(connected["participants"], [self.alice, self.bob])

    async def test_pagination_reconnect_and_search(self):
        cid = (await self.conversation())["id"]
        for n in range(55):
            await self.service.send(cid, MessageCreate(clientId=uuid4(), text=f"message {n}"))
        latest = await self.service.messages(cid)
        self.assertTrue(latest["hasMore"])
        self.assertEqual([m["seq"] for m in latest["items"]], list(range(6, 56)))
        recovered = await self.service.messages(cid, after=0)
        self.assertEqual([m["seq"] for m in recovered["items"]], list(range(1, 51)))
        next_page = await self.service.messages(cid, after=50)
        self.assertEqual(len(next_page["items"]), 5)
        self.assertEqual(len((await self.service.messages(cid, search="message 54"))["items"]), 1)

    async def test_transaction_failure_rolls_back_message_counter_and_outbox(self):
        if not self.real:
            self.skipTest("Requires CHAT_TEST_MONGO_URI local replica set")
        cid = (await self.conversation())["id"]
        with patch.object(self.service, "event", side_effect=RuntimeError("simulated process failure")):
            with self.assertRaises(RuntimeError):
                await self.service.send(cid, MessageCreate(clientId=uuid4(), text="must roll back"))
        self.assertEqual(await self.db.chat_messages.count_documents({}), 0)
        self.assertEqual((await self.service.conversation(cid))["lastSeq"], 0)

    async def test_concurrent_sends_have_unique_contiguous_sequences(self):
        if not self.real:
            self.skipTest("Requires CHAT_TEST_MONGO_URI local replica set")
        cid = (await self.conversation())["id"]
        messages = await asyncio.gather(*[self.service.send(cid, MessageCreate(clientId=uuid4(), text=str(n))) for n in range(12)])
        self.assertEqual(sorted(m["seq"] for m in messages), list(range(1, 13)))
        self.assertEqual(await self.db.chat_outbox.count_documents({"event": "message.created"}), 12)

    async def test_upload_permissions_quarantine_and_deleted_attachment(self):
        cid = (await self.conversation())["id"]
        fid = ObjectId()
        await self.db.chat_files.insert_one({"_id": fid, "companyId": self.company, "conversationId": cid,
            "uploaderId": self.alice, "state": "scanning", "name": "a.pdf", "size": 10,
            "contentType": "application/pdf", "messageId": None})
        with self.assertRaises(AppException):
            await chat_storage.download(self.service, cid, str(fid))
        with self.assertRaises(AppException):
            await self.as_user(self.bob).send(cid, MessageCreate(clientId=uuid4(), attachmentIds=[str(fid)]))
        message = await self.service.send(cid, MessageCreate(clientId=uuid4(), attachmentIds=[str(fid)]))
        await self.db.chat_files.update_one({"_id": fid}, {"$set": {"state": "ready"}})
        await self.service.change_message(cid, message["id"], delete=True)
        with self.assertRaises(AppException):
            await chat_storage.download(self.as_user(self.bob), cid, str(fid))

    async def test_authentication_requires_active_user_and_company(self):
        token = {"_id": self.alice, "type": "access", "sid": "test-session", "sessionType": "web"}
        await self.db.auth_sessions.insert_one({"_id": f"{self.alice}:web", "userId": oid(self.alice),
            "sessionType": "web", "sid": "test-session", "revokedAt": None,
            "expiresAt": now() + timedelta(hours=1)})
        with patch.object(chat_auth, "verify_access_token", return_value=token):
            self.assertEqual((await chat_auth.authenticate("test"))["id"], self.alice)
            await self.db.users.update_one({"_id": oid(self.alice)}, {"$set": {"status": "suspended"}})
            with self.assertRaises(AppException):
                await chat_auth.authenticate("test")

        with patch.object(chat_auth, "verify_access_token", return_value={**token, "type": "refresh"}):
            with self.assertRaises(AppException):
                await chat_auth.authenticate("test")

    async def test_files_fail_closed_and_only_clean_scanned_bytes_are_published(self):
        cid = (await self.conversation())["id"]
        fid = ObjectId()
        await self.db.chat_files.insert_one({"_id": fid, "companyId": self.company, "conversationId": cid,
            "uploaderId": self.alice, "state": "scanning", "name": "hello.txt", "size": 5,
            "contentType": "text/plain", "messageId": None, "scanLease": now(), "attempts": 0,
            "storageKey": "quarantine/key", "sealedKey": "sealed/key"})
        s3 = MagicMock()
        s3.get_object.return_value = {"Body": io.BytesIO(b"hello")}
        config = SimpleNamespace(CHAT_S3_BUCKET="private-test", CHAT_MAX_FILE_BYTES=100)
        with patch.object(chat_storage, "storage_configured", return_value=True), \
             patch.object(chat_storage, "get_setting", return_value=config), \
             patch.object(chat_storage, "s3_client", return_value=s3), \
             patch.object(chat_storage, "scan_bytes", new=AsyncMock(return_value=True)):
            await chat_storage.scan_one(self.db)
        self.assertEqual((await self.db.chat_files.find_one({"_id": fid}))["state"], "ready")
        self.assertEqual(s3.put_object.call_args.kwargs["Body"], b"hello")
        self.assertEqual(s3.put_object.call_args.kwargs["Key"], "sealed/key")
        # A scanner outage never publishes an object or enables a download.
        await self.db.chat_files.update_one({"_id": fid}, {"$set": {"state": "scanning", "scanLease": now()}})
        s3.reset_mock()
        s3.get_object.return_value = {"Body": io.BytesIO(b"hello")}
        with patch.object(chat_storage, "storage_configured", return_value=True), \
             patch.object(chat_storage, "get_setting", return_value=config), \
             patch.object(chat_storage, "s3_client", return_value=s3), \
             patch.object(chat_storage, "scan_bytes", new=AsyncMock(side_effect=RuntimeError("scanner offline"))):
            await chat_storage.scan_one(self.db)
        self.assertEqual((await self.db.chat_files.find_one({"_id": fid}))["state"], "scanning")
        s3.put_object.assert_not_called()

    async def test_call_tokens_are_scoped_to_authorized_conversation_and_room(self):
        import jwt
        cid = (await self.conversation())["id"]
        settings = SimpleNamespace(LIVEKIT_URL="wss://test.invalid", LIVEKIT_API_KEY="test-key",
            LIVEKIT_API_SECRET="test-secret-with-at-least-thirty-two-characters", CHAT_MAX_CALL_PARTICIPANTS=16)
        client = MagicMock()
        client.__aenter__ = AsyncMock(return_value=client)
        client.__aexit__ = AsyncMock(return_value=None)
        client.room.create_room = AsyncMock()
        with patch.object(chat_calls, "get_setting", return_value=settings), patch.object(chat_calls, "media_client", return_value=client):
            call = await chat_calls.start(self.service, cid, "video")
            self.assertEqual((await chat_calls.start(self.service, cid, "voice"))["id"], call["id"])
            token = await chat_calls.join(self.as_user(self.bob), cid, call["id"])
            claims = jwt.decode(token["token"], settings.LIVEKIT_API_SECRET, algorithms=["HS256"])
            self.assertEqual(claims["sub"], self.bob)
            self.assertEqual(claims["video"]["room"], call["room"])
            self.assertTrue(claims["video"]["roomJoin"])
            self.assertFalse(claims["video"].get("roomAdmin", False))
            self.assertIn("camera", claims["video"]["canPublishSources"])
            voice_cid = (await self.conversation())["id"]
            voice = await chat_calls.start(self.service, voice_cid, "voice")
            voice_token = await chat_calls.join(self.service, voice_cid, voice["id"])
            self.assertEqual(jwt.decode(voice_token["token"], settings.LIVEKIT_API_SECRET, algorithms=["HS256"])["video"]["canPublishSources"], ["microphone"])
            with self.assertRaises(AppException):
                await chat_calls.join(self.as_user(self.charlie), cid, call["id"])
            with self.assertRaises(AppException):
                await chat_calls.join(self.as_user(self.mallory, self.other_company), cid, call["id"])
            await self.db.chat_calls.update_one({"_id": oid(call["id"])}, {"$set": {"status": "ended"}})
            with self.assertRaises(AppException):
                await chat_calls.join(self.service, cid, call["id"])

    async def test_media_reconciliation_revokes_suspended_and_foreign_users(self):
        cid = (await self.conversation())["id"]
        call = {"companyId": self.company, "conversationId": cid, "room": "private-test-room"}
        await self.db.users.update_one({"_id": oid(self.bob)}, {"$set": {"status": "suspended"}})
        client = MagicMock()
        client.room.remove_participant = AsyncMock()
        client.room.delete_room = AsyncMock()
        people = [SimpleNamespace(identity=uid) for uid in (self.alice, self.bob, self.mallory)]
        valid = await chat_calls.authorized_participants(call, people, client)
        self.assertEqual([p.identity for p in valid], [self.alice])
        self.assertEqual(client.room.remove_participant.await_count, 2)
        await self.db.companies.update_one({"_id": self.company}, {"$set": {"status": "suspended"}})
        self.assertEqual(await chat_calls.authorized_participants(call, people, client), [])
        client.room.delete_room.assert_awaited_once()

    async def test_http_contract_validates_input_and_denies_foreign_conversations(self):
        from fastapi import FastAPI
        from httpx import ASGITransport, AsyncClient
        from app.routes.chat_route import router, actor
        from app.core.exception_handler import app_exception_handler
        app = FastAPI()
        app.include_router(router)
        app.add_exception_handler(AppException, app_exception_handler)
        app.dependency_overrides[actor] = lambda: self.service.actor
        runtime = ChatRuntime()
        runtime.redis = FakeRedis(decode_responses=True)
        runtime.ready = True
        cid = (await self.conversation())["id"]
        async def transaction(instance, callback):
            return await callback(None)
        # HTTP tests use the fake transaction adapter only for mocks; real tests
        # retain the production transaction implementation.
        from contextlib import nullcontext
        transaction_patch = nullcontext() if self.real else patch.object(ChatService, "transaction", transaction)
        with patch("app.routes.chat_route.chat_runtime", runtime), transaction_patch:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                self.assertEqual((await client.post(f"/api/chat/conversations/{cid}/messages", json={"text": "no uuid"})).status_code, 422)
                response = await client.post(f"/api/chat/conversations/{cid}/messages", json={"clientId": str(uuid4()), "text": "HTTP works"})
                self.assertEqual(response.status_code, 201)
                self.assertEqual(response.json()["data"]["text"], "HTTP works")
                outsider = self.as_user(self.mallory, self.other_company)
                app.dependency_overrides[actor] = lambda: outsider.actor
                self.assertEqual((await client.get(f"/api/chat/conversations/{cid}/messages")).status_code, 404)
        await runtime.stop()

    async def test_single_use_expiring_tickets_rate_limit_and_cross_worker_delivery(self):
        cid = (await self.conversation())["id"]
        server = FakeServer()
        sender, receiver = ChatRuntime(), ChatRuntime()
        sender.redis = FakeRedis(server=server, decode_responses=True)
        receiver.redis = FakeRedis(server=server, decode_responses=True)
        sender.ready = receiver.ready = True
        ticket = await sender.ticket(self.service.actor, "not-logged-in-url")
        self.assertEqual((await receiver.consume_ticket(ticket))["actor"]["id"], self.alice)
        self.assertIsNone(await receiver.consume_ticket(ticket))
        for _ in range(2):
            await sender.limit(self.service.actor, "test", 2)
        with self.assertRaises(AppException) as error:
            await sender.limit(self.service.actor, "test", 2)
        self.assertEqual(error.exception.status_code, 429)
        socket = Socket(MagicMock(), self.as_user(self.bob).actor)
        outsider = Socket(MagicMock(), self.as_user(self.charlie).actor)
        receiver.sockets.update([socket, outsider])
        task = asyncio.create_task(receiver.listen())
        try:
            await asyncio.sleep(0.05)
            while not socket.queue.empty(): socket.queue.get_nowait()
            while not outsider.queue.empty(): outsider.queue.get_nowait()
            await sender.broadcast(self.service.actor, cid, "typing", {"userId": self.alice})
            event = await asyncio.wait_for(socket.queue.get(), 2)
            self.assertEqual(event["event"], "typing")
            self.assertTrue(outsider.queue.empty())
        finally:
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
            receiver.sockets.clear()
            await sender.stop(); await receiver.stop()

    async def test_failed_publish_retains_durable_event_and_recovers_after_restart(self):
        cid = (await self.conversation())["id"]
        await self.db.chat_outbox.delete_many({})
        await self.service.send(cid, MessageCreate(clientId=uuid4(), text="survives Redis outage"))
        runtime = ChatRuntime()
        runtime.redis = FakeRedis(decode_responses=True)
        runtime.ready = True
        with patch.object(runtime.redis, "publish", new=AsyncMock(side_effect=ConnectionError("offline"))), \
             patch("app.core.chat_runtime.log.exception"):
            task = asyncio.create_task(runtime.dispatch())
            await asyncio.sleep(0.05)
            task.cancel()
            await asyncio.gather(task, return_exceptions=True)
        event = await self.db.chat_outbox.find_one({})
        self.assertIsNone(event.get("deliveredAt"))
        self.assertEqual(event["data"]["text"], "survives Redis outage")
        await self.db.chat_outbox.update_one({"_id": event["_id"]}, {"$set": {"availableAt": now()}})
        restarted = asyncio.create_task(runtime.dispatch())
        try:
            for _ in range(50):
                if (await self.db.chat_outbox.find_one({})).get("deliveredAt"):
                    break
                await asyncio.sleep(0.01)
            self.assertIsNotNone((await self.db.chat_outbox.find_one({})).get("deliveredAt"))
        finally:
            restarted.cancel()
            await asyncio.gather(restarted, return_exceptions=True)
            await runtime.stop()

    def test_websocket_handshake_heartbeat_origin_and_ticket_replay(self):
        import json
        from contextlib import asynccontextmanager
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from starlette.websockets import WebSocketDisconnect
        from app.routes import chat_route
        runtime = ChatRuntime()
        settings = SimpleNamespace(CLIENT_URL="https://chat.example.test", CHAT_ALLOWED_ORIGINS="", ENV="production")

        @asynccontextmanager
        async def lifespan(app):
            runtime.redis = FakeRedis(decode_responses=True)
            runtime.ready = True
            await runtime.redis.set(f"{runtime.prefix}:ticket:valid", json.dumps({"token": "test-token"}), ex=30)
            yield
            await runtime.stop()

        app = FastAPI(lifespan=lifespan)
        app.include_router(chat_route.router)
        with patch.object(chat_route, "chat_runtime", runtime), \
             patch.object(chat_route, "authenticate", new=AsyncMock(return_value=self.service.actor)), \
             patch.object(chat_route, "get_setting", return_value=settings), TestClient(app) as client:
            with self.assertRaises(WebSocketDisconnect) as error:
                with client.websocket_connect("/api/chat/ws?ticket=valid", headers={"origin": "https://evil.example.test"}):
                    pass
            self.assertEqual(error.exception.code, 4403)
            with client.websocket_connect("/api/chat/ws?ticket=valid", headers={"origin": settings.CLIENT_URL}) as ws:
                self.assertEqual(ws.receive_json()["event"], "connected")
                ws.send_json({"type": "ping"})
                self.assertEqual(ws.receive_json()["event"], "pong")
                ws.send_text("not JSON")
                with self.assertRaises(WebSocketDisconnect) as error:
                    ws.receive_json()
                self.assertEqual(error.exception.code, 1007)
            with self.assertRaises(WebSocketDisconnect) as error:
                with client.websocket_connect("/api/chat/ws?ticket=valid", headers={"origin": settings.CLIENT_URL}):
                    pass
            self.assertEqual(error.exception.code, 4401)

    def test_input_contracts_and_safe_serialization(self):
        for owner in ["", "invalid-id", "   "]:
            with self.assertRaises(ValidationError):
                ConversationUpdate(version=1, ownerId=owner)
        for payload in [{"text": ""}, {"text": "x" * 10001}, {"text": "hello", "companyId": str(self.other_company)}]:
            with self.assertRaises(ValidationError):
                MessageCreate(clientId=uuid4(), **payload)
        serialized = public({"_id": ObjectId(), "companyId": self.company, "storageKey": "private", "createdAt": now()})
        self.assertNotIn("storageKey", serialized)
        self.assertNotIn("companyId", serialized)


if __name__ == "__main__":
    unittest.main()
