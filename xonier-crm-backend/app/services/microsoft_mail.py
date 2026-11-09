"""Delegated Microsoft Graph mail: personal Outlook and Microsoft 365 accounts."""
import base64

import httpx
from pydantic import TypeAdapter, EmailStr

from app.core.config import get_setting
from app.core.crypto import encryptor
from app.utils.custom_exception import AppException

AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
PROFILE_URL = 'https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName'
SEND_URL = 'https://graph.microsoft.com/v1.0/me/sendMail'
SCOPES = ['openid', 'profile', 'offline_access', 'https://graph.microsoft.com/User.Read', 'https://graph.microsoft.com/Mail.Send']


def configured():
    s = get_setting()
    return bool(s.MICROSOFT_MAIL_CLIENT_ID and s.MICROSOFT_MAIL_CLIENT_SECRET and s.MICROSOFT_MAIL_REDIRECT_URI)


def client_settings():
    s = get_setting()
    return {'client_id': s.MICROSOFT_MAIL_CLIENT_ID, 'client_secret': s.MICROSOFT_MAIL_CLIENT_SECRET}


async def exchange(code, row):
    s = get_setting()
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(TOKEN_URL, data={**client_settings(), 'grant_type': 'authorization_code',
                'code': code, 'redirect_uri': s.MICROSOFT_MAIL_REDIRECT_URI,
                'code_verifier': encryptor.decrypt_data(row['verifier'])})
            if response.status_code != 200:
                raise AppException(400, 'Microsoft could not connect this account. Check tenant consent and app configuration.')
            token = response.json()
            scopes = {item.rsplit('/', 1)[-1].lower() for item in token.get('scope', '').split()}
            if 'mail.send' not in scopes:
                raise AppException(400, 'Allow the send-email permission to connect Microsoft email.')
            response = await client.get(PROFILE_URL, headers={'Authorization': f"Bearer {token['access_token']}"})
            if response.status_code != 200:
                raise AppException(400, 'Unable to verify the Microsoft mailbox. Allow profile access and check the mailbox is enabled.')
            profile = response.json()
        address = profile.get('mail') or profile.get('userPrincipalName')
        if not profile.get('id') or '#EXT#' in (address or ''):
            raise AppException(400, 'Connect an account with an enabled Outlook or Microsoft 365 mailbox.')
        address = str(TypeAdapter(EmailStr).validate_python(address))
    except (httpx.HTTPError, KeyError, ValueError, TypeError):
        raise AppException(502, 'Microsoft connection failed. Please try again.')
    return token, profile['id'], address


async def refresh(connection):
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            return await client.post(TOKEN_URL, data={**client_settings(), 'grant_type': 'refresh_token',
                'refresh_token': encryptor.decrypt_data(connection['encryptedRefreshToken']), 'scope': ' '.join(SCOPES)})
    except httpx.HTTPError:
        raise AppException(503, 'Microsoft is unavailable. Please try again shortly.')


def mime_payload(raw):
    # Gmail uses base64url; Graph MIME requires regular base64 and returns 202 with no body.
    content = base64.b64encode(base64.urlsafe_b64decode(raw)).decode()
    if len(content) > 3800000:
        raise AppException(413, 'Microsoft message is too large. Use smaller attachments (up to 2 MB total in this version).')
    return content
