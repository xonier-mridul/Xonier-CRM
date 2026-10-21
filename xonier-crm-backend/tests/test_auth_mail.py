"""Real MongoDB transaction/race tests. All databases and addresses are synthetic.

AUTH_MAIL_TEST_MONGO_URI must point to a disposable LOCAL replica set. No SMTP
connection is ever made unless AUTH_MAIL_TEST_MAILPIT=1 explicitly opts into
the fixed-loopback local inbox test. No external SMTP is used by any test.
"""
import asyncio
import json
import os
import re
import unittest
from datetime import timedelta
from unittest.mock import AsyncMock, MagicMock, patch

if os.getenv("AUTH_MAIL_TEST_MONGO_URI"):
    os.environ.setdefault("COMPANY_CODE_TEST_MONGO_URI", os.environ["AUTH_MAIL_TEST_MONGO_URI"])

from chat_test_env import seed_test_settings
seed_test_settings()
import test_company_codes as company_fixtures
from bson import DBRef, ObjectId
from app.core.crypto import encryptor
from app.core.security_store import now, initialize_security_indexes
from app.core.tenant import system_query
from app.services.auth_sessions import SessionService
from app.services.auth_services import AuthServices
from app.services.credential_auth import CredentialAuth
from app.services.mail_queue import MailQueue, LostLease
from app.workers.mail_worker import MailWorker, RejectedMail, smtp_send
from app.utils.manage_tokens import verify_access_token, verify_refresh_token
from app.utils.custom_exception import AppException


@unittest.skipUnless(os.getenv("AUTH_MAIL_TEST_MONGO_URI"), "Disposable LOCAL replica set not requested")
class AuthMailTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        asyncio.get_running_loop().slow_callback_duration = 2
        self.fixture = company_fixtures.CompanyCodeMongoTests()
        await self.fixture.asyncSetUp()
        self.db = self.fixture.db
        await initialize_security_indexes(self.db)
        from beanie import init_beanie
        from app.db.models.communications.email_history_model import EmailHistoryModel
        from app.db.models.email_template_model import EmailTemplateModel
        await init_beanie(database=self.db, document_models=[EmailHistoryModel, EmailTemplateModel])
        from app.db.models.user_model import UserModel
        role_id, subscription_id = ObjectId(), ObjectId()
        await self.db.userroles.insert_one({"_id": role_id, "name": "Company Admin", "code": "COMPANY_ADMIN", "permissions": []})
        await self.db.subscriptions.insert_one({"_id": subscription_id, "subscriptionId": "test-subscription", "status": "active",
            "planId": DBRef("plans", ObjectId()), "basePrice": 1, "finalPrice": 1, "startSubscriptionDate": now()})
        await self.db.companies.update_one({"_id": self.fixture.company_id}, {"$set": {"subscription": DBRef("subscriptions", subscription_id)}})
        with system_query():
            self.user = UserModel(firstName="Alice", lastName="Demo", email="alice@example.com", phone="1234567890",
                password="Test!Password123", userRole=[role_id], companyId=self.fixture.company_id, isActive=True, isEmailVerified=True)
            await self.user.insert()
        self.owner = AuthServices()
        self.owner.client = self.fixture.client
        self.auth, self.sessions, self.queue = CredentialAuth(self.owner), SessionService(self.db), MailQueue(self.db)
        self.inputs = {"email": "alice@example.com", "password": "Test!Password123", "companyId": self.fixture.legacy}
        self.rate = self.queue.settings.MAIL_RATE_PER_SECOND
        self.queue.settings.MAIL_RATE_PER_SECOND = 1000

    async def asyncTearDown(self):
        self.queue.settings.MAIL_RATE_PER_SECOND = self.rate
        await self.fixture.asyncTearDown()

    async def begin(self, client="browser-a", **kwargs):
        result = await self.auth.begin(self.inputs, client_id=client, ip="127.0.0.1", **kwargs)
        return result, await self.code(result["challengeId"])

    async def code(self, challenge_id):
        doc = await self.db.auth_challenges.find_one({"_id": challenge_id})
        job = await self.db.email_jobs.find_one({"groupId": f"otp:{challenge_id}:{doc['generation']}"})
        payload = json.loads(encryptor.decrypt_data(job["payloadCipher"]))
        return re.search(r"\b([0-9]{6})\b", payload["text"]).group(1)

    async def sign_in(self, client="browser-a", **kwargs):
        challenge, code = await self.begin(client, **kwargs)
        return await self.auth.verify({"challengeId": challenge["challengeId"], "otp": code}, client_id=client,
                                      ip="127.0.0.1", **kwargs)

    def refresh_payload(self, tokens):
        return {**verify_refresh_token(tokens["refresh_token"]), "raw_token": tokens["refresh_token"]}

    async def test_second_verified_login_revokes_first_access_refresh_and_ws(self):
        first = await self.sign_in()
        second = await self.sign_in("browser-b")
        with self.assertRaises(AppException) as ended:
            await self.sessions.require(verify_access_token(first["access_token"]))
        self.assertEqual(ended.exception.code, "SESSION_REPLACED")
        with self.assertRaises(AppException):
            await self.auth.refresh(self.refresh_payload(first))
        await self.sessions.require(verify_access_token(second["access_token"]))
        from app.services import chat_auth
        with patch.object(chat_auth, "database", return_value=self.db):
            with self.assertRaises(AppException):
                await chat_auth.authenticate(first["access_token"])
            self.assertEqual((await chat_auth.authenticate(second["access_token"]))["id"], str(self.user.id))

    async def test_local_api_lifecycle_delivers_login_otp_without_separate_worker_command(self):
        from app.core.mail_runtime import mail_consumers
        settings = self.queue.settings.model_copy(update={"ENV": "development", "MAIL_WORKER_MODE": "auto"})
        delivered = asyncio.Event()
        received = []
        async def transport(payload, message_id, mark):
            await mark()
            received.append(payload)
            delivered.set()
        with patch("app.core.mail_runtime.get_setting", return_value=settings):
            async with mail_consumers(self.db, transport=transport):
                challenge = await self.auth.begin(self.inputs, client_id="browser-a", ip="127.0.0.1")
                self.assertEqual(await self.db.auth_challenges.count_documents({"_id": challenge["challengeId"]}), 1)
                await asyncio.wait_for(delivered.wait(), timeout=8)
                self.assertEqual(len(received), 1)
                code = re.search(r"\b([0-9]{6})\b", received[0]["text"]).group(1)
                signed_in = await self.auth.verify({"challengeId": challenge["challengeId"], "otp": code}, client_id="browser-a")
                await self.sessions.require(verify_access_token(signed_in["access_token"]))
        self.assertEqual((await self.db.email_jobs.find_one({"kind": "otp"}))["state"], "sent")

    async def test_stopping_local_consumers_leaves_new_jobs_durable_for_restart(self):
        from app.core.mail_runtime import mail_consumers
        settings = self.queue.settings.model_copy(update={"ENV": "development", "MAIL_WORKER_MODE": "auto"})
        transport = AsyncMock()
        with patch("app.core.mail_runtime.get_setting", return_value=settings):
            async with mail_consumers(self.db, transport=transport):
                pass
        await self.begin()
        await asyncio.sleep(0.05)
        transport.assert_not_awaited()
        self.assertEqual(await self.db.email_jobs.count_documents({"state": "queued"}), 1)

    @unittest.skipUnless(os.getenv("AUTH_MAIL_TEST_MAILPIT") == "1", "Local Mailpit test not requested")
    async def test_real_local_inbox_delivers_and_verifies_login_otp(self):
        import httpx
        challenge = await self.auth.begin(self.inputs, client_id="browser-a", ip="127.0.0.1")
        self.assertEqual(await self.db.auth_challenges.count_documents({"_id": challenge["challengeId"]}), 1)
        settings = self.queue.settings.model_copy(update={"ENV": "development", "MAIL_DELIVERY_MODE": "mailpit",
            "MAIL_DEV_SMTP_PORT": 1025})
        with patch("app.workers.mail_worker.get_setting", return_value=settings):
            await MailWorker(self.db, "critical").once()
        job = await self.db.email_jobs.find_one({"kind": "otp"})
        self.assertEqual(job["state"], "sent")
        async with httpx.AsyncClient(base_url="http://127.0.0.1:8025", trust_env=False, timeout=5) as inbox:
            response = await inbox.get("/api/v1/search", params={"query": f"message-id:{job['_id']}@trakeroo-mail"})
            response.raise_for_status()
            messages = response.json()["messages"]
            self.assertEqual(len(messages), 1)
            message_id = messages[0]["ID"]
            try:
                message = await inbox.get(f"/api/v1/message/{message_id}")
                message.raise_for_status()
                code = re.search(r"\b([0-9]{6})\b", message.json()["Text"]).group(1)
                tokens = await self.auth.verify({"challengeId": challenge["challengeId"], "otp": code}, client_id="browser-a")
                await self.sessions.require(verify_access_token(tokens["access_token"]))
            finally:
                # Delete only the synthetic message created by this test.
                cleanup = await inbox.request("DELETE", "/api/v1/messages", json={"IDs": [message_id]})
                cleanup.raise_for_status()

    async def test_admin_otp_history_includes_login_challenges_without_exposing_secrets(self):
        from app.services.otp_service import OTPService
        challenge, code = await self.begin()
        history = OTPService()
        with self.assertRaises(AppException) as denied:
            await history.get_all_otp({"userRole": [{"code": "COMPANY_ADMIN"}]}, {})
        self.assertEqual(denied.exception.status_code, 403)
        result = await history.get_all_otp({"userRole": [{"code": "SUPER_ADMIN"}]}, {})
        self.assertEqual(result["total"], 1)
        row = result["data"][0]
        self.assertEqual(row["encrypt_mail"], "alice@example.com")
        self.assertEqual(row["otp_type"], "login")
        self.assertEqual(row["otp"], "")
        self.assertEqual(row["encrypt_opt"], "")
        self.assertNotIn(challenge["challengeId"], json.dumps(result))
        for secret in ("otpHash", "passwordFingerprint", "clientHash", "payloadCipher"):
            self.assertNotIn(secret, row)
        self.assertEqual((await history.get_all_otp({"userRole": [{"code": "SUPER_ADMIN"}]}, {"page": 2}))["data"], [])

    async def test_smtp_rejection_keeps_only_safe_code_and_category_for_diagnosis(self):
        await self.begin()
        async def transport(payload, message_id, mark):
            await mark()
            raise RejectedMail(550, "recipient_rejected")
        await MailWorker(self.db, "critical", transport).once()
        job = await self.db.email_jobs.find_one({"kind": "otp"})
        self.assertEqual(job["state"], "failed")
        self.assertEqual(job["errorCode"], 550)
        self.assertEqual(job["errorCategory"], "recipient_rejected")
        self.assertEqual(job["error"], "RejectedMail")

    async def test_starting_or_failing_login_does_not_evict_current_session(self):
        first = await self.sign_in()
        challenge, code = await self.begin("browser-b")
        with self.assertRaises(AppException):
            await self.auth.verify({"challengeId": challenge["challengeId"], "otp": "000000"}, client_id="browser-b")
        await self.sessions.require(verify_access_token(first["access_token"]))
        self.assertEqual(await self.db.auth_sessions.count_documents({"_id": self.sessions.key(self.user.id)}), 1)

    async def test_switch_cooldown_cannot_be_bypassed_with_spoofed_device_id(self):
        await self.sign_in()
        active = await self.sign_in("browser-b")
        for client in ["browser-a", "browser-b"]:
            with self.assertRaises(AppException) as blocked:
                await self.begin(client)
            self.assertEqual(blocked.exception.code, "TAKEOVER_LIMITED")
        await self.sessions.require(verify_access_token(active["access_token"]))

    async def test_repeated_switches_trigger_longer_lock_without_logging_out_incumbent(self):
        active = await self.sign_in()
        for index in range(3):
            await self.db.auth_sessions.update_one({"_id": self.sessions.key(self.user.id)}, {"$set": {"switchBlockedUntil": now() - timedelta(seconds=1)}})
            active = await self.sign_in(f"browser-{index}")
        session = await self.db.auth_sessions.find_one({"_id": self.sessions.key(self.user.id)})
        self.assertGreater((session["switchBlockedUntil"].replace(tzinfo=now().tzinfo) - now()).total_seconds(), 1500)
        await self.sessions.require(verify_access_token(active["access_token"]))

    async def test_otp_expiry_replay_attempt_limit_and_client_binding(self):
        challenge, code = await self.begin()
        data = {"challengeId": challenge["challengeId"], "otp": code}
        with self.assertRaises(AppException):
            await self.auth.verify(data, client_id="different-browser")
        for _ in range(5):
            with self.assertRaises(AppException):
                await self.auth.verify({**data, "otp": "000000"}, client_id="browser-a")
        with self.assertRaises(AppException):
            await self.auth.verify(data, client_id="browser-a")
        self.assertEqual(await self.db.auth_sessions.count_documents({}), 0)
        challenge, code = await self.begin("fresh-browser")
        await self.db.auth_challenges.update_one({"_id": challenge["challengeId"]}, {"$set": {"expiresAt": now() - timedelta(seconds=1)}})
        with self.assertRaises(AppException):
            await self.auth.verify({"challengeId": challenge["challengeId"], "otp": code}, client_id="fresh-browser")

    async def test_concurrent_otp_verification_has_one_winner(self):
        challenge, code = await self.begin()
        command = {"challengeId": challenge["challengeId"], "otp": code}
        results = await asyncio.gather(*[self.auth.verify(command, client_id="browser-a") for _ in range(2)], return_exceptions=True)
        self.assertEqual(sum(isinstance(result, dict) for result in results), 1)
        self.assertEqual(await self.db.auth_sessions.count_documents({"revokedAt": None}), 1)
        with self.assertRaises(AppException):
            await self.auth.verify(command, client_id="browser-a")

    async def test_refresh_rotation_is_single_flight_safe_and_old_session_cannot_return(self):
        tokens = await self.sign_in()
        payload = self.refresh_payload(tokens)
        left, right = await asyncio.gather(self.auth.refresh(payload), self.auth.refresh(payload))
        self.assertEqual(left["refresh_token"], right["refresh_token"])
        self.assertNotEqual(left["refresh_token"], tokens["refresh_token"])
        self.assertEqual(verify_access_token(left["access_token"])["sid"], verify_access_token(tokens["access_token"])["sid"])

    async def test_late_logout_from_old_browser_cannot_revoke_new_login(self):
        old = await self.sign_in()
        active = await self.sign_in("browser-b")
        with system_query(), self.assertRaises(AppException):
            await self.owner.logout(str(self.user.id), session_id=verify_access_token(old["access_token"])["sid"])
        await self.sessions.require(verify_access_token(active["access_token"]))

    async def test_password_reset_consumes_otp_revokes_sessions_and_clears_switch_lock(self):
        old = await self.sign_in()
        result = await self.auth.forgot(self.inputs, client_id="browser-a")
        code = await self.code(result["challengeId"])
        command = {"challengeId": result["challengeId"], "otp": code, "password": "New!Password123"}
        await self.auth.recover_password(command, client_id="browser-a")
        with self.assertRaises(AppException):
            await self.sessions.require(verify_access_token(old["access_token"]))
        with self.assertRaises(AppException):
            await self.auth.recover_password(command, client_id="browser-a")
        self.assertIsNone((await self.db.auth_sessions.find_one({"_id": self.sessions.key(self.user.id)}))["switchBlockedUntil"])

    async def test_resend_supersedes_code_and_queue_job_in_same_transaction(self):
        result, old_code = await self.begin()
        await self.db.auth_challenges.update_one({"_id": result["challengeId"]}, {"$set": {"sentAt": now() - timedelta(seconds=61)}})
        await self.auth.resend({"challengeId": result["challengeId"]}, client_id="browser-a")
        new_code = await self.code(result["challengeId"])
        old_job = await self.db.email_jobs.find_one({"groupId": f"otp:{result['challengeId']}:1"})
        self.assertFalse(await self.queue.valid_otp(old_job))
        if new_code != old_code:
            with self.assertRaises(AppException):
                await self.auth.verify({"challengeId": result["challengeId"], "otp": old_code}, client_id="browser-a")

    async def test_failed_outbox_write_rolls_back_challenge(self):
        with patch.object(self.auth.mail, "enqueue", AsyncMock(side_effect=RuntimeError("synthetic failure"))):
            with self.assertRaises(RuntimeError):
                await self.begin()
        self.assertEqual(await self.db.auth_challenges.count_documents({}), 0)

    async def test_queue_is_durable_encrypted_idempotent_and_hides_bcc(self):
        payload = dict(to=["to@example.com"], cc=["cc@example.com"], bcc=["hidden@example.com"],
            subject="Synthetic confidential subject", html="<p>Private message</p>", key="test-idempotent")
        first, second = await self.queue.enqueue(**payload), await self.queue.enqueue(**payload)
        self.assertEqual(first["jobIds"], second["jobIds"])
        self.assertEqual(await self.db.email_jobs.count_documents({}), 3)
        async for job in self.db.email_jobs.find({}):
            self.assertNotIn("Private message", str(job))
            self.assertNotIn("hidden@example.com", str(job))
        smtp = MagicMock()
        smtp.connect = AsyncMock(); smtp.login = AsyncMock(); smtp.send_message = AsyncMock()
        job = await self.db.email_jobs.find_one({})
        with patch("app.workers.mail_worker.aiosmtplib.SMTP", return_value=smtp):
            await smtp_send(json.loads(encryptor.decrypt_data(job["payloadCipher"])), job["_id"], AsyncMock())
        self.assertIsNone(smtp.send_message.call_args.args[0]["Bcc"])
        self.assertEqual(len(smtp.send_message.call_args.kwargs["recipients"]), 1)

    async def test_concurrent_workers_do_not_send_one_job_twice(self):
        await self.queue.enqueue(to=["to@example.com"], subject="Synthetic", html="<p>test</p>")
        transport = AsyncMock(side_effect=lambda payload, message_id, mark: None)
        async def deliver(payload, message_id, mark):
            await mark()
        transport.side_effect = deliver
        workers = [MailWorker(self.db, "general", transport) for _ in range(2)]
        await asyncio.gather(*(worker.once() for worker in workers))
        self.assertEqual(transport.await_count, 1)
        self.assertEqual(await self.db.email_jobs.count_documents({"state": "sent"}), 1)

    async def test_safe_failure_retries_with_backoff_and_permanent_failure_does_not(self):
        for code, expected in [(451, "queued"), (550, "failed")]:
            result = await self.queue.enqueue(to=["to@example.com"], subject="Synthetic", html="test")
            worker = MailWorker(self.db, "general", AsyncMock(side_effect=RejectedMail(code)))
            await worker.once()
            job = await self.db.email_jobs.find_one({"_id": result["jobIds"][0]})
            self.assertEqual(job["state"], expected)
            if code == 451:
                self.assertGreater(job["availableAt"].replace(tzinfo=now().tzinfo), now())

    async def test_uncertain_smtp_delivery_is_not_automatically_resent(self):
        await self.queue.enqueue(to=["to@example.com"], subject="Synthetic", html="test")
        async def ambiguous(payload, message_id, mark):
            await mark()
            raise OSError("synthetic disconnect after DATA")
        transport = AsyncMock(side_effect=ambiguous)
        worker = MailWorker(self.db, "general", transport)
        await worker.once(); await worker.once()
        self.assertEqual(transport.await_count, 1)
        self.assertEqual(await self.db.email_jobs.count_documents({"state": "uncertain"}), 1)

    async def test_crash_recovery_fences_old_worker_and_does_not_retry_dispatching(self):
        await self.queue.enqueue(to=["to@example.com"], subject="Synthetic", html="test")
        claimed = await self.queue.claim("old-worker", "general")
        await self.db.email_jobs.update_one({"_id": claimed["_id"]}, {"$set": {"leaseUntil": now() - timedelta(seconds=1)}})
        await self.queue.recover()
        current = await self.queue.claim("new-worker", "general")
        with self.assertRaises(LostLease):
            await self.queue.dispatching(claimed)
        await self.queue.dispatching(current)
        await self.db.email_jobs.update_one({"_id": current["_id"]}, {"$set": {"leaseUntil": now() - timedelta(seconds=1)}})
        await self.queue.recover()
        self.assertEqual((await self.db.email_jobs.find_one({"_id": current["_id"]}))["state"], "uncertain")

    async def test_expired_or_used_otp_is_never_delivered(self):
        challenge, code = await self.begin()
        await self.auth.verify({"challengeId": challenge["challengeId"], "otp": code}, client_id="browser-a")
        transport = AsyncMock()
        await MailWorker(self.db, "critical", transport).once()
        transport.assert_not_awaited()
        self.assertEqual(await self.db.email_jobs.count_documents({"state": "expired"}), 1)

    async def test_web_and_mobile_slots_replace_independently_and_preserve_pairing(self):
        web_a = await self.sign_in("browser-a")
        mobile_a = await self.sign_in("phone-a", session_type="mobile")
        await self.sessions.require(verify_access_token(web_a["access_token"]))
        await self.sessions.require(verify_access_token(mobile_a["access_token"]))
        web_b = await self.sign_in("browser-b")
        with self.assertRaises(AppException):
            await self.sessions.require(verify_access_token(web_a["access_token"]))
        await self.sessions.require(verify_access_token(mobile_a["access_token"]))
        # Web cooldown must not prevent a mobile takeover.
        mobile_b = await self.sign_in("phone-b", session_type="mobile")
        with self.assertRaises(AppException):
            await self.auth.refresh(self.refresh_payload(mobile_a))
        await self.sessions.require(verify_access_token(web_b["access_token"]))
        await self.sessions.require(verify_access_token(mobile_b["access_token"]))
        self.assertEqual(await self.db.auth_sessions.count_documents({"userId": self.user.id, "revokedAt": None}), 2)
        with system_query():
            await self.owner.logout(str(self.user.id), session_id=verify_access_token(mobile_b["access_token"])["sid"])
        await self.sessions.require(verify_access_token(web_b["access_token"]))
        with self.assertRaises(AppException):
            await self.sessions.require(verify_access_token(mobile_b["access_token"]))

    async def test_password_recovery_and_company_disable_revoke_both_slots(self):
        web = await self.sign_in()
        mobile = await self.sign_in("phone", session_type="mobile")
        with system_query():
            await self.fixture.service.update_status(str(self.fixture.company_id), "suspended", self.fixture.admin)
            await self.fixture.service.update_status(str(self.fixture.company_id), "active", self.fixture.admin)
        for tokens in [web, mobile]:
            with self.assertRaises(AppException):
                await self.sessions.require(verify_access_token(tokens["access_token"]))
        web = await self.sign_in()
        mobile = await self.sign_in("phone", session_type="mobile")
        recovery = await self.auth.forgot(self.inputs, client_id="browser-a")
        await self.auth.recover_password({"challengeId": recovery["challengeId"], "otp": await self.code(recovery["challengeId"]),
            "password": "Recovery!12345"}, client_id="browser-a")
        for tokens in [web, mobile]:
            with self.assertRaises(AppException):
                await self.sessions.require(verify_access_token(tokens["access_token"]))

    async def test_concurrent_queue_idempotency_conflict_and_transaction_rollback(self):
        payload = dict(to=["a@example.com"], subject="Synthetic", html="test", key="same-intent")
        left, right = await asyncio.gather(self.queue.enqueue(**payload), self.queue.enqueue(**payload))
        self.assertEqual(left["jobIds"], right["jobIds"])
        for changed in [{"html": "different"}, {"to": ["b@example.com"]}]:
            with self.assertRaises(AppException) as conflict:
                await self.queue.enqueue(**{**payload, **changed})
            self.assertEqual(conflict.exception.status_code, 409)
        self.assertEqual(await self.db.email_jobs.count_documents({}), 1)

    async def test_email_history_and_jobs_are_atomic_idempotent_and_cancel_safely(self):
        from app.services.communication.email_service import EmailService
        service = EmailService()
        user = {"_id": str(self.user.id), "firstName": "Alice", "companyId": str(self.fixture.company_id)}
        payload = {"to_emails": ["a@example.com", "b@example.com"], "_request_key": "history-same"}
        rendered = {"subject": "Synthetic", "html": "<p>test</p>", "text": "test"}
        with system_query():
            left, right = await asyncio.gather(*[service._enqueue_rendered(None, rendered, {}, payload, user) for _ in range(2)])
            self.assertEqual(left["_id"], right["_id"])
            self.assertEqual(await self.db.email_history.count_documents({}), 1)
            with self.assertRaises(AppException):
                await service._enqueue_rendered(None, {**rendered, "subject": "changed"}, {}, payload, user)
            await service.delete(left["_id"], user)
            with self.assertRaises(AppException):
                await service._enqueue_rendered(None, rendered, {}, payload, user)
        self.assertEqual(await self.db.email_jobs.count_documents({"state": "cancelled"}), 2)
        self.assertEqual(await self.db.email_history.count_documents({}), 0)
        with system_query(), patch.object(MailQueue, "enqueue", AsyncMock(side_effect=RuntimeError("synthetic"))):
            with self.assertRaises(RuntimeError):
                await service._enqueue_rendered(None, rendered, {}, {**payload, "_request_key": "will-rollback"}, user)
        self.assertEqual(await self.db.email_history.count_documents({}), 0)

    async def test_parallel_recipient_completion_updates_history_and_inflight_delete_is_denied(self):
        from app.services.communication.email_service import EmailService
        service = EmailService()
        user = {"_id": str(self.user.id), "companyId": str(self.fixture.company_id)}
        with system_query():
            history = await service._enqueue_rendered(None, {"subject": "Synthetic", "html": "test", "text": "test"}, {},
                {"to_emails": ["a@example.com", "b@example.com"]}, user)
            a, b = await asyncio.gather(self.queue.claim("a", "general"), self.queue.claim("b", "general"))
            with self.assertRaises(AppException) as blocked:
                await service.delete(history["_id"], user)
            self.assertEqual(blocked.exception.status_code, 409)
        await asyncio.gather(self.queue.finish(a, "sent"), self.queue.finish(b, "sent"))
        self.assertEqual((await self.db.email_history.find_one({"_id": ObjectId(history["_id"])}))["status"], "sent")

    async def test_operations_are_redacted_and_uncertain_retry_requires_acknowledgement(self):
        from app.services.mail_operations import MailOperations
        receipt = await self.queue.enqueue(to=["private@example.com"], subject="Private subject", html="Private body")
        job = await self.queue.claim("worker", "general")
        await self.queue.finish(job, "uncertain", error="synthetic")
        operations = MailOperations(self.db)
        overview = await operations.overview()
        self.assertNotIn("private@example.com", str(overview))
        self.assertEqual(overview["requiresReview"], 1)
        with self.assertRaises(AppException):
            await operations.redrive(job["_id"], {"userRole": [{"code": "COMPANY_ADMIN"}]}, True)
        with self.assertRaises(AppException):
            await operations.redrive(job["_id"], self.fixture.admin)
        await operations.redrive(receipt["jobIds"][0], self.fixture.admin, True)
        self.assertEqual((await self.db.email_jobs.find_one({"_id": job["_id"]}))["state"], "queued")

    async def test_http_cookies_native_contract_type_fencing_and_replacement_codes(self):
        from fastapi import FastAPI
        import httpx
        from app.routes import auth_routes, mobile_auth_route
        from app.middlewares.auth_middleware import AuthMiddleware
        from app.middlewares.tanent_middleware import TenantMiddleware
        from app.core.exception_handler import app_exception_handler
        app = FastAPI()
        app.add_middleware(TenantMiddleware)
        app.add_middleware(AuthMiddleware)
        app.add_exception_handler(AppException, app_exception_handler)
        app.include_router(auth_routes.router, prefix="/api/auth")
        app.include_router(mobile_auth_route.router, prefix="/api/auth/mobile")
        transport = httpx.ASGITransport(app=app)
        with patch.object(auth_routes.auth_controller, "service", self.owner):
            async with httpx.AsyncClient(transport=transport, base_url="http://test", headers={"X-Client-ID": "web-http"}) as browser, \
                    httpx.AsyncClient(transport=transport, base_url="http://test", headers={"X-Client-ID": "phone-http"}) as phone, \
                    httpx.AsyncClient(transport=transport, base_url="http://test", headers={"X-Client-ID": "second-web"}) as other:
                result = await browser.post("/api/auth/login", json=self.inputs)
                self.assertEqual(result.status_code, 200, result.text)
                challenge = result.json()["data"]["challengeId"]
                login = await browser.post("/api/auth/verify-login-otp", json={"challengeId": challenge, "otp": int(await self.code(challenge))})
                self.assertEqual(login.status_code, 200, login.text)
                self.assertNotIn("accessToken", login.json()["data"])
                self.assertNotIn("refreshToken", login.json()["data"])
                self.assertTrue(any("HttpOnly" in value for value in login.headers.get_list("set-cookie")))
                self.assertEqual(login.headers["cache-control"], "no-store")
                native = await phone.post("/api/auth/mobile/login", json=self.inputs)
                self.assertEqual(native.status_code, 200, native.text)
                challenge = native.json()["data"]["challengeId"]
                native = await phone.post("/api/auth/mobile/verify-login-otp", json={"challengeId": challenge, "otp": int(await self.code(challenge))})
                self.assertEqual(native.status_code, 200, native.text)
                self.assertNotIn("set-cookie", native.headers)
                tokens = native.json()["data"]
                self.assertEqual(verify_access_token(tokens["accessToken"])["sessionType"], "mobile")
                phone.headers["Authorization"] = "Bearer " + tokens["accessToken"]
                self.assertEqual((await browser.get("/api/auth/session")).status_code, 200)
                self.assertEqual((await phone.get("/api/auth/session")).status_code, 200)
                spoof = await browser.post("/api/auth/mobile/login", json=self.inputs, headers={"Origin": "http://test"})
                self.assertEqual(spoof.status_code, 403)
                wrong = await phone.post("/api/auth/refresh", json={"refreshToken": tokens["refreshToken"]})
                self.assertEqual(wrong.status_code, 403)
                refreshed = await phone.post("/api/auth/mobile/refresh", json={"refreshToken": tokens["refreshToken"]})
                self.assertEqual(refreshed.status_code, 200, refreshed.text)
                phone.headers["Authorization"] = "Bearer " + refreshed.json()["data"]["accessToken"]
                result = await other.post("/api/auth/login", json={**self.inputs, "sessionType": "mobile"}, headers={"User-Agent": "Android"})
                challenge = result.json()["data"]["challengeId"]
                result = await other.post("/api/auth/verify-login-otp", json={"challengeId": challenge, "otp": int(await self.code(challenge))})
                self.assertEqual(verify_access_token(other.cookies["accessToken"])["sessionType"], "web")
                ended = await browser.get("/api/auth/session")
                self.assertEqual(ended.status_code, 401, ended.text)
                self.assertEqual(ended.json()["error"]["code"], "SESSION_REPLACED")
                self.assertEqual((await phone.get("/api/auth/session")).status_code, 200)
                blocked = await browser.post("/api/auth/login", json=self.inputs)
                self.assertEqual(blocked.status_code, 429, blocked.text)
                self.assertIn("retry-after", blocked.headers)

    async def test_admin_uses_real_challenge_not_hardcoded_otp(self):
        role_id = ObjectId()
        await self.db.userroles.insert_one({"_id": role_id, "name": "Super Admin", "code": "SUPER_ADMIN", "permissions": []})
        await self.db.users.update_one({"_id": self.user.id}, {"$set": {"userRole": [DBRef("userroles", role_id)], "companyId": None}})
        with patch("app.services.credential_auth.secrets.randbelow", return_value=445566):
            challenge, code = await self.begin(admin=True)
        self.assertEqual(code, "545566")
        with self.assertRaises(AppException):
            await self.auth.verify({"challengeId": challenge["challengeId"], "otp": "123456"}, admin=True, client_id="browser-a")
        result = await self.auth.verify({"challengeId": challenge["challengeId"], "otp": code}, admin=True, client_id="browser-a")
        self.assertEqual(result["user"]["userRole"][0]["code"], "SUPER_ADMIN")

    async def test_registration_code_is_hashed_single_use_and_email_bound(self):
        from app.schemas.company_schema import VerifyCompanyOtpSchema
        await self.db.users.update_one({"_id": self.user.id}, {"$set": {"isEmailVerified": False}})
        await self.fixture.service._issue_otp(self.user, "alice@example.com")
        doc = await self.db.otps.find_one({"email": "alice@example.com"})
        job = await self.db.email_jobs.find_one({"groupId": f"company-verification:{doc['_id']}"})
        payload = json.loads(encryptor.decrypt_data(job["payloadCipher"]))
        code = re.search(r"\b([0-9]{6})\b", payload["text"]).group(1)
        self.assertTrue(doc["otp"].startswith("sha256:"))
        self.assertNotIn(code, str(doc))
        from app.services.otp_service import OTPService
        with system_query():
            listing = await OTPService().get_all_otp(self.fixture.admin, {})
        self.assertEqual(listing["data"][0]["otp"], "")
        self.assertEqual(listing["data"][0]["encrypt_opt"], "")
        with self.assertRaises(AppException):
            await self.fixture.service.verify_otp(VerifyCompanyOtpSchema(userId=str(self.user.id), email="other@example.com", otp=int(code)))
        command = VerifyCompanyOtpSchema(userId=str(self.user.id), email="alice@example.com", otp=int(code))
        await self.fixture.service.verify_otp(command)
        with self.assertRaises(AppException):
            await self.fixture.service.verify_otp(command)
        self.assertFalse(await self.queue.valid_otp(job))

    async def test_mobile_socket_closes_when_only_mobile_slot_is_replaced(self):
        from fastapi import FastAPI
        from app.routes import call_route
        web = await self.sign_in()
        phone = await self.sign_in("phone", session_type="mobile")
        app = FastAPI()
        app.include_router(call_route.mobile_router, prefix="/api/mobile")
        incoming, outgoing = asyncio.Queue(), asyncio.Queue()
        scope = {"type": "websocket", "asgi": {"version": "3.0", "spec_version": "2.4"},
            "scheme": "ws", "path": "/api/mobile/ws", "raw_path": b"/api/mobile/ws", "query_string": b"",
            "root_path": "", "headers": [(b"authorization", f"Bearer {phone['access_token']}".encode())],
            "client": ("127.0.0.1", 2000), "server": ("127.0.0.1", 8001), "subprotocols": []}
        with patch.object(call_route.callService, "pending_for_agent", AsyncMock(return_value=None)):
            task = asyncio.create_task(app(scope, incoming.get, outgoing.put))
            try:
                await incoming.put({"type": "websocket.connect"})
                self.assertEqual((await asyncio.wait_for(outgoing.get(), 3))["type"], "websocket.accept")
                self.assertEqual(json.loads((await asyncio.wait_for(outgoing.get(), 3))["text"])["event"], "connected")
                await self.sign_in("phone-b", session_type="mobile")
                closed = await asyncio.wait_for(outgoing.get(), 7)
                self.assertEqual(closed["type"], "websocket.close")
                self.assertEqual(closed["code"], 4401)
                await self.sessions.require(verify_access_token(web["access_token"]))
            finally:
                await incoming.put({"type": "websocket.disconnect", "code": 1000})
                await asyncio.wait_for(task, 3)

    async def test_password_change_queues_notice_and_revokes_both_sessions(self):
        web, phone = await self.sign_in(), await self.sign_in("phone", session_type="mobile")
        await self.owner.reset_password(str(self.user.id), {"oldPassword": self.inputs["password"], "newPassword": "Changed!12345"})
        for tokens in [web, phone]:
            with self.assertRaises(AppException):
                await self.sessions.require(verify_access_token(tokens["access_token"]))
        self.assertEqual(await self.db.email_jobs.count_documents({"kind": "security"}), 1)


if __name__ == "__main__":
    unittest.main()
