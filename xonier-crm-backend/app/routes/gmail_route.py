import html
import json
import re
import secrets
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import HTMLResponse

from app.core.config import get_setting
from app.core.dependencies import Dependencies
from app.core.rate_limiter import limiter
from app.routes.email_upload import send_email_upload
from app.services.gmail_service import GmailService
from app.utils.custom_exception import AppException

router = APIRouter(prefix="/api/gmail", tags=["Gmail"])
service = GmailService()
deps = Dependencies()
user_access = [Depends(deps.authorized), Depends(deps.company_active), Depends(deps.company_context)]
send_access = [*user_access, Depends(deps.permissions(["email:send"]))]


def cookie_name(state):
    return "gmail_oauth_" + (state[:12] if re.fullmatch(r"[A-Za-z0-9_-]{32,128}", state or "") else "invalid")


@router.get('/connection', dependencies=send_access)
async def connection(request: Request):
    return await service.status(request.state.user)


@router.post('/connect', dependencies=send_access)
async def connect(request: Request, response: Response):
    url, state, cookie = await service.start(request.state.user)
    response.set_cookie(cookie_name(state), cookie, max_age=600, httponly=True, samesite='lax',
                        secure=get_setting().GMAIL_REDIRECT_URI.startswith('https://'), path=urlsplit(get_setting().GMAIL_REDIRECT_URI).path)
    response.headers['Cache-Control'] = 'no-store'
    return {'authorizationUrl': url}


@router.get('/oauth/callback')
async def callback(request: Request, code: str | None = None, state: str | None = None, error: str | None = None):
    result = 'error'
    try:
        row = await service.consume_state(state, request.cookies.get(cookie_name(state)))
        if row.get("provider", "google") != "google":
            raise AppException(400, "Invalid email provider")
        if error:
            result = 'denied'
        elif code:
            await service.finish(code, row)
            result = 'connected'
    except Exception:
        # OAuth codes, provider replies and token payloads must never be reflected to the browser.
        result = 'error'
    settings = get_setting()
    parsed = urlsplit(settings.CLIENT_URL)
    origin = f'{parsed.scheme}://{parsed.netloc}'
    destination = settings.CLIENT_URL.rstrip('/') + '/emailManagement/mail'
    nonce = secrets.token_urlsafe(24)
    title = 'Gmail connected. You can close this window.' if result == 'connected' else 'Gmail was not connected. Return to the CRM and try again, allowing email access.'
    content = f'''<!doctype html><html><head><meta charset="utf-8"><title>Gmail connection</title></head>
<body><p>{title}</p><a href="{html.escape(destination, quote=True)}">Return to CRM</a>
<script nonce="{nonce}">if(window.opener){{window.opener.postMessage({json.dumps({'type':'xonier:gmail','result':result})},{json.dumps(origin)});window.close();}}</script></body></html>'''
    response = HTMLResponse(content, headers={'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': f"default-src 'none'; script-src 'nonce-{nonce}'; frame-ancestors 'none'; base-uri 'none'"})
    response.delete_cookie(cookie_name(state), path='/api/gmail/oauth/callback')
    return response


@router.delete('/connection', dependencies=send_access)
async def disconnect(request: Request):
    return await service.disconnect(request.state.user)


@router.post('/send', dependencies=send_access)
@limiter.limit('30/minute')
async def send(request: Request):
    return await send_email_upload(request, service)


@router.get('/outbox', dependencies=send_access)
async def outbox(request: Request, company: bool = False):
    if company:
        await deps.permissions(['email:read'])(request)
    return await service.outbox(request.state.user, company)
