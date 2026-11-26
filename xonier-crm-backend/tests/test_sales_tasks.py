"""Sales Tasks regression tests against a disposable localhost MongoDB replica set."""
import asyncio
import os
import unittest
from datetime import date, datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from chat_test_env import seed_test_settings

seed_test_settings()

from bson import DBRef, ObjectId
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient
from jose import jwt
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.uri_parser import parse_uri

import app.db.db as database
from app.core.enums import COMPANY_STATUS, FEATURE
from app.middlewares.auth_middleware import AuthMiddleware
from app.routes import leads_route, sales_task_route
from app.services.sales_task_service import SALES_TIMEZONE
from app.utils.custom_exception import AppException

MONGO_URI = os.environ.get("SALES_TASK_TEST_MONGO_URI")


@unittest.skipUnless(MONGO_URI, "Set SALES_TASK_TEST_MONGO_URI to a disposable localhost replica set")
class SalesTasksTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        parsed = parse_uri(MONGO_URI)
        self.assertTrue(all(host in {"127.0.0.1", "localhost", "::1"} for host, _ in parsed["nodelist"]))
        self.mongo = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        self.db_name = f"sales_task_test_{uuid4().hex}"
        self.db = self.mongo[self.db_name]
        self.addAsyncCleanup(self.clean_database)

        with patch.object(database, "Client", self.mongo), \
             patch.object(database.settings, "DATABASE_NAME", self.db_name):
            await database.connect_db()
        self.assertIn("sales_lead_tasks", await self.db.list_collection_names())

        for target in (
            "app.routes.sales_task_route.lead_service.client",
            "app.routes.leads_route.leadController.service.client",
            "app.services.sales_task_service.Client",
        ):
            patcher = patch(target, self.mongo)
            patcher.start()
            self.addCleanup(patcher.stop)
        patcher = patch(
            "app.services.lead_service.FastAPICache.get_backend",
            return_value=SimpleNamespace(clear=AsyncMock()),
        )
        patcher.start()
        self.addCleanup(patcher.stop)

        self.company, self.other_company = ObjectId(), ObjectId()
        permissions = {}
        for action in ("read", "update", "assign", "reassign"):
            code = f"lead:{action}"
            result = await self.db.permissions.insert_one({
                "code": code, "module": "lead", "action": action, "title": code, "description": code,
                "is_active": True,
            })
            permissions[action] = DBRef("permissions", result.inserted_id)
        roles = {}
        for name, code, actions in [
            ("admin", "ADMIN", ["read", "assign", "reassign"]),
            ("manager", "MANAGER", ["read", "assign"]),
            ("user", "USER", ["read", "update"]),
            ("read_only_user", "USER", ["read"]),
            ("user_with_assign", "USER", ["read", "assign"]),
            ("user_without_read", "USER", []),
        ]:
            result = await self.db.userroles.insert_one({
                "name": name, "code": code, "permissions": [permissions[action] for action in actions],
            })
            roles[name] = DBRef("userroles", result.inserted_id)
        self.admin = await self.user(roles["admin"])
        self.manager = await self.user(roles["manager"])
        self.rep = await self.user(roles["user"])
        self.second_rep = await self.user(roles["user"])
        self.read_only_rep = await self.user(roles["read_only_user"])
        self.regular_assigner = await self.user(roles["user_with_assign"])
        self.no_lead_access = await self.user(roles["user_without_read"])
        self.inactive = await self.user(roles["user"], status="inactive")
        self.orphan_role_user = await self.user(DBRef("userroles", ObjectId()))
        self.foreign_rep = await self.user(roles["user"], company=self.other_company)
        self.foreign_admin = await self.user(roles["admin"], company=self.other_company)

        app = FastAPI()
        app.add_middleware(AuthMiddleware)

        @app.exception_handler(AppException)
        async def handle_error(_request: Request, error: AppException):
            return JSONResponse({"message": error.message}, status_code=error.status_code)

        self.company_status = COMPANY_STATUS.ACTIVE
        self.sales_enabled = True

        async def company_by_id(company_id):
            if company_id not in (self.company, self.other_company):
                return None
            return SimpleNamespace(id=company_id, status=self.company_status)

        async def company_with_plan(_company_id, **_kwargs):
            features = [
                SimpleNamespace(feature=SimpleNamespace(feature_key=FEATURE.CRM), is_enabled=True),
                SimpleNamespace(feature=SimpleNamespace(feature_key=FEATURE.SALES), is_enabled=self.sales_enabled),
            ]
            return SimpleNamespace(subscription=SimpleNamespace(planId=SimpleNamespace(features=features)))

        for module, prefix in [(sales_task_route, "/api/sales-tasks"), (leads_route, "/api/lead")]:
            for name, lookup in [("find_by_id", company_by_id), ("find_by_id_nested", company_with_plan)]:
                patcher = patch.object(module.dependencies.companyRepo, name, side_effect=lookup)
                patcher.start()
                self.addCleanup(patcher.stop)
            app.include_router(module.router, prefix=prefix)
        self.http = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
        self.addAsyncCleanup(self.http.aclose)

    async def clean_database(self):
        await self.mongo.drop_database(self.db_name)
        self.mongo.close()

    async def user(self, role, *, company=None, status="active"):
        result = await self.db.users.insert_one({
            "firstName": "Test", "lastName": "User", "email": "example@test.invalid",
            "phone": "+919000000000", "password": "Synthetic!Fixture1",
            "companyId": company or self.company, "userRole": [role], "status": status,
        })
        return result.inserted_id

    async def lead(self, *, company=None, assignee=None, deleted=False):
        result = await self.db.leads.insert_one({
            "lead_id": str(ObjectId()), "fullName": "Synthetic Lead", "companyId": company or self.company,
            "createdBy": DBRef("users", self.admin), "isAssigned": bool(assignee),
            "assignedTo": [DBRef("users", assignee)] if assignee else [],
            "status": "deleted" if deleted else "new",
        })
        return result.inserted_id

    async def request(self, method, path, actor=None, **kwargs):
        headers = {}
        if actor:
            token = jwt.encode({"_id": str(actor)}, database.settings.ACCESS_TOKEN_SECRET, algorithm="HS256")
            headers["Authorization"] = f"Bearer {token}"
        return await self.http.request(method, "/api" + path, headers=headers, **kwargs)

    def payload(self, lead, *, assignee=None, mode="assign"):
        return {
            "mode": mode, "userId": str(assignee or self.rep), "leadIds": [str(lead)],
            "requestId": str(uuid4()), "title": "Contact this lead",
            "dueDate": datetime.now(SALES_TIMEZONE).date().isoformat(),
        }

    async def test_assignment_is_optional_and_only_the_assignee_sees_or_completes_task(self):
        direct, with_task = await self.lead(), await self.lead()
        response = await self.request("PATCH", "/lead/assign/bulk", self.admin, json={
            "userId": str(self.rep), "leadsId": [str(direct)],
        })
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(await self.db.sales_lead_tasks.count_documents({}), 0)

        response = await self.request("POST", "/sales-tasks/assign", self.manager, json=self.payload(with_task))
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["tasksCreated"], 1)

        response = await self.request("GET", "/sales-tasks?dueToday=true", self.rep)
        self.assertEqual(response.status_code, 200, response.text)
        items = response.json()["data"]["items"]
        self.assertEqual([item["leadId"] for item in items], [str(with_task)])
        task_path = f"/sales-tasks/{items[0]['id']}/complete"
        for actor in (self.second_rep, self.admin, self.foreign_admin):
            self.assertEqual((await self.request("GET", "/sales-tasks", actor)).json()["data"]["total"], 0)
            self.assertEqual((await self.request("PATCH", task_path, actor)).status_code, 404)
        self.assertEqual((await self.request("GET", "/sales-tasks")).status_code, 401)
        for _ in range(2):
            self.assertEqual((await self.request("PATCH", task_path, self.rep)).status_code, 200)
        self.assertEqual((await self.request("GET", "/sales-tasks?dueToday=true", self.rep)).json()["data"]["total"], 0)
        self.assertEqual((await self.request("GET", "/sales-tasks?status=completed", self.rep)).json()["data"]["total"], 1)

    async def test_create_permissions_roles_tenant_and_active_target(self):
        local = await self.lead()
        foreign = await self.lead(company=self.other_company)
        deleted = await self.lead(deleted=True)
        for actor, target, expected in [
            (self.rep, self.second_rep, 403),
            (self.regular_assigner, self.second_rep, 403),
            (self.manager, self.admin, 403),
            (self.manager, self.manager, 403),
            (self.admin, self.foreign_rep, 404),
            (self.admin, self.inactive, 404),
            (self.admin, self.orphan_role_user, 403),
            (self.admin, self.no_lead_access, 403),
        ]:
            payload = self.payload(local, assignee=target)
            response = await self.request("POST", "/sales-tasks/assign", actor, json=payload)
            with self.subTest(actor=actor, target=target):
                self.assertEqual(response.status_code, expected, response.text)
        response = await self.request("GET", "/sales-tasks", self.no_lead_access)
        self.assertEqual(response.status_code, 403, response.text)
        await self.db.permissions.update_one({"code": "lead:assign"}, {"$set": {"is_active": False}})
        response = await self.request("POST", "/sales-tasks/assign", self.admin, json=self.payload(local))
        self.assertEqual(response.status_code, 403, response.text)
        await self.db.permissions.update_one({"code": "lead:assign"}, {"$set": {"is_active": True}})
        payload = self.payload(local, mode="reassign")
        response = await self.request("POST", "/sales-tasks/assign", self.manager, json=payload)
        self.assertEqual(response.status_code, 403, response.text)
        payload = self.payload(local)
        payload["leadIds"].extend([str(foreign), str(deleted)])
        preview = {key: payload[key] for key in ("mode", "userId", "leadIds")}
        response = await self.request("POST", "/sales-tasks/preview", self.admin, json=preview)
        self.assertEqual([lead["id"] for lead in response.json()["data"]["leads"]], [str(local)])
        response = await self.request("POST", "/sales-tasks/assign", self.admin, json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["skipped"], 2)
        self.assertEqual(await self.db.sales_lead_tasks.count_documents({}), 1)

    async def test_retry_and_transaction_rollback(self):
        lead = await self.lead()
        payload = self.payload(lead)
        responses = await asyncio.gather(*[
            self.request("POST", "/sales-tasks/assign", self.admin, json=payload) for _ in range(2)
        ])
        for response in responses:
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()["data"]["tasksCreated"], 1)
        self.assertEqual(await self.db.sales_lead_tasks.count_documents({"leadId": lead}), 1)
        response = await self.request("POST", "/sales-tasks/assign", self.admin, json={**payload, "title": "Changed"})
        self.assertEqual(response.status_code, 409, response.text)

        rollback_lead = await self.lead()
        actual = self.db.sales_lead_task_requests
        failing_receipts = SimpleNamespace(
            find_one=actual.find_one,
            insert_one=AsyncMock(side_effect=AppException(503, "Simulated receipt failure")),
        )
        with patch("app.services.lead_service.task_requests_collection", return_value=failing_receipts):
            response = await self.request("POST", "/sales-tasks/assign", self.admin, json=self.payload(rollback_lead))
        self.assertEqual(response.status_code, 503, response.text)
        self.assertFalse((await self.db.leads.find_one({"_id": rollback_lead}))["isAssigned"])
        self.assertEqual(await self.db.sales_lead_tasks.count_documents({"leadId": rollback_lead}), 0)

    async def test_reassignment_and_revocation_remove_pending_access(self):
        lead = await self.lead()
        response = await self.request("POST", "/sales-tasks/assign", self.admin, json=self.payload(lead))
        self.assertEqual(response.status_code, 200, response.text)
        old_task = await self.db.sales_lead_tasks.find_one({"leadId": lead})
        response = await self.request("POST", "/sales-tasks/assign", self.admin, json=self.payload(
            lead, assignee=self.second_rep, mode="reassign",
        ))
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual((await self.db.sales_lead_tasks.find_one({"_id": old_task["_id"]}))["status"], "cancelled")
        self.assertEqual((await self.request("PATCH", f"/sales-tasks/{old_task['_id']}/complete", self.rep)).status_code, 404)
        self.assertEqual((await self.request("GET", "/sales-tasks", self.second_rep)).json()["data"]["total"], 1)

        response = await self.request("PATCH", "/lead/clear-assign/bulk", self.admin, json={"leadsIds": [str(lead)]})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(await self.db.sales_lead_tasks.count_documents({"leadId": lead, "status": "cancelled"}), 2)
        self.assertEqual((await self.request("GET", "/sales-tasks", self.second_rep)).json()["data"]["total"], 0)

    async def test_ist_date_boundary_and_current_lead_scope(self):
        lead = await self.lead(assignee=self.rep)
        foreign = await self.lead(assignee=self.rep, company=self.other_company)
        await self.db.sales_lead_tasks.insert_many([
            {
                "companyId": self.company, "assigneeId": self.rep, "leadId": lead_id, "status": "pending",
                "title": title, "dueDate": date(2026, 11, 27).isoformat(),
                "assignedAt": datetime(2026, 11, 26, hour, 30, tzinfo=timezone.utc),
            }
            for lead_id, title, hour in [(lead, "Before midnight", 17), (lead, "At midnight", 18), (foreign, "Hidden", 18)]
        ])
        path = "/sales-tasks?dateField=assignedAt&dateFrom=2026-11-27&dateTo=2026-11-27"
        response = await self.request("GET", path, self.rep)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual([item["title"] for item in response.json()["data"]["items"]], ["At midnight"])
        await self.db.leads.update_one({"_id": lead}, {"$set": {"deletedAt": datetime.now(timezone.utc)}})
        self.assertEqual((await self.request("GET", path, self.rep)).json()["data"]["total"], 0)

    async def test_company_and_sales_entitlement_are_required(self):
        self.sales_enabled = False
        response = await self.request("GET", "/sales-tasks", self.rep)
        self.assertEqual(response.status_code, 403, response.text)
        self.assertIn("sales:feature", response.text)
        self.sales_enabled = True
        self.company_status = COMPANY_STATUS.SUSPENDED
        response = await self.request("GET", "/sales-tasks", self.rep)
        self.assertEqual(response.status_code, 403, response.text)
        self.assertIn("suspended", response.text)

    async def test_engagement_is_shared_with_leads_and_preserves_task_lifecycle(self):
        lead = await self.lead()
        response = await self.request("POST", "/sales-tasks/assign", self.admin, json=self.payload(lead))
        self.assertEqual(response.status_code, 200, response.text)
        path = f"/lead/update/{lead}/connect-status"
        for outsider in (self.second_rep, self.foreign_rep):
            response = await self.request("PATCH", path, outsider, json={"status": "connected"})
            self.assertIn(response.status_code, (403, 404), response.text)
        read_only_lead = await self.lead(assignee=self.read_only_rep)
        response = await self.request("PATCH", f"/lead/update/{read_only_lead}/connect-status", self.read_only_rep,
                                      json={"status": "connected"})
        self.assertEqual(response.status_code, 403, response.text)

        # Check the stored value at the exact point the shared Leads cache is invalidated.
        cache_clears = []

        async def observe_commit(_namespace):
            saved = await self.db.leads.find_one({"_id": lead})
            cache_clears.append(saved.get("connectStatus"))

        with patch("app.services.lead_service.FastAPICache.get_backend", return_value=SimpleNamespace(
            clear=lambda namespace: observe_commit(namespace),
        )):
            response = await self.request("PATCH", path, self.rep, json={"status": "connected"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(cache_clears, ["connected", "connected"])
        response = await self.request("GET", f"/lead/get-by-id/{lead}", self.rep)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["connectStatus"], "connected")
        self.assertEqual(response.json()["data"]["status"], "new")
        response = await self.request("GET", "/sales-tasks?dueToday=true", self.rep)
        task = response.json()["data"]["items"][0]
        self.assertEqual((task["connectStatus"], task["status"], task["followUpAt"]), ("connected", "pending", None))

        with patch("app.services.follow_up_push_service.FollowUpPushService._db", return_value=self.db), \
             patch("app.services.google_calendar_service.GoogleCalendarService.sync_followup", new=AsyncMock()):
            response = await self.request("PATCH", path, self.rep, json={"status": "follow_up", "followUpIn": "1d"})
            self.assertEqual(response.status_code, 200, response.text)
            response = await self.request("GET", "/sales-tasks", self.rep)
            task = response.json()["data"]["items"][0]
            self.assertEqual(task["connectStatus"], "follow_up")
            reminder = await self.db.lead_follow_up_reminders.find_one({"_id": lead})
            self.assertEqual(
                datetime.fromisoformat(task["followUpAt"]),
                reminder["scheduledAt"].replace(tzinfo=timezone.utc),
            )
            response = await self.request("PATCH", path, self.rep, json={"status": "not_interested"})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual((await self.db.lead_follow_up_reminders.find_one({"_id": lead}))["status"], "cancelled")
            response = await self.request("GET", "/sales-tasks", self.rep)
            self.assertIsNone(response.json()["data"]["items"][0]["followUpAt"])
