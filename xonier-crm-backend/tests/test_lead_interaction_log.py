import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from bson import ObjectId
from pydantic import ValidationError

from app.routes.next_action_route import LeadInteractionInput, log_lead_interaction


class LeadInteractionTests(unittest.IsolatedAsyncioTestCase):
    def test_rejects_blank_summary_and_unknown_channel(self):
        for payload in ({"channel": "linkedin", "summary": "  "},
                        {"channel": "sms", "summary": "Contact replied"}):
            with self.subTest(payload=payload), self.assertRaises(ValidationError):
                LeadInteractionInput(**payload)

    async def test_logs_to_authorized_lead(self):
        lead_id, user_id, activity_id = ObjectId(), ObjectId(), ObjectId()
        request = SimpleNamespace(state=SimpleNamespace(user={"_id": str(user_id)}))
        with patch("app.routes.next_action_route.require_record", new_callable=AsyncMock, return_value=lead_id) as require, \
             patch("app.routes.next_action_route.ActivityRepository") as repo:
            repo.return_value.create = AsyncMock(return_value=SimpleNamespace(id=activity_id))
            result = await log_lead_interaction(
                request, str(lead_id), LeadInteractionInput(channel="linkedin", summary="  First reply  "))
        require.assert_awaited_once_with(request, "lead", str(lead_id), write=True)
        activity = repo.return_value.create.await_args.kwargs["data"]
        self.assertEqual(activity["entityId"], lead_id)
        self.assertEqual(activity["metadata"]["channel"], "linkedin")
        self.assertEqual(activity["description"], "First reply")
        self.assertEqual(result["data"]["id"], str(activity_id))


if __name__ == "__main__":
    unittest.main()
