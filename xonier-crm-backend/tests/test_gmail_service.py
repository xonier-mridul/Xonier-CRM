import base64
import unittest
from datetime import timedelta
from email import policy
from email.parser import BytesParser
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
from bson import ObjectId
from pydantic import ValidationError

from app.schemas.communication.gmail_schema import GmailSend
from app.services import gmail_service as module
from app.services.gmail_service import GmailService, SEND_SCOPE, make_message, now, scope
from app.utils.custom_exception import AppException

USER = {'_id': 'b' * 24, 'companyId': 'a' * 24, 'firstName': 'Agent', 'userRole': []}
SETTINGS = SimpleNamespace(GMAIL_CLIENT_ID='client-id', GMAIL_CLIENT_SECRET='client-secret', GMAIL_REDIRECT_URI='http://localhost:8000/api/gmail/oauth/callback')


def command(**changes):
    return GmailSend(**{'requestId':'12345678-1234-1234-1234-123456789012','to':['recipient@example.com'],'subject':'Hello','body':'A plain message',**changes})


class GmailMessageTests(unittest.TestCase):
    def test_sender_is_connected_account_and_attachments_are_real_mime(self):
        raw = make_message('connected@gmail.com', command(cc=['cc@example.com'], bcc=['private@example.com']), [{'name':'quote.pdf','content':b'%PDF-test'}])
        parsed = BytesParser(policy=policy.default).parsebytes(base64.urlsafe_b64decode(raw))
        self.assertEqual(parsed['From'], 'connected@gmail.com')
        self.assertEqual(parsed['Bcc'], 'private@example.com')
        attachment = list(parsed.iter_attachments())[0]
        self.assertEqual(attachment.get_filename(), 'quote.pdf')
        self.assertEqual(attachment.get_payload(decode=True), b'%PDF-test')

    def test_headers_and_recipient_limits_are_validated(self):
        with self.assertRaises(ValidationError): command(subject='Subject\r\nBcc: steal@example.com')
        with self.assertRaises(ValidationError): command(to=['invalid'])
        with self.assertRaises(ValidationError): command(to=[f'u{i}@example.com' for i in range(20)], cc=['extra@example.com'])
        with self.assertRaises(AppException): scope({'_id':'invalid'})

    def test_completed_idempotent_send_returns_original_without_resending(self):
        record={'_id':ObjectId(), 'gmailPayloadHash':'hash', 'gmailOutcome':'sent', 'provider_message_id':'google-message-id'}
        self.assertEqual(GmailService.previous_send(record,'hash')['messageId'],'google-message-id')
        with self.assertRaises(AppException): GmailService.previous_send(record,'other-payload')
        record['gmailOutcome']='unknown'
        with self.assertRaises(AppException): GmailService.previous_send(record,'hash')


class GmailOAuthTests(unittest.IsolatedAsyncioTestCase):
    async def test_start_requests_only_send_scope_and_browser_bound_pkce(self):
        from urllib.parse import urlparse, parse_qs
        states=SimpleNamespace(insert_one=AsyncMock())
        with patch.object(module,'database',return_value=SimpleNamespace(gmail_oauth_states=states)), patch.object(module,'get_setting',return_value=SETTINGS):
            url,state,cookie=await GmailService().start(USER)
        query=parse_qs(urlparse(url).query)
        self.assertIn(SEND_SCOPE,query['scope'][0])
        self.assertNotIn('gmail.readonly',query['scope'][0])
        self.assertEqual(query['code_challenge_method'],['S256'])
        row=states.insert_one.call_args.args[0]
        self.assertEqual(row['userId'],ObjectId(USER['_id']))
        self.assertNotEqual(row['_id'],state)
        self.assertNotEqual(row['cookieHash'],cookie)
        self.assertLess(row['expiresAt'],now()+timedelta(minutes=11))

    async def test_callback_rejects_replayed_or_wrong_browser_state(self):
        collection=SimpleNamespace(find_one_and_delete=AsyncMock(return_value=None))
        with patch.object(module,'database',return_value=SimpleNamespace(gmail_oauth_states=collection)):
            with self.assertRaises(AppException): await GmailService().consume_state('a'*40,'wrong-browser')
        query=collection.find_one_and_delete.call_args.args[0]
        self.assertEqual(query['cookieHash'],module.digest('wrong-browser'))
        self.assertIn('$gt',query['expiresAt'])

    async def test_switching_accounts_never_reuses_old_account_refresh_token(self):
        client=AsyncMock()
        client.post.return_value=httpx.Response(200,json={'access_token':'temporary','scope':SEND_SCOPE})
        client.get.return_value=httpx.Response(200,json={'sub':'new-account','email':'new@gmail.com','email_verified':True})
        context=AsyncMock();context.__aenter__.return_value=client
        connections=SimpleNamespace(find_one=AsyncMock(return_value={'googleSubject':'old-account','encryptedRefreshToken':'old'}),update_one=AsyncMock())
        row={**scope(USER),'verifier':module.encryptor.encrypt_data('verifier')}
        with patch.object(module,'database',return_value=SimpleNamespace(gmail_connections=connections)),patch.object(module,'get_setting',return_value=SETTINGS),patch.object(module.httpx,'AsyncClient',return_value=context):
            with self.assertRaises(AppException): await GmailService().finish('code',row)
        connections.update_one.assert_not_awaited()

    async def test_send_records_company_and_agent_and_uses_own_gmail(self):
        connection={'_id':ObjectId(),'accountEmail':'agent@gmail.com','encryptedRefreshToken':'sealed'}
        history=SimpleNamespace(find_one=AsyncMock(return_value=None),insert_one=AsyncMock(),update_one=AsyncMock())
        connections=SimpleNamespace(find_one=AsyncMock(return_value=connection))
        receipts=SimpleNamespace(find_one=AsyncMock(return_value=None),insert_one=AsyncMock(),update_one=AsyncMock())
        db=SimpleNamespace(gmail_connections=connections,email_history=history,gmail_send_requests=receipts)
        client=AsyncMock();client.post.return_value=httpx.Response(200,json={'id':'sent-id'})
        context=AsyncMock();context.__aenter__.return_value=client
        service=GmailService()
        with patch.object(module,'database',return_value=db),patch.object(module,'get_setting',return_value=SETTINGS),patch.object(module.httpx,'AsyncClient',return_value=context),patch.object(service,'access_token',AsyncMock(return_value='access')):
            result=await service.send(USER,command(),[])
        self.assertEqual(result['status'],'sent')
        self.assertEqual(connections.find_one.call_args.args[0],scope(USER))
        record=history.insert_one.call_args.args[0]
        self.assertEqual(record['from_email'],'agent@gmail.com')
        self.assertEqual(record['companyId'],ObjectId(USER['companyId']))
        self.assertEqual(record['gmailUserId'],ObjectId(USER['_id']))
        self.assertNotIn('encryptedRefreshToken',record)

    async def test_gmail_history_cannot_be_resent_with_shared_smtp(self):
        from app.services.communication.email_service import EmailService
        service = EmailService()
        service.history_repo = SimpleNamespace(find_one=AsyncMock(return_value=SimpleNamespace(provider='gmail')))
        with patch.object(service, '_dispatch_email', AsyncMock()) as smtp:
            with self.assertRaises(AppException) as error:
                await service.resend_email('c' * 24, {}, USER)
            self.assertEqual(error.exception.status_code, 400)
            smtp.assert_not_awaited()

    async def test_revoked_refresh_marks_only_this_connection_for_reconnect(self):
        client=AsyncMock();client.post.return_value=httpx.Response(400,json={'error':'invalid_grant'})
        context=AsyncMock();context.__aenter__.return_value=client
        connections=SimpleNamespace(update_one=AsyncMock())
        connection={'_id':ObjectId(),'encryptedRefreshToken':module.encryptor.encrypt_data('refresh')}
        with patch.object(module,'database',return_value=SimpleNamespace(gmail_connections=connections)),patch.object(module,'get_setting',return_value=SETTINGS),patch.object(module.httpx,'AsyncClient',return_value=context):
            with self.assertRaises(AppException) as error:
                await GmailService().access_token(connection)
            self.assertEqual(error.exception.status_code,409)
        self.assertEqual(connections.update_one.call_args.args[0],{'_id':connection['_id'], 'encryptedRefreshToken':connection['encryptedRefreshToken']})

    async def test_admin_flag_does_not_grant_company_history_to_regular_agent(self):
        with self.assertRaises(AppException) as error:
            await GmailService().outbox(USER,company=True)
        self.assertEqual(error.exception.status_code,403)


if __name__ == '__main__':
    unittest.main()
