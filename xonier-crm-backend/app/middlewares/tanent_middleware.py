

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.core.tenant import current_company, is_admin_context


class TenantMiddleware(BaseHTTPMiddleware):

    async def dispatch(self, request: Request, call_next):
        company_token = current_company.set(None)
        admin_token = is_admin_context.set(False)
        try:
            response = await call_next(request)
            return response
        finally:
            current_company.reset(company_token)
            is_admin_context.reset(admin_token)