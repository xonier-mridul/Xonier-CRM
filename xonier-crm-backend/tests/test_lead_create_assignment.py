"""Lead creation may assign a same-company, lower-role agent in one transaction."""
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from chat_test_env import seed_test_settings
seed_test_settings()

from beanie import PydanticObjectId
from app.core.tenant import current_company
from app.services.lead_service import LeadService
from app.utils.custom_exception import AppException


class AsyncContext:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False

    def start_transaction(self):
        return AsyncContext()


class LeadCreateAssignmentTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.company_id = str(PydanticObjectId())
        self.admin_id = str(PydanticObjectId())
        self.agent_id = str(PydanticObjectId())
        self.context_token = current_company.set(self.company_id)
        self.admin = {"_id": self.admin_id, "userRole": [{"code": "COMPANY_ADMIN"}]}
        self.agent = {"_id": self.agent_id, "userRole": [{"code": "USER"}]}
        self.service = LeadService.__new__(LeadService)
        self.service.userRepo = SimpleNamespace(
            find_one=AsyncMock(return_value=self.agent),
            get_all_without_pagination=AsyncMock(return_value=[]),
        )
        created = SimpleNamespace(
            id=PydanticObjectId(), lead_id="LD-1", fullName="Test Lead",
            model_dump=lambda **_: {"lead_id": "LD-1", "fullName": "Test Lead"},
        )
        self.service.repo = SimpleNamespace(create=AsyncMock(return_value=created))
        self.service.activityRepo = SimpleNamespace(create=AsyncMock(return_value=True))
        self.service.client = SimpleNamespace(start_session=AsyncMock(return_value=AsyncContext()))
        self.service.getTeamMem = SimpleNamespace(validate_manager=AsyncMock(return_value=False))

    def tearDown(self):
        current_company.reset(self.context_token)

    async def test_admin_create_assigns_selected_agent(self):
        status_service = SimpleNamespace(resolve=AsyncMock(return_value="new"))
        cache = SimpleNamespace(clear=AsyncMock())
        payload = {"fullName": "Test Lead", "assigneeId": self.agent_id}
        with patch("app.services.lead_service.generate_lead_id", new=AsyncMock(return_value="LD-1")), \
             patch("app.services.lead_service.LeadStatusService", return_value=status_service), \
             patch("app.services.lead_service.FastAPICache.get_backend", return_value=cache):
            await self.service.create(payload, self.admin)

        saved = self.service.repo.create.await_args.kwargs["data"]
        self.assertEqual(saved["assignedTo"], [PydanticObjectId(self.agent_id)])
        self.assertEqual(saved["assignedBy"], PydanticObjectId(self.admin_id))
        self.assertTrue(saved["isAssigned"])
        self.assertNotIn("assigneeId", saved)
        self.assertEqual(payload["assigneeId"], self.agent_id)
        query = self.service.userRepo.find_one.await_args.args[0]
        self.assertEqual(query["companyId"], PydanticObjectId(self.company_id))
        self.assertEqual(query["status"], "active")

    async def test_regular_agent_cannot_choose_assignee(self):
        with self.assertRaises(AppException) as error:
            await self.service.create({"assigneeId": self.admin_id}, self.agent)
        self.assertEqual(error.exception.status_code, 403)
        self.service.repo.create.assert_not_awaited()

    async def test_other_company_or_inactive_assignee_is_rejected(self):
        self.service.userRepo.find_one.return_value = None
        with self.assertRaises(AppException) as error:
            await self.service.create({"assigneeId": self.agent_id}, self.admin)
        self.assertEqual(error.exception.status_code, 404)
        self.service.repo.create.assert_not_awaited()

    async def test_agent_created_lead_still_assigns_to_creator(self):
        status_service = SimpleNamespace(resolve=AsyncMock(return_value="new"))
        cache = SimpleNamespace(clear=AsyncMock())
        with patch("app.services.lead_service.generate_lead_id", new=AsyncMock(return_value="LD-1")), \
             patch("app.services.lead_service.LeadStatusService", return_value=status_service), \
             patch("app.services.lead_service.FastAPICache.get_backend", return_value=cache):
            await self.service.create({"fullName": "Test Lead"}, self.agent)
        saved = self.service.repo.create.await_args.kwargs["data"]
        self.assertEqual(saved["assignedTo"], [PydanticObjectId(self.agent_id)])
        self.assertEqual(saved["assignedBy"], PydanticObjectId(self.agent_id))

    async def test_assignable_agents_excludes_equal_and_higher_roles(self):
        self.service.userRepo.get_all_without_pagination.return_value = [
            {"id": self.agent_id, "firstName": "Asha", "lastName": "Singh", "userRole": [{"code": "USER"}]},
            {"id": self.admin_id, "firstName": "Admin", "userRole": [{"code": "COMPANY_ADMIN"}]},
        ]
        agents = await self.service.assignable_agents(self.admin)
        self.assertEqual(agents, [{"id": self.agent_id, "firstName": "Asha", "lastName": "Singh"}])
        query = self.service.userRepo.get_all_without_pagination.await_args.kwargs["filters"]
        self.assertEqual(query["companyId"], PydanticObjectId(self.company_id))
        self.assertEqual(query["deletedAt"], None)


if __name__ == "__main__":
    unittest.main()
