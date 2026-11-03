"""FCM reminder contract and durable-outbox checks without network or MongoDB."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import AsyncMock, Mock, patch

from bson import ObjectId

from chat_test_env import seed_test_settings

seed_test_settings()

from app.core.security import hash_value
from app.schemas.user_schema import UserLoginSchema
from app.services.auth_services import AuthServices
from app.services.follow_up_push_service import FollowUpPushService, build_message
from app.services.push_token_service import PushTokenService, token_digest


class FakeSession:
    def start_transaction(self):
        pass

    async def commit_transaction(self):
        pass

    async def abort_transaction(self):
        pass

    async def end_session(self):
        pass


class PushContractTests(TestCase):
    def test_login_accepts_optional_real_token_and_rejects_placeholder(self):
        password = "Test1234!"
        data = {"companyId": "COMP-1", "email": "user@example.com", "password": password}
        self.assertIsNone(UserLoginSchema(**data).fcm)
        self.assertEqual(UserLoginSchema(**data, fcm=" device:token ").fcm, "device:token")
        with self.assertRaises(ValueError):
            UserLoginSchema(**data, fcm="placeholder")

    def test_fcm_message_is_android_data_only_and_apple_alert(self):
        class Messaging:
            @staticmethod
            def Message(**kwargs): return kwargs
            @staticmethod
            def AndroidConfig(**kwargs): return kwargs
            @staticmethod
            def APNSConfig(**kwargs): return kwargs
            @staticmethod
            def APNSPayload(**kwargs): return kwargs
            @staticmethod
            def Aps(**kwargs): return kwargs
            @staticmethod
            def ApsAlert(**kwargs): return kwargs

        now = datetime.now(timezone.utc)
        job = {"_id": ObjectId(), "leadId": ObjectId(), "userId": ObjectId(),
               "companyId": ObjectId(), "version": 2,
               "scheduledAt": now - timedelta(seconds=2),
               "expiresAt": now + timedelta(minutes=15)}
        message = build_message(Messaging, "test-token", job, "Test Lead", now)
        self.assertNotIn("notification", message)
        self.assertNotIn("notification", message["android"])
        self.assertEqual(message["android"]["priority"], "high")
        self.assertEqual(message["data"]["type"], "follow_up_due")
        self.assertEqual(message["data"]["version"], "2")
        self.assertTrue(all(isinstance(value, str) for value in message["data"].values()))
        aps = message["apns"]["payload"]["aps"]
        self.assertEqual(aps["sound"], "follow_up_alarm.caf")
        self.assertEqual(aps["category"], "lead-follow-up-actions")
        self.assertEqual(aps["alert"]["body"], "You have a scheduled lead follow-up.")


class PushPersistenceTests(IsolatedAsyncioTestCase):
    async def test_schedule_and_cancel_increment_version(self):
        collection = Mock(update_one=AsyncMock())
        service = FollowUpPushService()
        service._reminders = Mock(return_value=collection)
        lead_id, company_id, owner_id = ObjectId(), ObjectId(), ObjectId()
        due = datetime.now(timezone.utc) + timedelta(hours=1)
        await service.sync(lead_id=lead_id, company_id=company_id, owner_id=owner_id, follow_up_at=due)
        schedule_update = collection.update_one.call_args.args[1]
        self.assertEqual(schedule_update["$inc"], {"version": 1})
        self.assertEqual(schedule_update["$set"]["expiresAt"], due + timedelta(minutes=15))
        self.assertEqual(schedule_update["$set"]["status"], "pending")
        await service.sync(lead_id=lead_id, company_id=company_id, owner_id=None, follow_up_at=None)
        cancel_update = collection.update_one.call_args.args[1]
        self.assertEqual(cancel_update["$inc"], {"version": 1})
        self.assertEqual(cancel_update["$set"]["status"], "cancelled")

    async def test_token_binding_is_tenant_scoped_and_case_sensitive(self):
        collection = Mock(delete_many=AsyncMock(), update_one=AsyncMock())
        service = PushTokenService()
        service._collection = Mock(return_value=collection)
        user_id, company_id = ObjectId(), ObjectId()
        with patch("app.services.push_token_service.encryptor.encrypt_data", return_value="encrypted"):
            await service.bind(user_id, company_id, "AbC:token")
        self.assertNotEqual(token_digest("AbC:token"), token_digest("abc:token"))
        lookup = collection.update_one.call_args.args[0]
        self.assertEqual(lookup, {"userId": user_id, "companyId": company_id})
        self.assertEqual(collection.update_one.call_args.args[1]["$set"]["tokenEncrypted"], "encrypted")

    async def test_edited_or_wrong_recipient_job_never_reaches_fcm(self):
        now = datetime.now(timezone.utc)
        job = {"_id": ObjectId(), "leadId": ObjectId(), "companyId": ObjectId(),
               "userId": ObjectId(), "version": 3, "scheduledAt": now,
               "expiresAt": now + timedelta(minutes=15)}
        reminders = Mock(find_one=AsyncMock(return_value=None), update_one=AsyncMock())
        service = FollowUpPushService()
        service._reminders = Mock(return_value=reminders)
        service._db = Mock()
        await service._deliver(job, "old-claim")
        service._db.assert_not_called()

        reminders.find_one.return_value = job
        lead_collection = Mock(find_one=AsyncMock(return_value=None))
        user_collection = Mock(find_one=AsyncMock(return_value={"_id": job["userId"]}))
        service._db.return_value = {"leads": lead_collection, "users": user_collection}
        await service._deliver(job, "current-claim")
        self.assertEqual(reminders.update_one.call_args.args[1]["$set"]["status"], "cancelled")

    async def test_otp_verification_binds_pending_token_only_after_valid_code(self):
        service = AuthServices.__new__(AuthServices)
        service.client = Mock(start_session=AsyncMock(return_value=FakeSession()))
        company_id, user_id = ObjectId(), ObjectId()
        company = SimpleNamespace(id=company_id, status="active", subscription=SimpleNamespace(status="active"))
        user = Mock(id=user_id, companyId=company_id, firstName="Test", lastName="User", email="encrypted")
        user.compare_password.return_value = True
        user.generate_access_token.return_value = "test-access"
        user.generate_refresh_token.return_value = "test-refresh"
        user.set = AsyncMock()
        service.companyRepo = Mock(find_company_by_companyId=AsyncMock(return_value=company))
        service.repo = Mock(find_user_by_hashMail_and_companyId=AsyncMock(return_value=user),
                            find_by_id_nested=AsyncMock(return_value={"firstName": "Test", "lastName": "User"}))
        otp = SimpleNamespace(otp=hash_value("123456"), is_used=False,
                              expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
                              loginUserId=str(user_id), loginCompanyId=str(company_id),
                              pendingFcmEncrypted="encrypted-token", save=AsyncMock())
        service.otp_repo = Mock(find_latest_otp=AsyncMock(return_value=otp))
        service.activityRepo = Mock(create=AsyncMock(return_value=True))
        service.crypto = Mock(decrypt_data=Mock(return_value="device-token"))
        data = {"email": "user@example.com", "password": "Test1234!", "companyId": "COMP-1", "otp": "123456"}
        with patch("app.services.auth_services.PushTokenService.bind", new_callable=AsyncMock) as bind, \
             patch("app.services.auth_services.activity_payload", return_value={}):
            result = await service.verify_login_otp(data)
            bind.assert_awaited_once()
            self.assertEqual(bind.call_args.args[:3], (user_id, company_id, "device-token"))
            self.assertEqual(result["access_token"], "test-access")
            otp.is_used = False
            with self.assertRaises(Exception):
                await service.verify_login_otp({**data, "otp": "000000"})
            self.assertEqual(bind.await_count, 1)

    async def test_password_login_only_stores_pending_token(self):
        service = AuthServices.__new__(AuthServices)
        service.client = Mock(start_session=AsyncMock(return_value=FakeSession()))
        company_id, user_id = ObjectId(), ObjectId()
        company = SimpleNamespace(id=company_id, status="active", subscription=SimpleNamespace(status="active"))
        user = Mock(id=user_id, companyId=company_id, isEmailVerified=True,
                    status="active", userRole=[SimpleNamespace(code="user")])
        user.compare_password.return_value = True
        user.model_dump.return_value = {"firstName": "Test", "lastName": "User"}
        service.companyRepo = Mock(
            find_company_by_companyId=AsyncMock(return_value=company),
            find_by_id_with_project=AsyncMock(return_value={"status": "active"}),
        )
        service.repo = Mock(find_user_by_hashMail_and_companyId=AsyncMock(return_value=user))
        service.otp_repo = Mock(create=AsyncMock(return_value=True))
        service.crypto = Mock(encrypt_data=Mock(side_effect=lambda value: f"encrypted:{value}"))
        data = {"email": "user@example.com", "password": "Test1234!", "companyId": "COMP-1", "fcm": "device-token"}
        with patch("app.services.auth_services.PushTokenService.bind", new_callable=AsyncMock) as bind, \
             patch("app.services.auth_services.generate_otp", return_value="123456"):
            await service.login(data)
            bind.assert_not_awaited()
        challenge = service.otp_repo.create.call_args.args[0]
        self.assertEqual(challenge["pendingFcmEncrypted"], "encrypted:device-token")
        self.assertEqual(challenge["loginUserId"], str(user_id))
        self.assertEqual(challenge["loginCompanyId"], str(company_id))
