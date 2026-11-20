"""Isolated campaign ownership/call regression tests; no database or phone calls."""
import asyncio
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock, patch
from bson import ObjectId, DBRef
from chat_test_env import seed_test_settings
seed_test_settings()
from app.services.campaign_service import CampaignService
from app.services.call_service import CallService
from app.utils.custom_exception import AppException


class CampaignClaimsTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.company, self.cid, self.clid, self.lid = [ObjectId() for _ in range(4)]
        self.a, self.b = ObjectId(), ObjectId()
        self.user = {'_id': str(self.a), 'companyId': str(self.company), 'userRole': [{'code': 'USER'}]}
        self.campaign = SimpleNamespace(id=self.cid, companyId=self.company, status='active',
            agents=[DBRef('users', self.a), DBRef('users', self.b)], managers=[], createdBy=self.b)
        self.service = CampaignService.__new__(CampaignService)
        self.service._get_campaign_or_404 = AsyncMock(return_value=self.campaign)
        self.links, self.camps, self.globals = Mock(), Mock(), Mock()
        self.service._lead_collection = Mock(return_value=self.links)
        self.service._collection = Mock(return_value=self.camps)
        self.service._global_leads_collection = Mock(return_value=self.globals)
        self.camps.update_one = AsyncMock()
        self.globals.update_one = AsyncMock(return_value=SimpleNamespace(matched_count=1))
        self.globals.find_one = AsyncMock(return_value={"_id": self.lid})
        self.row = {'_id': self.clid, 'companyId': self.company,
            'campaignId': DBRef('campaigns', self.cid), 'leadId': DBRef('leads', self.lid),
            'assignedTo': None, 'campaignStatus': 'unassigned'}

        async def take(query, update, **kwargs):
            await asyncio.sleep(0)
            if self.row['assignedTo'] is not None:
                return None
            self.assertIsNone(query['assignedTo'])
            self.assertEqual(query['companyId'], self.company)
            self.row.update(update['$set'])
            return deepcopy(self.row)
        self.links.find_one_and_update = AsyncMock(side_effect=take)
        self.links.find_one = AsyncMock(side_effect=lambda *args, **kw: deepcopy(self.row))

    async def claim(self, user=None):
        return await self.service.claim_lead(str(self.cid), str(self.clid), user or self.user)

    async def test_claim_assigns_and_syncs_global_lead(self):
        result = await self.claim()
        self.assertEqual(result['leadId'], str(self.lid))
        self.assertEqual(self.row['assignedTo']['$id'], self.a)
        self.globals.update_one.assert_awaited_once()
        self.camps.update_one.assert_awaited_once()

    async def test_claim_rejects_orphaned_campaign_row_before_mutation(self):
        self.globals.find_one.return_value = None

        with self.assertRaises(AppException) as error:
            await self.claim()

        self.assertEqual(error.exception.status_code, 404)
        query = self.globals.find_one.call_args.args[0]
        self.assertEqual(query["_id"], self.lid)
        self.assertEqual(query["companyId"], self.company)
        self.assertIsNone(query["deletedAt"])
        self.assertEqual(query["status"], {"$nin": ["delete", "deleted"]})
        self.links.find_one_and_update.assert_not_awaited()
        self.camps.update_one.assert_not_awaited()
        self.globals.update_one.assert_not_awaited()

    async def test_privileged_campaign_lists_exclude_deleted_and_missing_leads_before_count(self):
        cursor = SimpleNamespace(to_list=AsyncMock(return_value=[]))
        self.links.aggregate = Mock(return_value=cursor)
        for role in ("COMPANY_ADMIN", "MANAGER", "USER"):
            for search in ("", "follow-up"):
                with self.subTest(role=role, search=search):
                    self.service._get_user_campaign_scope = AsyncMock(return_value=(
                        [{"_id": self.cid}], [], {"membershipCampaignIds": {self.cid}},
                    ))
                    user = {**self.user, "userRole": [{"code": role}]}
                    response = await self.service.get_campaign_leads(str(self.cid), {"search": search}, user)
                    pipeline = self.links.aggregate.call_args.args[0]
                    unwind_index = pipeline.index({"$unwind": "$lead"})
                    self.assertEqual(pipeline[unwind_index + 1], {"$match": {
                        "lead.companyId": self.company,
                        "lead.deletedAt": None,
                        "lead.status": {"$nin": ["delete", "deleted"]},
                    }})
                    if not search:
                        self.assertIn("$facet", pipeline[-1])
                    self.assertEqual(response["total"], 0)

    async def test_claim_next_skips_a_lead_deleted_after_selection(self):
        self.campaign.distributionMode = "on_demand"
        next_id = ObjectId()

        async def candidates():
            yield {"_id": self.clid}
            yield {"_id": next_id, "lead": {"fullName": "Live lead"}}

        self.links.aggregate = Mock(return_value=candidates())
        self.service.claim_lead = AsyncMock(side_effect=[
            AppException(404, "Campaign lead not found"), {"claimed": True},
        ])

        result = await self.service.claim_next_lead(str(self.cid), self.user)

        self.assertEqual(result["campaignLead"]["_id"], str(next_id))
        self.assertEqual(self.service.claim_lead.await_count, 2)
        self.assertTrue(self.service.claim_lead.await_args.kwargs["only_unassigned"])

    async def test_two_members_race_only_one_wins(self):
        other = {**self.user, '_id': str(self.b)}
        results = await asyncio.gather(self.claim(), self.claim(other), return_exceptions=True)
        self.assertEqual(sum(isinstance(r, dict) for r in results), 1)
        failure = next(r for r in results if isinstance(r, AppException))
        self.assertEqual(failure.status_code, 409)
        self.camps.update_one.assert_awaited_once()

    async def test_beanie_link_membership_and_raw_lead_reference(self):
        self.campaign.agents = [SimpleNamespace(ref=DBRef('users', self.a))]
        self.row['leadId'] = self.lid
        self.assertEqual((await self.claim())['leadId'], str(self.lid))

    async def test_retry_is_idempotent(self):
        await self.claim()
        self.assertTrue((await self.claim())['claimed'])
        self.camps.update_one.assert_awaited_once()

    async def test_status_label_cannot_override_another_owner(self):
        self.row['assignedTo'] = DBRef('users', self.b)
        with self.assertRaises(AppException) as error:
            await self.claim()
        self.assertEqual(error.exception.status_code, 409)
        self.globals.update_one.assert_not_awaited()

    async def test_paused_nonmember_and_cross_tenant_cannot_claim(self):
        for changes, status in [({'status': 'paused'}, 400), ({'agents': [], 'createdBy': self.b}, 403),
                                ({'companyId': ObjectId()}, 404)]:
            with self.subTest(changes=changes):
                old = self.campaign.__dict__.copy()
                self.campaign.__dict__.update(changes)
                with self.assertRaises(AppException) as error:
                    await self.claim()
                self.assertEqual(error.exception.status_code, status)
                self.campaign.__dict__.update(old)
        self.links.find_one_and_update.assert_not_awaited()

    async def test_call_claims_before_creating_or_pushing_session(self):
        service = CallService.__new__(CallService)
        leads = SimpleNamespace(find_one=AsyncMock(return_value={
            '_id': self.lid, 'phone': 'test-only', 'fullName': 'Test lead'}))
        sessions = SimpleNamespace(update_many=AsyncMock(),
            insert_one=AsyncMock(return_value=SimpleNamespace(inserted_id=ObjectId())))
        service._leads = Mock(return_value=leads)
        service._col = Mock(return_value=sessions)
        service._view = Mock(return_value={})
        service._mobile_view = Mock(return_value={})
        with patch('app.services.call_service.CampaignLeadModel.get_pymongo_collection', return_value=self.links), \
             patch('app.services.call_service.CampaignService', return_value=self.service), \
             patch('app.services.call_service.manager.send', new_callable=AsyncMock) as send, \
             patch('app.services.call_service.manager.is_online', return_value=True):
            result = await service.request_call(self.user, str(self.lid), str(self.cid), str(self.clid))
            self.assertEqual(result['campaignAssignedTo'], str(self.a))
            sessions.insert_one.assert_awaited_once()
            send.assert_awaited_once()
            self.row['assignedTo'] = DBRef('users', self.b)
            sessions.insert_one.reset_mock()
            send.reset_mock()
            with self.assertRaises(AppException):
                await service.request_call(self.user, str(self.lid), str(self.cid), str(self.clid))
            sessions.insert_one.assert_not_awaited()
            send.assert_not_awaited()

    async def test_mobile_list_filters_other_owners_before_pagination(self):
        from app.services.mobile_service import MobileService
        service = MobileService.__new__(MobileService)
        service._get_accessible_campaign = AsyncMock(return_value={'_id': self.cid})
        links = Mock()
        links.aggregate.return_value = SimpleNamespace(to_list=AsyncMock(return_value=[{
            'data': [], 'total': [], 'summary': []}]))
        service._campaign_leads = Mock(return_value=links)
        service._user_map = AsyncMock(return_value={})
        service._campaign_mini = Mock(return_value={})
        await service.campaign_leads(self.user, str(self.cid), {})
        pipeline = links.aggregate.call_args.args[0]
        visible_match = next(stage['$match'] for stage in pipeline if '$match' in stage and 'assignedOid' in stage['$match'])
        self.assertEqual(visible_match['assignedOid'], {'$in': [self.a, None]})

    async def test_campaign_list_does_not_use_global_ownership(self):
        self.service._get_user_campaign_scope = AsyncMock(return_value=(
            [{'_id': self.cid}], [], {'ownLeadIds': {self.lid}}))
        cursor = SimpleNamespace(to_list=AsyncMock(return_value=[]))
        self.links.aggregate = Mock(return_value=cursor)
        await self.service.get_campaign_leads(str(self.cid), {}, self.user)
        match = self.links.aggregate.call_args.args[0][0]['$match']
        ownership = match['$and'][1]['$or']
        self.assertEqual(ownership, [{'assignedTo.$id': self.a}, {'assignedTo': self.a}, {'assignedTo': None}])
        # Even globally-owned/created leads must not bypass campaign ownership.
        self.assertNotIn('leadId', str(ownership))
