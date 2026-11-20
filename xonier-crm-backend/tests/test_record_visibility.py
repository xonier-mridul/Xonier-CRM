import unittest

from app.utils.record_visibility import live_deal_filter, live_lead_filter


class RecordVisibilityTests(unittest.TestCase):
    def test_explicit_lead_status_cannot_replace_deletion_filter(self):
        query = live_lead_filter({
            "status": "delete",
            "$and": [{"isAssigned": True}],
        })
        self.assertIsNone(query["deletedAt"])
        self.assertEqual(query["status"], "delete")
        self.assertEqual(query["$and"], [
            {"isAssigned": True},
            {"status": {"$nin": ["delete", "deleted"]}},
        ])

    def test_deal_stage_and_status_do_not_replace_deletion_filter(self):
        query = live_deal_filter({"status": "active", "dealStage": "proposal"})
        self.assertIsNone(query["deletedAt"])
        self.assertEqual(query["status"], "active")
        self.assertEqual(query["dealStage"], "proposal")
        self.assertEqual(query["$and"], [
            {"status": {"$nin": ["delete", "deleted"]}},
            {"dealStage": {"$nin": ["delete", "deleted"]}},
        ])
