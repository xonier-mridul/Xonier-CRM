"""Isolated company-ID tests; never access the application's configured database."""
import asyncio
import os
import unittest
from datetime import datetime, timezone
from urllib.parse import urlparse
from uuid import uuid4
from unittest.mock import AsyncMock, patch

from chat_test_env import seed_test_settings
seed_test_settings()

from bson import DBRef, ObjectId
from mongomock_motor import AsyncMongoMockClient
from pydantic import ValidationError
from pymongo.errors import DuplicateKeyError

from app.schemas.company_schema import CompanyUpdateSchema, CompanyCreateSchema, CompanySelfRegisterSchema
from app.utils.company_code import (
    assert_company_editor, company_code_prefix, company_login_filter,
    generate_company_code, validate_company_code, retry_company_code_collision,
    CompanyCodeCollision,
)
from app.utils.custom_exception import AppException
from scripts.migrate_company_codes import migrate_company_codes


class CompanyCodeTests(unittest.IsolatedAsyncioTestCase):
    def test_format_normalization_and_invalid_values(self):
        self.assertEqual(validate_company_code(" xon-0123 "), "XON-0123")
        self.assertEqual(CompanyUpdateSchema(companyId=" inf-1234 ").companyId, "INF-1234")
        for value in ["", None, "X-1234", "XON-123", "XON-12345", "INFSY-1234", "XON_1234", "XÖN-1234", {"$ne": None}]:
            with self.subTest(value=value), self.assertRaises(ValidationError):
                CompanyUpdateSchema(companyId=value)
        self.assertEqual(CompanyUpdateSchema(companyName="Xonier").model_dump(exclude_unset=True), {"companyName": "Xonier"})

    def test_readable_name_prefixes(self):
        for name, prefix in [("Xonier", "XON"), ("Infosys", "INF"), ("Ácme Ltd", "ACM"), ("AI", "AIX"), ("12345", "CMP"), ("公司", "CMP")]:
            self.assertEqual(company_code_prefix(name), prefix)

    def test_editor_roles_and_tenant_boundary(self):
        company, other = str(ObjectId()), str(ObjectId())
        assert_company_editor({"userRole": [{"code": "SUPER_ADMIN"}]}, company)
        for tenant in [company, {"id": company}, {"_id": company}]:
            assert_company_editor({"userRole": [{"code": "COMPANY_ADMIN"}], "companyId": tenant}, company)
        for actor in [
            {"userRole": [{"code": "COMPANY_ADMIN"}], "companyId": other},
            {"userRole": [{"code": "EMPLOYEE"}], "companyId": company},
            {"userRole": [{"code": "CUSTOM_ADMIN"}], "companyId": company}, {},
        ]:
            with self.assertRaises(AppException) as denied:
                assert_company_editor(actor, company)
            self.assertEqual(denied.exception.status_code, 403)

    async def test_generator_skips_current_aliases_and_deleted_company_codes(self):
        client = AsyncMongoMockClient()
        collection = client.test.companies
        await collection.insert_many([
            {"companyId": "XON-0017", "deletedAt": datetime.now(timezone.utc)},
            {"companyId": "INF-1000", "loginCodes": ["XON-0018", "INF-1000"]},
        ])
        with patch("app.utils.company_code.secrets.randbelow", return_value=17):
            self.assertEqual(await generate_company_code(collection, "Xonier"), "XON-0019")
        client.close()

    async def test_lookup_supports_legacy_new_and_retained_codes(self):
        client = AsyncMongoMockClient()
        collection = client.test.companies
        legacy = "COMP2-2026-123456-abcdef"
        company = {"companyId": legacy}
        await collection.insert_one(company)
        self.assertIsNotNone(await collection.find_one(company_login_filter(legacy)))
        await collection.update_one({"_id": company["_id"]}, {"$set": {
            "companyId": "XON-1234", "loginCodes": [legacy.upper(), "XON-1234"],
        }})
        for code in [legacy, legacy.upper(), "xon-1234", " XON-1234 "]:
            self.assertIsNotNone(await collection.find_one(company_login_filter(code)))
        self.assertIsNone(await collection.find_one(company_login_filter("INF-9999")))
        client.close()

    async def test_exhausted_prefix_returns_controlled_conflict_without_writes(self):
        client = AsyncMongoMockClient()
        collection = client.test.companies
        await collection.insert_one({"companyId": "INF-1234", "loginCodes": [f"XON-{index:04d}" for index in range(10000)]})
        with self.assertRaises(AppException) as failure:
            await generate_company_code(collection, "Xonier")
        self.assertEqual(failure.exception.status_code, 409)
        self.assertEqual(await collection.count_documents({}), 1)
        client.close()

    async def test_registration_collision_retries_and_stops_after_bound(self):
        operation = AsyncMock(side_effect=[CompanyCodeCollision(), "ok"])
        self.assertEqual(await retry_company_code_collision(operation)(), "ok")
        self.assertEqual(operation.await_count, 2)
        operation = AsyncMock(side_effect=CompanyCodeCollision())
        with self.assertRaises(AppException) as failed:
            await retry_company_code_collision(operation)()
        self.assertEqual(failed.exception.status_code, 409)
        self.assertEqual(operation.await_count, 5)

    async def test_migration_preview_never_writes(self):
        client = AsyncMongoMockClient()
        collection = client.test.companies
        await collection.insert_many([
            {"companyId": "COMP-legacy", "companyName": "Xonier"},
            {"companyId": "INF-1234", "companyName": "Infosys"},
        ])
        before = await collection.find({}).to_list(None)
        indexes = await collection.index_information()
        changes = await migrate_company_codes(collection)
        self.assertEqual(len(changes), 1)
        self.assertRegex(changes[0]["companyId"], r"^XON-[0-9]{4}$")
        self.assertEqual(await collection.find({}).to_list(None), before)
        self.assertEqual(await collection.index_information(), indexes)
        client.close()


@unittest.skipUnless(os.getenv("COMPANY_CODE_TEST_MONGO_URI"), "Disposable local MongoDB replica set not requested")
class CompanyCodeMongoTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        uri = os.environ["COMPANY_CODE_TEST_MONGO_URI"]
        if urlparse(uri).hostname not in ("127.0.0.1", "localhost"):
            raise RuntimeError("Only a disposable LOCAL MongoDB is allowed")
        from beanie import init_beanie
        from motor.motor_asyncio import AsyncIOMotorClient
        from app.db.models.company_model import CompanyModel
        from app.db.models.user_model import UserModel
        from app.db.models.user_roles_model import UserRoleModel
        from app.db.models.permissions_model import PermissionModel
        from app.db.models.activity_model import ActivityModel
        from app.db.models.subscription_model import SubscriptionModel
        from app.db.models.plan_model import PlanModel
        from app.db.models.feature_model import FeatureModel
        from app.db.models.otp_model import OtpModel
        from app.db.models.communications.telephone_numbers_model import TelephoneNumbersModel
        from app.services.company_service import CompanyService
        from app.core.crypto import encryptor
        self.crypto = encryptor
        self.client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        self.db = self.client[f"trakeroo_company_code_test_{uuid4().hex}"]
        await init_beanie(database=self.db, document_models=[CompanyModel, UserModel, UserRoleModel,
            PermissionModel, ActivityModel, SubscriptionModel, PlanModel, FeatureModel, OtpModel, TelephoneNumbersModel])
        self.service = CompanyService()
        self.service.client = self.client
        self.company_id, self.other_id, self.admin_id = ObjectId(), ObjectId(), ObjectId()
        self.admin = {"_id": str(self.admin_id), "userRole": [{"code": "SUPER_ADMIN"}]}
        self.company_admin = {"_id": str(self.admin_id), "companyId": str(self.company_id), "userRole": [{"code": "COMPANY_ADMIN"}]}
        self.legacy = "COMP2-2026-123456-abcdef"
        await self.seed_company(self.company_id, self.legacy, "Xonier")
        await self.seed_company(self.other_id, "INF-1234", "Infosys", ["INF-1234"])
        self.original = await self.db.companies.find_one({"_id": self.company_id})
        await self.db.users.insert_one({"_id": self.admin_id, "companyId": self.company_id, "untouched": True})

    async def asyncTearDown(self):
        await self.client.drop_database(self.db.name)
        self.client.close()

    async def seed_company(self, oid, code, name, codes=None):
        from app.core.security import hash_value
        email = f"{oid}@example.com"
        data = {"_id": oid, "companyId": code, "companyName": name, "slug": name.lower(),
            "industry": "Technology", "email": self.crypto.encrypt_data(email), "emailHash": hash_value(email),
            "number": self.crypto.encrypt_data("1234567890"), "numberHash": hash_value("1234567890"),
            "createdBy": DBRef("users", self.admin_id), "status": "active"}
        if codes is not None:
            data["loginCodes"] = codes
        await self.db.companies.insert_one(data)

    async def update(self, actor=None, company_id=None, **fields):
        from app.core.tenant import system_query
        with system_query():
            return await self.service.update(str(company_id or self.company_id), CompanyUpdateSchema(**fields), actor or self.admin)

    async def test_company_admin_edit_preserves_data_references_and_login_lookup(self):
        result = await self.update(actor=self.company_admin, companyId="xon-4321")
        self.assertEqual(result["companyId"], "XON-4321")
        self.assertEqual(result["id"], str(self.company_id))
        after = await self.db.companies.find_one({"_id": self.company_id})
        for field in ["_id", "email", "emailHash", "number", "numberHash", "slug"]:
            self.assertEqual(after[field], self.original[field])
        self.assertEqual((await self.db.users.find_one({"_id": self.admin_id}))["companyId"], self.company_id)
        for code in [self.legacy, "XON-4321", "xon-4321"]:
            self.assertEqual((await self.service.repo.find_company_by_companyId(code)).id, self.company_id)
        log = await self.db.activities.find_one({"entityId": self.company_id})
        self.assertEqual(log["metadata"]["previousCompanyId"], self.legacy)

    async def test_unauthorized_or_other_company_admin_cannot_edit(self):
        for actor in [
            {**self.company_admin, "companyId": str(self.other_id)},
            {**self.company_admin, "userRole": [{"code": "EMPLOYEE"}]},
        ]:
            with self.assertRaises(AppException) as failure:
                await self.update(actor=actor, companyId="XON-9999")
            self.assertEqual(failure.exception.status_code, 403)
        self.assertEqual((await self.db.companies.find_one({"_id": self.company_id}))["companyId"], self.legacy)

    async def test_current_and_old_codes_cannot_be_reassigned_even_after_delete(self):
        await self.update(companyId="XON-4321")
        await self.update(companyId="XON-6789")
        for code in ["INF-1234", "XON-4321"]:
            with self.assertRaises(AppException) as failure:
                await self.update(company_id=self.other_id if code.startswith("XON") else self.company_id, companyId=code)
            self.assertEqual(failure.exception.status_code, 409)
        await self.db.companies.update_one({"_id": self.company_id}, {"$set": {"deletedAt": datetime.now(timezone.utc)}})
        with self.assertRaises(AppException) as failure:
            await self.update(company_id=self.other_id, companyId="XON-4321")
        self.assertEqual(failure.exception.status_code, 409)

    async def test_unique_multikey_index_rejects_alias_claim(self):
        await self.update(companyId="XON-4321")
        await self.update(companyId="XON-6789")
        with self.assertRaises(DuplicateKeyError):
            await self.db.companies.update_one({"_id": self.other_id}, {"$addToSet": {"loginCodes": "XON-4321"}})
        # The partial index permits more than one untouched legacy document.
        await self.seed_company(ObjectId(), "COMP-another", "Legacy Company")

    async def test_concurrent_claim_has_one_winner(self):
        results = await asyncio.gather(
            self.update(companyId="NEW-1234"),
            self.update(company_id=self.other_id, companyId="NEW-1234"), return_exceptions=True,
        )
        self.assertEqual(sum(isinstance(result, dict) for result in results), 1)
        loser = next(result for result in results if isinstance(result, Exception))
        self.assertIsInstance(loser, AppException)
        self.assertEqual(loser.status_code, 409)
        self.assertEqual(await self.db.companies.count_documents({"loginCodes": "NEW-1234"}), 1)

    async def test_concurrent_code_and_metadata_updates_do_not_overwrite(self):
        await asyncio.gather(self.update(companyId="XON-7777"), self.update(companyName="Xonier Technologies"))
        after = await self.db.companies.find_one({"_id": self.company_id})
        self.assertEqual(after["companyName"], "Xonier Technologies")
        self.assertEqual(after["companyId"], "XON-7777")
        self.assertIn(self.legacy.upper(), after["loginCodes"])

    async def test_audit_failure_rolls_back_id_and_aliases(self):
        with patch.object(self.service.activityRepo, "create", new=AsyncMock(side_effect=RuntimeError("test audit failure"))):
            with self.assertRaises(AppException):
                await self.update(companyId="XON-4321")
        after = await self.db.companies.find_one({"_id": self.company_id})
        self.assertEqual(after["companyId"], self.legacy)
        self.assertNotIn("XON-4321", after.get("loginCodes", []))

    async def test_all_five_auth_flows_resolve_old_and_new_codes_without_bypassing_status(self):
        from app.services.auth_services import AuthServices
        await self.update(companyId="XON-4321")
        await self.db.companies.update_one({"_id": self.company_id}, {"$set": {"status": "inactive"}})
        auth = AuthServices()
        auth.client = self.client
        for code in [self.legacy, " xon-4321 "]:
            payload = {"companyId": code, "email": "preview@example.com", "password": "Test!Password123", "otp": "123456"}
            for method in [auth.login, auth.resend_verification_otp, auth.verify_login_otp,
                           auth.forgot_password, auth.verify_forgot_pass_otp]:
                with self.subTest(code=code, method=method.__name__), self.assertRaises(AppException) as denied:
                    await method(payload)
                # Reaching the existing status gate proves the company lookup
                # succeeded; alias login doesn't bypass account/subscription checks.
                self.assertEqual(denied.exception.status_code, 400)
                self.assertIn("status is", denied.exception.message)

    async def test_normal_number_edit_keeps_email_hash_and_encrypts_phone(self):
        from app.core.security import hash_value
        result = await self.update(number="9876543210")
        after = await self.db.companies.find_one({"_id": self.company_id})
        self.assertEqual(result["number"], "9876543210")
        self.assertNotEqual(after["number"], "9876543210")
        self.assertEqual(after["numberHash"], hash_value("9876543210"))
        self.assertEqual(after["emailHash"], self.original["emailHash"])

    async def test_suggestion_is_read_only_and_role_protected(self):
        suggestion = await self.service.suggest_code(str(self.company_id), self.company_admin)
        self.assertRegex(suggestion["companyId"], r"^XON-[0-9]{4}$")
        self.assertEqual(await self.db.companies.find_one({"_id": self.company_id}), self.original)
        with self.assertRaises(AppException) as denied:
            await self.service.suggest_code(str(self.other_id), self.company_admin)
        self.assertEqual(denied.exception.status_code, 403)

    async def test_migration_applies_once_and_preserves_encryption_and_refs(self):
        result = await migrate_company_codes(self.db.companies, apply=True)
        self.assertEqual(len(result), 1)
        self.assertRegex(result[0]["companyId"], r"^XON-[0-9]{4}$")
        after = await self.db.companies.find_one({"_id": self.company_id})
        for field in ["_id", "email", "emailHash", "number", "numberHash"]:
            self.assertEqual(after[field], self.original[field])
        self.assertIsNotNone(await self.service.repo.find_company_by_companyId(self.legacy))
        self.assertEqual(await migrate_company_codes(self.db.companies, apply=True), [])

    async def test_registration_and_admin_creation_generate_short_ids(self):
        from app.core.tenant import system_query
        with system_query():
            await self.db.userroles.insert_one({"code": "COMPANY_ADMIN", "name": "Company Admin", "permissions": []})
        fields = {"industry": "Technology", "companyName": "Newco", "number": "1234567890",
            "adminFirstName": "Alice", "adminLastName": "Demo", "adminEmail": "alice@example.com",
            "adminPhone": "1234567890", "password": "Test!Password123"}
        # Public self-registration deliberately has no tenant context.
        created = await self.service.self_register(CompanySelfRegisterSchema(**fields))
        self.assertRegex(created["companyCode"], r"^NEW-[0-9]{4}$")
        self.assertTrue(ObjectId.is_valid(created["companyId"]))
        company = await self.db.companies.find_one({"_id": ObjectId(created["companyId"])})
        self.assertEqual(company["loginCodes"], [created["companyCode"]])
        self.assertEqual((await self.db.users.find_one({"_id": ObjectId(created["userId"])}))["companyId"], company["_id"])
        with system_query():
            created = await self.service.create(CompanyCreateSchema(**{**fields, "companyName": "Different", "adminEmail": "second@example.com"}), self.admin)
        self.assertRegex(created["companyCode"], r"^DIF-[0-9]{4}$")

    async def test_generated_collision_retries_whole_registration_without_orphan_users(self):
        from app.core.security import hash_value
        await self.db.userroles.insert_one({"code": "COMPANY_ADMIN", "name": "Company Admin", "permissions": []})
        payload = CompanySelfRegisterSchema(industry="Technology", companyName="Newco", number="1234567890",
            adminFirstName="Alice", adminEmail="retry@example.com", adminPhone="1234567890", password="Test!Password123")
        with patch("app.services.company_service.generate_company_code", new=AsyncMock(side_effect=["INF-1234", "NEW-0099"])) as generator:
            result = await self.service.self_register(payload)
        self.assertEqual(result["companyCode"], "NEW-0099")
        self.assertEqual(generator.await_count, 2)
        self.assertEqual(await self.db.users.count_documents({"hashedEmail": hash_value("retry@example.com")}), 1)
        self.assertEqual(await self.db.companies.count_documents({}), 3)
        self.assertEqual(await self.db.otps.count_documents({}), 1)


if __name__ == "__main__":
    unittest.main()
