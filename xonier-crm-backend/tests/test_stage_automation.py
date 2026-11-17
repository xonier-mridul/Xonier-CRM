import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from bson import DBRef, ObjectId

from app.repositories.deal_repository import DealRepository
from app.routes.stage_automation_route import RuleInput
from app.services.stage_automation_service import apply_deal_rules


class StageAutomationTests(unittest.IsolatedAsyncioTestCase):
    async def test_repository_triggers_only_on_actual_stage_change(self):
        deal_id, company_id, owner_id = ObjectId(), ObjectId(), ObjectId()
        collection = MagicMock()
        collection.find_one = AsyncMock(return_value={
            "_id": deal_id, "companyId": company_id, "dealStage": "qualification",
            "createdBy": DBRef("users", owner_id),
        })
        collection.update_one = AsyncMock(return_value=MagicMock(matched_count=1))
        repo = DealRepository.__new__(DealRepository)
        repo.model = MagicMock()
        repo.model.get_pymongo_collection.return_value = collection
        repo.model._inject_scope.side_effect = lambda query: query
        session = MagicMock()
        with patch("app.repositories.deal_repository.apply_deal_rules", new_callable=AsyncMock) as apply:
            self.assertTrue(await repo.update(deal_id, {"dealStage": "qualification"}, session=session))
            apply.assert_not_awaited()
            self.assertTrue(await repo.update(deal_id, {"dealStage": "proposal"}, session=session))
            apply.assert_awaited_once()
            args = apply.await_args.args
            self.assertEqual(args[1], "proposal")
            self.assertEqual(args[2], owner_id)

    async def test_rule_creates_tenant_scoped_action_for_deal_owner(self):
        company_id, deal_id, owner_id = ObjectId(), ObjectId(), ObjectId()
        cursor = MagicMock()
        cursor.__aiter__.return_value = iter([{
            "kind": "call", "title": "Follow up", "delayDays": 2,
        }])
        rules = MagicMock(find=MagicMock(return_value=cursor))
        actions = MagicMock(insert_one=AsyncMock())
        with patch("app.services.stage_automation_service.rules_collection", return_value=rules), \
             patch("app.db.models.next_action_model.NextActionModel.get_pymongo_collection", return_value=actions):
            await apply_deal_rules({
                "_id": deal_id, "companyId": company_id,
                "assignedTo": DBRef("users", owner_id),
            }, "proposal", owner_id, MagicMock())
        query = rules.find.call_args.args[0]
        self.assertEqual(query, {"companyId": company_id, "stageKey": "proposal", "enabled": True})
        created = actions.insert_one.await_args.args[0]
        self.assertEqual(created["companyId"], company_id)
        self.assertEqual(created["entityId"], deal_id)
        self.assertEqual(created["ownerId"], owner_id)
        self.assertEqual(created["kind"], "call")
        self.assertGreater(created["dueAt"], created["createdAt"])

    def test_rule_rejects_invalid_delay(self):
        with self.assertRaises(ValueError):
            RuleInput(stageKey="proposal", kind="call", title="Follow up", delayDays=0)


if __name__ == "__main__":
    unittest.main()
