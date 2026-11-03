"""The form builder must resolve lead-status options in the requesting company."""
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from chat_test_env import seed_test_settings
seed_test_settings()

from bson import ObjectId
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient
from app.routes.form_field_route import router, dependencies, controller
from app.services.lead_status_service import LeadStatusService
from app.utils.custom_exception import AppException


class LeadFormContextTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.company_a, self.company_b = str(ObjectId()), str(ObjectId())
        app = FastAPI()

        @app.middleware('http')
        async def request_identity(request, call_next):
            company = request.headers.get('x-test-company')
            role = request.headers.get('x-test-role', 'COMPANY_ADMIN')
            request.state.user = {'userRole': [{'code': role}], 'companyId': company}
            if company:
                request.state.company = SimpleNamespace(id=ObjectId(company))
            return await call_next(request)

        @app.exception_handler(AppException)
        async def app_error(request: Request, error: AppException):
            return JSONResponse({'message': error.message}, status_code=error.status_code)

        async def authorized(): return True
        async def active_company(): return True
        app.dependency_overrides[dependencies.authorized] = authorized
        app.dependency_overrides[dependencies.company_active] = active_company
        app.include_router(router, prefix='/api/form')
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url='http://test')

        async def fields(*args, **kwargs):
            return [{'key': 'status', 'options': [], 'required': True},
                    {'key': 'fullName', 'options': None, 'required': True}]
        self.repo_patch = patch.object(controller.service, 'repo', SimpleNamespace(get_all_without_pagination=AsyncMock(side_effect=fields)))
        self.repo_patch.start()
        company_a = self.company_a

        async def config(service, **kwargs):
            company = str(service.company_id())
            return {'statuses': [{'key': 'new', 'name': 'Prospecting' if company == company_a else 'New',
                                  'type': 'ongoing', 'order': 0, 'color': '#0891b2'}]}
        self.config_patch = patch.object(LeadStatusService, 'config', config)
        self.config_patch.start()

    async def asyncTearDown(self):
        self.config_patch.stop()
        self.repo_patch.stop()
        await self.client.aclose()

    async def test_edit_form_fields_loads_with_company_statuses(self):
        response = await self.client.get('/api/form/lead/all', headers={'x-test-company': self.company_a})
        self.assertEqual(response.status_code, 200, response.text)
        fields = response.json()['data']
        self.assertEqual(fields[0]['options'], [{'label': 'Prospecting', 'value': 'new'}])
        self.assertEqual(fields[1]['key'], 'fullName')
        self.assertFalse(any(field['required'] for field in fields))

    async def test_other_company_receives_its_own_options(self):
        for company, label in [(self.company_a, 'Prospecting'), (self.company_b, 'New')]:
            response = await self.client.get('/api/form/lead/all', headers={'x-test-company': company})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()['data'][0]['options'][0]['label'], label)

    async def test_missing_company_still_fails_closed(self):
        response = await self.client.get('/api/form/lead/all')
        self.assertEqual(response.status_code, 403)

    async def test_super_admin_loads_form_fields_with_default_statuses(self):
        response = await self.client.get('/api/form/lead/all', headers={'x-test-role': 'SUPER_ADMIN'})
        self.assertEqual(response.status_code, 200, response.text)
        fields = response.json()['data']
        self.assertEqual(fields[0]['options'][0], {'label': 'New', 'value': 'new'})
