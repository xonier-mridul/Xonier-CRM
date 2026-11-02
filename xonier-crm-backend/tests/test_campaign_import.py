"""Campaign CSV import regression checks without a database."""

import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from bson import ObjectId

from chat_test_env import seed_test_settings

seed_test_settings()

from app.core.enums import CAMPAIGN_DISTRIBUTION_MODE
from app.core.security import hash_value
from app.services.campaign_service import CampaignService


class AsyncContext:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False


class FakeSession(AsyncContext):
    def start_transaction(self):
        return AsyncContext()


class CampaignImportTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.service = CampaignService.__new__(CampaignService)
        self.campaign = SimpleNamespace(
            id=ObjectId(), companyId=ObjectId(), campaign_id="CAMP-TEST",
            distributionMode=CAMPAIGN_DISTRIBUTION_MODE.ON_DEMAND,
        )
        self.service._get_campaign_or_404 = AsyncMock(return_value=self.campaign)
        self.service.encryption = Mock()
        self.service.encryption.encrypt_data.side_effect = lambda value: f"encrypted:{value}"
        self.service.activityRepo = Mock(create=AsyncMock())
        self.service._clear_cache = AsyncMock()
        self.collection = Mock(update_one=AsyncMock())
        self.service._collection = Mock(return_value=self.collection)
        session = FakeSession()
        self.service.client = Mock(start_session=AsyncMock(return_value=session))
        self.user = {"_id": str(ObjectId())}

    async def import_rows(self, rows, existing=()):
        lead_model = Mock()
        lead_model.find.return_value.to_list = AsyncMock(return_value=list(existing))
        created = []

        def make_lead(**fields):
            lead = SimpleNamespace(**fields, id=None)
            created.append(lead)
            return lead

        lead_model.side_effect = make_lead
        lead_model.insert_many = AsyncMock(
            side_effect=lambda documents, session: SimpleNamespace(
                inserted_ids=[ObjectId() for _ in documents]
            )
        )
        campaign_lead_model = Mock()
        campaign_lead_model.insert_many = AsyncMock()
        with patch("app.services.campaign_service.LeadsModel", lead_model), \
             patch("app.services.campaign_service.CampaignLeadModel", campaign_lead_model), \
             patch("app.services.campaign_service.generate_enquiry_id", return_value="LEAD-TEST"), \
             patch("app.services.campaign_service.activity_payload", return_value={}):
            result = await self.service.import_leads(str(self.campaign.id), {"leads": rows}, self.user)
        self.assertEqual(lead_model.find.call_args.args[0]["deletedAt"], None)
        self.assertEqual(lead_model.find.call_args.args[0]["companyId"], self.campaign.companyId)
        return result, created

    async def test_invalid_row_does_not_make_later_valid_row_a_duplicate(self):
        identity = {"email": "fresh@example.com", "phone": "+919876543210", "projectType": "Sales CRM"}
        result, created = await self.import_rows([
            {**identity, "fullName": None},
            {**identity, "fullName": "Fresh Lead"},
        ])
        self.assertEqual((result["inserted"], result["skipped"]), (1, 1))
        self.assertIn("Validation error", result["skippedRecords"][0]["reason"])
        self.assertEqual(created[0].projectType, "sales_crm")

    async def test_optional_csv_enum_values_do_not_skip_fresh_lead(self):
        result, created = await self.import_rows([{
            "fullName": "Fresh Lead", "email": "another@example.com",
            "priority": "Urgent", "status": "In Progress",
            "language": "Klingon", "employeeSeniority": "Executive",
            "postalCode": "999",
        }])
        self.assertEqual((result["inserted"], result["skipped"]), (1, 0))
        self.assertEqual((created[0].priority, created[0].status), ("medium", "new"))
        self.assertFalse(hasattr(created[0], "language"))
        self.assertFalse(hasattr(created[0], "postalCode"))

    async def test_only_same_email_phone_and_project_type_is_duplicate(self):
        existing = SimpleNamespace(
            hashedEmail=hash_value("same@example.com"),
            hashedPhone=hash_value("+919876543210"), projectType="crm",
        )
        base = {"fullName": "New Lead", "email": "same@example.com", "projectType": "CRM"}
        result, _ = await self.import_rows([
            {**base, "phone": "+919876543210"},
            {**base, "phone": "+919876543211"},
        ], existing=[existing])
        self.assertEqual((result["inserted"], result["skipped"]), (1, 1))
        self.assertIn("Duplicate lead", result["skippedRecords"][0]["reason"])


if __name__ == "__main__":
    unittest.main()
