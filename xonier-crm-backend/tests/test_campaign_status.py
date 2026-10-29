import unittest
from app.core.enums import CAMPAIGN_STATUS
from app.schemas.campaign_schema import CampaignCreateSchema, CampaignStatusUpdateSchema
from app.utils.custom_exception import AppException


class CampaignStatusTests(unittest.TestCase):
    def test_new_campaign_is_active(self):
        self.assertEqual(CampaignCreateSchema(name="New campaign").status.value, "active")

    def test_legacy_draft_is_returned_and_saved_as_active(self):
        self.assertEqual(CampaignCreateSchema(name="Legacy campaign", status="draft").status.value, "active")
        self.assertEqual(CampaignStatusUpdateSchema(status="draft").model_dump(mode="json"), {"status": "active"})
        self.assertNotIn("draft", [status.value for status in CAMPAIGN_STATUS])

    def test_pause_and_resume(self):
        for status in ("paused", "active", "completed", "archived", "deleted"):
            with self.subTest(status=status):
                self.assertEqual(CampaignStatusUpdateSchema(status=status).status.value, status)

    def test_unknown_status_is_rejected(self):
        with self.assertRaises(AppException):
            CampaignStatusUpdateSchema(status="unknown")
