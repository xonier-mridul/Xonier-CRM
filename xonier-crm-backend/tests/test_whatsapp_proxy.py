import unittest
import base64
import hashlib
import hmac
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
import httpx
from app.routes import whatsapp_route as route
from app.utils.custom_exception import AppException

class WhatsAppProxyTests(unittest.IsolatedAsyncioTestCase):
    async def test_signed_scope_and_safe_transport_failure(self):
        settings = SimpleNamespace(WHATSAPP_BRIDGE_SECRET='local-test-secret', WHATSAPP_BRIDGE_URL='http://private-worker')
        user = {'_id':'b'*24,'companyId':'a'*24,'userRole':[{'code':'COMPANY_ADMIN'}]}
        request = SimpleNamespace(state=SimpleNamespace(user=user))
        response = httpx.Response(200,json={'status':'connected'})
        client = AsyncMock()
        client.request.return_value=response
        context = AsyncMock()
        context.__aenter__.return_value=client
        with patch.object(route,'get_setting',return_value=settings),patch.object(route.httpx,'AsyncClient',return_value=context):
            assert await route.bridge(request,'GET','/connection') == {'status':'connected'}
            args=client.request.call_args.kwargs
            ticket=args['headers']['Authorization'].removeprefix('Bearer ')
            payload, signature=ticket.split('.')
            assert hmac.compare_digest(base64.urlsafe_b64decode(signature+'=='),hmac.new(b'local-test-secret',payload.encode(),hashlib.sha256).digest())
            decoded=json.loads(base64.urlsafe_b64decode(payload+'=='))
            assert decoded['company']=='a'*24 and decoded['user']=='b'*24 and decoded['admin'] is True
            user['userRole']=[]
            await route.bridge(request,'GET','/connection')
            payload=client.request.call_args.kwargs['headers']['Authorization'].split()[1].split('.')[0]
            assert json.loads(base64.urlsafe_b64decode(payload+'=='))['admin'] is False
            client.request.side_effect=httpx.ConnectError('private credentials must not leak')
            try: await route.bridge(request,'GET','/connection')
            except AppException as error: assert error.status_code==503 and 'credentials' not in error.message
            else: raise AssertionError('Expected unavailable error')
        print('Proxy checks passed: signed tenant/user tickets, admin role and safe network failure.')

if __name__ == '__main__':
    unittest.main()
