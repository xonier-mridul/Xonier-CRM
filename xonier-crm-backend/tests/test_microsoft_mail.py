import base64
import unittest
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse
from unittest.mock import AsyncMock, patch

import httpx
from bson import ObjectId

from app.services import gmail_service as mail, microsoft_mail as microsoft
from app.schemas.communication.gmail_schema import GmailSend
from app.utils.custom_exception import AppException

USER={'_id':'b'*24,'companyId':'a'*24,'userRole':[]}
SETTINGS=SimpleNamespace(MICROSOFT_MAIL_CLIENT_ID='ms-client',MICROSOFT_MAIL_CLIENT_SECRET='ms-secret',MICROSOFT_MAIL_REDIRECT_URI='http://localhost:8000/api/mail/oauth/microsoft/callback',GMAIL_CLIENT_ID='',GMAIL_CLIENT_SECRET='',GMAIL_REDIRECT_URI='')


class MicrosoftMailTests(unittest.IsolatedAsyncioTestCase):
    async def test_oauth_supports_personal_and_work_accounts_with_pkce_and_provider_bound_state(self):
        states=SimpleNamespace(insert_one=AsyncMock())
        with patch.object(mail,'database',return_value=SimpleNamespace(gmail_oauth_states=states)),patch.object(mail,'get_setting',return_value=SETTINGS),patch.object(microsoft,'get_setting',return_value=SETTINGS):
            url,state,cookie=await mail.GmailService().start(USER,'microsoft')
        query=parse_qs(urlparse(url).query)
        self.assertIn('/common/',url)
        self.assertEqual(query['code_challenge_method'],['S256'])
        self.assertIn('offline_access',query['scope'][0])
        self.assertIn('Mail.Send',query['scope'][0])
        self.assertNotIn('Mail.Read',query['scope'][0])
        self.assertEqual(states.insert_one.call_args.args[0]['provider'],'microsoft')

    async def test_microsoft_profile_email_is_from_graph_not_browser(self):
        client=AsyncMock()
        client.post.return_value=httpx.Response(200,json={'access_token':'access','refresh_token':'refresh','scope':'User.Read Mail.Send'})
        client.get.return_value=httpx.Response(200,json={'id':'verified-id','mail':'real@outlook.com','userPrincipalName':'login@outlook.com'})
        context=AsyncMock();context.__aenter__.return_value=client
        with patch.object(microsoft,'get_setting',return_value=SETTINGS),patch.object(microsoft.httpx,'AsyncClient',return_value=context):
            token,subject,email=await microsoft.exchange('code',{'verifier':mail.encryptor.encrypt_data('verifier')})
        self.assertEqual(email,'real@outlook.com')
        self.assertEqual(subject,'verified-id')
        self.assertEqual(client.post.call_args.kwargs['data']['code_verifier'],'verifier')

    async def test_microsoft_success_is_202_empty_body_with_regular_base64_mime(self):
        history=SimpleNamespace(find_one=AsyncMock(return_value=None),insert_one=AsyncMock(),update_one=AsyncMock())
        receipts=SimpleNamespace(find_one=AsyncMock(return_value=None),insert_one=AsyncMock(),update_one=AsyncMock())
        connection={'_id':ObjectId(),'provider':'microsoft','accountEmail':'agent@outlook.com','encryptedRefreshToken':'sealed'}
        db=SimpleNamespace(email_history=history,gmail_send_requests=receipts,gmail_connections=SimpleNamespace(find_one=AsyncMock(return_value=connection)))
        client=AsyncMock();client.post.return_value=httpx.Response(202)
        context=AsyncMock();context.__aenter__.return_value=client
        service=mail.GmailService()
        command=GmailSend(requestId='12345678-1234-1234-1234-123456789012',to=['recipient@example.com'],subject='Hello',body='Message')
        with patch.object(mail,'database',return_value=db),patch.object(microsoft,'get_setting',return_value=SETTINGS),patch.object(mail.httpx,'AsyncClient',return_value=context),patch.object(service,'access_token',AsyncMock(return_value='access')):
            result=await service.send(USER,command,[])
        self.assertEqual(result['status'],'sent')
        self.assertIsNone(result['messageId'])
        self.assertEqual(client.post.call_args.args[0],microsoft.SEND_URL)
        self.assertIn(b'agent@outlook.com',base64.b64decode(client.post.call_args.kwargs['content']))
        self.assertEqual(history.insert_one.call_args.args[0]['provider'],'microsoft')

    async def test_rotated_refresh_token_is_saved_only_to_original_grant(self):
        client=AsyncMock();client.post.return_value=httpx.Response(200,json={'access_token':'access','refresh_token':'new-refresh'})
        context=AsyncMock();context.__aenter__.return_value=client
        connections=SimpleNamespace(update_one=AsyncMock())
        connection={'_id':ObjectId(),'provider':'microsoft','encryptedRefreshToken':mail.encryptor.encrypt_data('old-refresh')}
        with patch.object(mail,'database',return_value=SimpleNamespace(gmail_connections=connections)),patch.object(microsoft,'get_setting',return_value=SETTINGS),patch.object(microsoft.httpx,'AsyncClient',return_value=context):
            self.assertEqual(await mail.GmailService().access_token(connection),'access')
        query,update=connections.update_one.call_args.args
        self.assertEqual(query['encryptedRefreshToken'],connection['encryptedRefreshToken'])
        self.assertEqual(mail.encryptor.decrypt_data(update['$set']['encryptedRefreshToken']),'new-refresh')

    async def test_provider_switch_cannot_reuse_google_refresh_token(self):
        old={'provider':'google','providerSubject':'same-id','encryptedRefreshToken':'google-token'}
        connections=SimpleNamespace(find_one=AsyncMock(return_value=old),update_one=AsyncMock())
        with patch.object(mail,'database',return_value=SimpleNamespace(gmail_connections=connections)),patch.object(microsoft,'exchange',AsyncMock(return_value=({},'same-id','new@outlook.com'))):
            with self.assertRaises(AppException): await mail.GmailService().finish_microsoft('code',mail.scope(USER))
        connections.update_one.assert_not_awaited()

    async def test_disconnect_drops_local_microsoft_grant_without_revoking_all_user_sessions(self):
        connections=SimpleNamespace(find_one_and_delete=AsyncMock(return_value={'provider':'microsoft'}))
        states=SimpleNamespace(delete_many=AsyncMock())
        with patch.object(mail,'database',return_value=SimpleNamespace(gmail_connections=connections,gmail_oauth_states=states)),patch.object(mail.httpx,'AsyncClient') as http:
            result=await mail.GmailService().disconnect(USER)
        self.assertFalse(result['revoked'])
        http.assert_not_called()

    def test_graph_large_mime_is_rejected_before_submission(self):
        with self.assertRaises(AppException): microsoft.mime_payload(base64.urlsafe_b64encode(b'x'*3000000).decode())


if __name__=='__main__':
    unittest.main()
