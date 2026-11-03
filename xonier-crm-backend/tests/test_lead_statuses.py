import unittest
from copy import deepcopy
from unittest.mock import AsyncMock, MagicMock
from bson import ObjectId
from pydantic import ValidationError
from app.core.tenant import current_company
from app.schemas.lead_status_schema import LeadStatusSchema
from app.services.lead_status_service import DEFAULT_STATUSES, LeadStatusService, validate_stages
from app.utils.custom_exception import AppException
from app.utils.pipeline_stats import matches_pipeline_filter, summarize_lead_groups

class Rules(unittest.TestCase):
    def test_rename_preserves_key_and_final_is_last(self):
        stages = deepcopy(DEFAULT_STATUSES)
        next(s for s in stages if s['type']=='final')['order'] = 0
        stages[0]['name'] = 'Prospecting'
        result = validate_stages(stages)
        self.assertEqual(result[-1]['key'], 'won')
        self.assertEqual(result[0]['key'], 'new')
        self.assertEqual(result[0]['name'], 'Prospecting')
        self.assertNotIn('delete', {s['key'] for s in result})
    def test_second_final_rejected(self):
        stages = deepcopy(DEFAULT_STATUSES)
        stages[0]['type'] = 'final'
        with self.assertRaises(AppException): validate_stages(stages)
    def test_duplicate_name_rejected(self):
        stages = deepcopy(DEFAULT_STATUSES)
        stages[1]['name'] = ' NEW '
        with self.assertRaises(AppException): validate_stages(stages)
    def test_ongoing_required(self):
        with self.assertRaises(AppException): validate_stages([deepcopy(next(s for s in DEFAULT_STATUSES if s['type']=='final'))])
    def test_payload_validation(self):
        for patch in [dict(name=' '), dict(type='closed'), dict(color='red'), dict(order=-1)]:
            with self.subTest(patch=patch), self.assertRaises(ValidationError):
                LeadStatusSchema(**dict({'name':'Response', 'type':'ongoing'}, **patch))
    def test_final_reporting_separate_from_engagement(self):
        lead = {'status':'stage_close', 'connectStatus':'interested'}
        self.assertTrue(matches_pipeline_filter(lead, 'closed_won', ['stage_close']))
        self.assertFalse(matches_pipeline_filter(lead, 'in_progress', ['stage_close']))
        result = summarize_lead_groups([{'_id':lead, 'count':3}, {'_id':{'status':'lost'}, 'count':2}], ['stage_close'])
        self.assertEqual(result['totalClosed'], 3)
        self.assertEqual(result['totalInProgress'], 2)
        self.assertEqual(result['highlights']['interested'], 0)

class Service(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.s = LeadStatusService.__new__(LeadStatusService)
        self.cid = ObjectId()
        self.token = current_company.set(str(self.cid))
        self.s.config = AsyncMock(return_value={'_id':self.cid, 'statuses':deepcopy(DEFAULT_STATUSES)})
        self.s.collection = MagicMock(update_one=AsyncMock())
        self.leads = MagicMock(count_documents=AsyncMock(return_value=1))
        self.s.db = {'leads':self.leads}
        self.session = MagicMock()
        self.session.__aenter__ = AsyncMock(return_value=self.session)
        self.session.__aexit__ = AsyncMock(return_value=False)
        tx = MagicMock()
        tx.__aenter__ = AsyncMock()
        tx.__aexit__ = AsyncMock(return_value=False)
        self.session.start_transaction.return_value = tx
        self.s.client = MagicMock(start_session=AsyncMock(return_value=self.session))
        self.s.list = AsyncMock(return_value=[])
    def tearDown(self): current_company.reset(self.token)
    async def test_missing_company_fails_closed(self):
        current_company.set(None)
        with self.assertRaises(AppException): self.s.company_id()
    async def test_unknown_and_delete_rejected(self):
        for key in ['delete', 'stage_other_company', 'missing']:
            with self.subTest(key=key), self.assertRaises(AppException): await self.s.resolve(key, session=self.session)
    async def test_resolution_takes_transaction_lock(self):
        self.assertEqual(await self.s.resolve(session=self.session), 'new')
        self.assertEqual(await self.s.resolve('Contacted', session=self.session), 'contacted')
        self.assertEqual(await self.s.resolve(final=True, session=self.session), 'won')
        self.s.config.assert_awaited_with(session=self.session, lock=True)
    async def test_used_deletion_blocked(self):
        with self.assertRaises(AppException) as e: await self.s.mutate(key='new', delete=True)
        self.assertEqual(e.exception.status_code, 409)
        self.leads.count_documents.assert_awaited_once_with({'companyId':self.cid,'status':'new'}, session=self.session)
        self.s.collection.update_one.assert_not_awaited()
    async def test_unused_deletion(self):
        self.leads.count_documents.return_value = 0
        await self.s.mutate(key='contacted', delete=True)
        saved = self.s.collection.update_one.call_args.args[1]['$set']['statuses']
        self.assertNotIn('contacted', {s['key'] for s in saved})
        self.assertEqual(self.s.collection.update_one.call_args.args[0], {'_id':self.cid})
    async def test_rename_keeps_identity(self):
        await self.s.mutate({'name':'Prospecting','type':'ongoing','color':'#123456','order':0}, key='new')
        saved = self.s.collection.update_one.call_args.args[1]['$set']['statuses']
        self.assertEqual(next(s for s in saved if s['key']=='new')['name'], 'Prospecting')
    async def test_missing_or_other_company_key_rejected(self):
        with self.assertRaises(AppException) as e: await self.s.mutate({'name':'X'}, key='other_key')
        self.assertEqual(e.exception.status_code,404)
        self.s.collection.update_one.assert_not_awaited()

class TransactionRetries(unittest.IsolatedAsyncioTestCase):
    async def test_transient_abort_retries_wrapped_exception(self):
        from app.utils.transaction_retry import retry_transaction
        from pymongo.errors import OperationFailure
        attempts = []
        @retry_transaction
        async def work():
            attempts.append(1)
            if len(attempts) == 1:
                try:
                    raise OperationFailure('conflict', details={'errorLabels':['TransientTransactionError']})
                except OperationFailure:
                    raise AppException(500, 'wrapped')
            return 'ok'
        self.assertEqual(await work(), 'ok')
        self.assertEqual(len(attempts), 2)
    async def test_unknown_commit_result_not_retried(self):
        from app.utils.transaction_retry import retry_transaction
        from pymongo.errors import OperationFailure
        attempts = []
        @retry_transaction
        async def work():
            attempts.append(1)
            raise OperationFailure('uncertain commit', details={'errorLabels':['UnknownTransactionCommitResult']})
        with self.assertRaises(OperationFailure): await work()
        self.assertEqual(len(attempts), 1)
