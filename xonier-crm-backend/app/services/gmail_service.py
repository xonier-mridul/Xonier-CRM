"""User-authorized Google/Microsoft sending with one shared CRM history and composer."""
import base64
import hashlib
import html
import importlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from urllib.parse import urlencode

import httpx
from bson import DBRef, ObjectId
from pymongo.errors import DuplicateKeyError

from app.core.config import get_setting
from app.core.crypto import encryptor
from app.utils.custom_exception import AppException
from app.services import microsoft_mail

SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"
SCOPES = ["openid", "email", SEND_SCOPE]
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


def now():
    return datetime.now(timezone.utc)


def database():
    db = importlib.import_module("app.db.db").db
    if db is None:
        raise AppException(503, "Email database is unavailable")
    return db


def scope(user):
    uid, company = str(user.get("_id") or user.get("id") or ""), str(user.get("companyId") or "")
    if not ObjectId.is_valid(uid) or not ObjectId.is_valid(company):
        raise AppException(403, "An active company account is required")
    return {"userId": ObjectId(uid), "companyId": ObjectId(company)}


def configured(provider="google"):
    if provider == "microsoft":
        return microsoft_mail.configured()
    settings = get_setting()
    return bool(settings.GMAIL_CLIENT_ID and settings.GMAIL_CLIENT_SECRET and settings.GMAIL_REDIRECT_URI)


def require_configured(provider="google"):
    if provider not in {"google", "microsoft"}:
        raise AppException(400, "Unsupported email provider")
    if provider == "microsoft" and not configured(provider):
        raise AppException(503, "Microsoft email is not configured yet. Your administrator needs to finish the one-time Microsoft app setup.")
    if not configured(provider):
        raise AppException(503, "Gmail connection is not configured yet. Your administrator needs to finish the one-time Google setup.")


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def make_message(account_email, command, attachments):
    message = EmailMessage()
    message["From"] = account_email
    message["To"] = ", ".join(map(str, command.to))
    if command.cc:
        message["Cc"] = ", ".join(map(str, command.cc))
    # Bcc recipients must be in raw MIME for Gmail to deliver; this is never sent via browser mailto.
    if command.bcc:
        message["Bcc"] = ", ".join(map(str, command.bcc))
    message["Subject"] = command.subject
    message.set_content(command.body)
    for attachment in attachments:
        message.add_attachment(attachment["content"], maintype="application", subtype="octet-stream", filename=attachment["name"])
    return base64.urlsafe_b64encode(message.as_bytes()).decode()


class GmailService:
    async def start(self, user, provider="google"):
        require_configured(provider)
        settings = get_setting()
        state, cookie, verifier = secrets.token_urlsafe(32), secrets.token_urlsafe(32), secrets.token_urlsafe(64)
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
        await database().gmail_oauth_states.insert_one({
            "_id": digest(state), **scope(user), "cookieHash": digest(cookie), "provider": provider,
            "verifier": encryptor.encrypt_data(verifier), "expiresAt": now() + timedelta(minutes=10),
        })
        if provider == "microsoft":
            url = microsoft_mail.AUTH_URL + "?" + urlencode({
                "client_id": settings.MICROSOFT_MAIL_CLIENT_ID, "redirect_uri": settings.MICROSOFT_MAIL_REDIRECT_URI,
                "response_type": "code", "response_mode": "query", "scope": " ".join(microsoft_mail.SCOPES),
                "prompt": "select_account", "state": state, "code_challenge": challenge, "code_challenge_method": "S256",
            })
            return url, state, cookie
        url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({
            "client_id": settings.GMAIL_CLIENT_ID, "redirect_uri": settings.GMAIL_REDIRECT_URI,
            "response_type": "code", "scope": " ".join(SCOPES), "access_type": "offline",
            "prompt": "consent select_account", "state": state, "code_challenge": challenge,
            "code_challenge_method": "S256",
        })
        return url, state, cookie

    async def consume_state(self, state, cookie):
        if not state or not cookie or len(state) > 128 or len(cookie) > 128:
            raise AppException(400, "Gmail connection expired. Please connect again.")
        row = await database().gmail_oauth_states.find_one_and_delete({
            "_id": digest(state), "cookieHash": digest(cookie), "expiresAt": {"$gt": now()},
        })
        if not row:
            raise AppException(400, "Gmail connection expired. Please connect again.")
        user = await database().users.find_one({"_id": row["userId"], "companyId": row["companyId"], "status": "active", "deletedAt": None})
        company = await database().companies.find_one({"_id": row["companyId"], "status": "active", "deletedAt": None})
        if not user or not company:
            raise AppException(403, "Your CRM account is no longer active")
        return row

    async def finish(self, code, row):
        provider = row.get("provider", "google")
        require_configured(provider)
        if provider == "microsoft":
            return await self.finish_microsoft(code, row)
        settings = get_setting()
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                result = await client.post(TOKEN_URL, data={
                    "client_id": settings.GMAIL_CLIENT_ID, "client_secret": settings.GMAIL_CLIENT_SECRET,
                    "redirect_uri": settings.GMAIL_REDIRECT_URI, "code": code,
                    "code_verifier": encryptor.decrypt_data(row["verifier"]), "grant_type": "authorization_code",
                })
                if result.status_code != 200:
                    raise AppException(400, "Google could not connect this account. Please try again.")
                token = result.json()
                if SEND_SCOPE not in token.get("scope", "").split():
                    raise AppException(400, "Allow the send-email permission to connect Gmail.")
                result = await client.get(USERINFO_URL, headers={"Authorization": f"Bearer {token['access_token']}"})
                if result.status_code != 200:
                    raise AppException(400, "Unable to verify the Google account")
                profile = result.json()
        except (httpx.HTTPError, KeyError, ValueError):
            raise AppException(502, "Google connection failed. Please try again.")
        if not profile.get("sub") or not profile.get("email") or profile.get("email_verified") is not True:
            raise AppException(400, "Connect a verified Google email account")
        query = {"userId": row["userId"], "companyId": row["companyId"]}
        old = await database().gmail_connections.find_one(query)
        refresh = token.get("refresh_token")
        # Never reuse a token from a different Google account when switching accounts.
        if not refresh and old and old.get("provider", "google") == "google" and old.get("googleSubject") == profile["sub"]:
            refresh = encryptor.decrypt_data(old["encryptedRefreshToken"])
        if not refresh:
            raise AppException(400, "Google did not grant offline access. Connect again and allow access.")
        await database().gmail_connections.update_one(query, {"$set": {
            **query, "provider": "google", "accountEmail": profile["email"], "googleSubject": profile["sub"],
            "encryptedRefreshToken": encryptor.encrypt_data(refresh), "needsReconnect": False, "updatedAt": now(),
        }}, upsert=True)

    async def finish_microsoft(self, code, row):
        token, subject, address = await microsoft_mail.exchange(code, row)
        query = {"userId": row["userId"], "companyId": row["companyId"]}
        old = await database().gmail_connections.find_one(query)
        refresh = token.get("refresh_token")
        if not refresh and old and old.get("provider") == "microsoft" and old.get("providerSubject") == subject:
            refresh = encryptor.decrypt_data(old["encryptedRefreshToken"])
        if not refresh:
            raise AppException(400, "Microsoft did not grant offline access. Connect again and allow access.")
        await database().gmail_connections.update_one(query, {"$set": {
            **query, "provider": "microsoft", "providerSubject": subject, "accountEmail": address,
            "encryptedRefreshToken": encryptor.encrypt_data(refresh), "needsReconnect": False, "updatedAt": now(),
        }}, upsert=True)

    async def status(self, user):
        connection = await database().gmail_connections.find_one(scope(user))
        providers = {"google": configured(), "microsoft": configured("microsoft")}
        provider = connection.get("provider", "google") if connection else None
        return {"configured": any(providers.values()), "providers": providers, "provider": provider,
                "connected": bool(connection and providers.get(provider) and not connection.get("needsReconnect")),
                "accountEmail": connection.get("accountEmail") if connection else None,
                "needsReconnect": bool(connection and connection.get("needsReconnect")),
                "canViewCompany": any(role.get("code") in {"COMPANY_ADMIN", "ADMIN"} for role in user.get("userRole", []))}

    async def disconnect(self, user):
        query = scope(user)
        connection = await database().gmail_connections.find_one_and_delete(query)
        await database().gmail_oauth_states.delete_many(query)
        revoked = True
        if connection and connection.get("provider") == "microsoft":
            # There is no delegated Graph endpoint to revoke only our own grant.
            # Delete local tokens; user can also remove consent in Microsoft account settings.
            return {"success": True, "revoked": False, "provider": "microsoft"}
        if connection:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    result = await client.post("https://oauth2.googleapis.com/revoke", data={
                        "token": encryptor.decrypt_data(connection["encryptedRefreshToken"]),
                    })
                    revoked = result.status_code in (200, 400)
            except (httpx.HTTPError, ValueError):
                revoked = False
        return {"success": True, "revoked": revoked}

    async def access_token(self, connection):
        if connection.get("provider") == "microsoft":
            response = await microsoft_mail.refresh(connection)
            if response.status_code in (400, 401):
                await database().gmail_connections.update_one({"_id": connection["_id"], "encryptedRefreshToken": connection["encryptedRefreshToken"]}, {"$set": {"needsReconnect": True}})
                raise AppException(409, "Microsoft permission expired or was revoked. Connect your email again.")
            if response.status_code != 200 or not response.json().get("access_token"):
                raise AppException(503, "Unable to refresh Microsoft email access. Please try again.")
            token = response.json()
            if token.get("refresh_token"):
                await database().gmail_connections.update_one({"_id": connection["_id"], "encryptedRefreshToken": connection["encryptedRefreshToken"]}, {"$set": {"encryptedRefreshToken": encryptor.encrypt_data(token["refresh_token"])}})
            return token["access_token"]
        settings = get_setting()
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(TOKEN_URL, data={
                    "client_id": settings.GMAIL_CLIENT_ID, "client_secret": settings.GMAIL_CLIENT_SECRET,
                    "refresh_token": encryptor.decrypt_data(connection["encryptedRefreshToken"]), "grant_type": "refresh_token",
                })
        except httpx.HTTPError:
            raise AppException(503, "Google is unavailable. Please try again shortly.")
        if response.status_code in (400, 401):
            await database().gmail_connections.update_one({"_id": connection["_id"], "encryptedRefreshToken": connection["encryptedRefreshToken"]}, {"$set": {"needsReconnect": True}})
            raise AppException(409, "Your Gmail permission expired or was revoked. Connect Gmail again.")
        if response.status_code != 200 or not response.json().get("access_token"):
            raise AppException(503, "Unable to refresh Gmail access. Please try again.")
        return response.json()["access_token"]

    async def send(self, user, command, attachments):
        query = scope(user)
        history = database().email_history
        receipts = database().gmail_send_requests
        request_key = f"{query['companyId']}:{query['userId']}:{command.requestId}"
        payload = command.model_dump(mode="json", exclude={"requestId"})
        payload_hash = digest(json.dumps(payload, sort_keys=True) + json.dumps([
            {"name": item["name"], "hash": hashlib.sha256(item["content"]).hexdigest()} for item in attachments], sort_keys=True))
        existing = await receipts.find_one({"_id": request_key})
        if existing:
            return self.previous_send(existing, payload_hash)
        connection = await database().gmail_connections.find_one(query)
        if not connection or connection.get("needsReconnect"):
            raise AppException(409, "Connect your email before sending")
        provider = connection.get("provider", "google")
        require_configured(provider)
        if provider == "microsoft" and sum(len(item["content"]) for item in attachments) > 2 * 1024 * 1024:
            raise AppException(413, "Microsoft attachments must total 2 MB or less in this version")
        if command.leadId:
            from app.services.lead_service import LeadService
            await LeadService().get_by_id(command.leadId, user)
        token = await self.access_token(connection)
        raw = make_message(connection["accountEmail"], command, attachments)
        microsoft_content = microsoft_mail.mime_payload(raw) if provider == "microsoft" else None
        record = {
            "_id": ObjectId(), "companyId": query["companyId"], "gmailUserId": query["userId"],
            "sent_by": DBRef("users", query["userId"]), "from_email": connection["accountEmail"],
            "from_name": " ".join(filter(None, [user.get("firstName"), user.get("lastName")])),
            "to_emails": list(map(str, command.to)), "cc_emails": list(map(str, command.cc)), "bcc_emails": list(map(str, command.bcc)),
            "subject": command.subject, "text_body": command.body, "html_body": "<pre>" + html.escape(command.body) + "</pre>",
            "template": None, "variables_used": {}, "status": "queued", "provider": "microsoft" if provider == "microsoft" else "gmail",
            "gmailOutcome": "sending", "gmailRequestKey": request_key, "gmailPayloadHash": payload_hash,
            "attachments": [{"name": item["name"], "size": len(item["content"])} for item in attachments],
            "lead_id": command.leadId, "created_at": now(), "updated_at": now(),
        }
        try:
            await receipts.insert_one({"_id": request_key, **query, "historyId": record["_id"],
                "gmailPayloadHash": payload_hash, "gmailOutcome": "sending", "createdAt": now()})
        except DuplicateKeyError:
            return self.previous_send(await receipts.find_one({"_id": request_key}), payload_hash)
        await history.insert_one(record)
        try:
            async with httpx.AsyncClient(timeout=40) as client:
                if provider == "microsoft":
                    response = await client.post(microsoft_mail.SEND_URL, headers={"Authorization": f"Bearer {token}", "Content-Type": "text/plain"}, content=microsoft_content)
                else:
                    response = await client.post(SEND_URL, headers={"Authorization": f"Bearer {token}"}, json={"raw": raw})
        except httpx.HTTPError:
            await receipts.update_one({"_id": request_key}, {"$set": {"gmailOutcome": "unknown"}})
            await history.update_one({"_id": record["_id"]}, {"$set": {"gmailOutcome": "unknown", "error_message": "Send outcome is uncertain. Check your mailbox Sent folder before sending again."}})
            raise AppException(502, "Send outcome is uncertain. Check your mailbox Sent folder before sending again.")
        if response.status_code != (202 if provider == "microsoft" else 200):
            uncertain = response.status_code >= 500
            await receipts.update_one({"_id": request_key}, {"$set": {"gmailOutcome": "unknown" if uncertain else "failed"}})
            await history.update_one({"_id": record["_id"]}, {"$set": {
                "status": "queued" if uncertain else "failed", "gmailOutcome": "unknown" if uncertain else "failed",
                "error_message": "Check your mailbox Sent folder before sending again." if uncertain else "Your email provider rejected the email. Check permissions, recipients and sending limits.",
                "updated_at": now(),
            }})
            raise AppException(502 if uncertain else 400, "Send outcome is uncertain. Check your mailbox Sent folder." if uncertain else "Your email provider rejected this email. Check recipients, permissions and mailbox sending limits.")
        try:
            message_id = None if provider == "microsoft" else response.json()["id"]
        except (ValueError, KeyError):
            raise AppException(502, "Send outcome is uncertain. Check your mailbox Sent folder before sending again.")
        await history.update_one({"_id": record["_id"]}, {"$set": {
            "status": "sent", "gmailOutcome": "sent", "provider_message_id": message_id,
            "sent_at": now(), "updated_at": now(),
        }})
        await receipts.update_one({"_id": request_key}, {"$set": {"gmailOutcome": "sent", "provider_message_id": message_id}})
        if command.leadId:
            # A durable marker supports later recovery if activity insertion fails after Gmail accepts mail.
            try:
                await database().activities.insert_one({
                    "companyId": query["companyId"], "userId": DBRef("users", query["userId"]),
                    "entityType": "lead", "entityId": ObjectId(command.leadId), "action": "email_sent",
                    "title": "Email sent via Microsoft" if provider == "microsoft" else "Email sent via Gmail", "description": command.subject, "perform": 1, "createdAt": now(),
                    "metadata": {"emailHistoryId": str(record["_id"]), "provider": "microsoft" if provider == "microsoft" else "gmail"},
                })
            except Exception:
                await history.update_one({"_id": record["_id"]}, {"$set": {"gmailActivityPending": True}})
        return {"id": str(record["_id"]), "messageId": message_id, "status": "sent"}

    @staticmethod
    def previous_send(record, payload_hash):
        if not record or record.get("gmailPayloadHash") != payload_hash:
            raise AppException(409, "This send request was already used for another email")
        if record.get("gmailOutcome") == "sent":
            return {"id": str(record.get("historyId", record["_id"])), "messageId": record.get("provider_message_id"), "status": "sent"}
        raise AppException(409, "This email was already submitted. Check the outbox and Gmail Sent before sending again.")

    async def outbox(self, user, company=False):
        query = {"companyId": scope(user)["companyId"], "provider": {"$in": ["gmail", "microsoft"]}}
        if company:
            if not any(role.get("code") in {"COMPANY_ADMIN", "ADMIN"} for role in user.get("userRole", [])):
                raise AppException(403, "Only company admins can view company email history")
        else:
            query["gmailUserId"] = scope(user)["userId"]
        records = await database().email_history.find(query, {"subject": 1, "to_emails": 1, "cc_emails": 1,
            "from_email": 1, "provider": 1, "status": 1, "gmailOutcome": 1, "created_at": 1, "text_body": 1, "attachments": 1,
            "error_message": 1, "lead_id": 1}).sort("created_at", -1).limit(100).to_list(100)
        for record in records:
            record["id"] = str(record.pop("_id"))
        return records
