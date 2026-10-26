import hashlib
import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from beanie import PydanticObjectId
from jose import jwt

from app.core.config import get_setting
from app.core.crypto import encryptor
from app.db.models.company_model import CompanyModel
from app.db.models.google_calendar_connection_model import GoogleCalendarConnectionModel
from app.db.models.lead_model import LeadsModel
from app.db.models.deal_model import DealModel
from app.db.models.quotation_model import QuotationModel
from app.db.models.invoice_model import InvoiceModel
from app.db.models.enquiry_management_model import EnquiryModel
from app.db.models.user_model import UserModel

logger = logging.getLogger(__name__)
settings = get_setting()
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_API = "https://www.googleapis.com/calendar/v3"
GOOGLE_PROFILE_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
CALENDAR_SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events"]


class GoogleCalendarService:
    def _require_configured(self) -> None:
        if not all((settings.GOOGLE_CALENDAR_CLIENT_ID, settings.GOOGLE_CALENDAR_CLIENT_SECRET, settings.GOOGLE_CALENDAR_REDIRECT_URI)):
            raise ValueError("Google Calendar OAuth is not configured. Set the client ID, client secret and redirect URI.")

    def authorization_url(self, user: dict) -> str:
        self._require_configured()
        state = jwt.encode(
            {
                "purpose": "google_calendar_connect",
                "userId": str(user["_id"]),
                "companyId": str(user["companyId"]),
                "exp": datetime.now(timezone.utc) + timedelta(minutes=10),
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )
        return GOOGLE_AUTH_URL + "?" + urlencode({
            "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_CALENDAR_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(CALENDAR_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
            "state": state,
        })

    async def handle_callback(self, code: str, state: str) -> str:
        self._require_configured()
        try:
            claims = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            if claims.get("purpose") != "google_calendar_connect":
                raise ValueError("Invalid OAuth state")
            user_id = PydanticObjectId(claims["userId"])
            company_id = PydanticObjectId(claims["companyId"])
        except Exception as exc:
            raise ValueError("The Google Calendar connection request expired. Please try again.") from exc

        async with httpx.AsyncClient(timeout=20) as client:
            token_response = await client.post(GOOGLE_TOKEN_URL, data={
                "code": code,
                "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
                "client_secret": settings.GOOGLE_CALENDAR_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_CALENDAR_REDIRECT_URI,
                "grant_type": "authorization_code",
            })
            token_response.raise_for_status()
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise ValueError("Google did not return an access token")
            profile_response = await client.get(GOOGLE_PROFILE_URL, headers={"Authorization": f"Bearer {access_token}"})
            profile_response.raise_for_status()
            account_email = profile_response.json().get("email")
        if not account_email:
            raise ValueError("Google did not return the connected account email")

        connection = await self._connection(company_id, user_id)
        refresh_token = token_data.get("refresh_token")
        if not refresh_token and connection:
            refresh_token = encryptor.decrypt_data(connection.encryptedRefreshToken)
        if not refresh_token:
            raise ValueError("Google did not provide offline access. Reconnect and approve calendar access.")
        if connection:
            connection.accountEmail = account_email
            connection.encryptedRefreshToken = encryptor.encrypt_data(refresh_token)
            connection.updatedAt = datetime.now(timezone.utc)
            await connection.save()
        else:
            await GoogleCalendarConnectionModel(
                companyId=company_id,
                userId=user_id,
                accountEmail=account_email,
                encryptedRefreshToken=encryptor.encrypt_data(refresh_token),
            ).insert()

        await self.sync_open_followups(company_id, user_id)
        return account_email

    async def _connection(self, company_id: PydanticObjectId, user_id: PydanticObjectId):
        return await GoogleCalendarConnectionModel.find_one({"companyId": company_id, "userId": user_id})

    async def connection_status(self, user: dict) -> dict:
        company_id = PydanticObjectId(user["companyId"])
        user_id = PydanticObjectId(user["_id"])
        own = await self._connection(company_id, user_id)
        company = await CompanyModel.find_one({"_id": company_id})
        admin_id = getattr(company.primary_admin, "id", None) if company else None
        admin = await self._connection(company_id, PydanticObjectId(admin_id)) if admin_id else None
        return {
            "connected": bool(own),
            "accountEmail": own.accountEmail if own else None,
            "adminCalendarConnected": bool(admin),
            "adminCalendarEmail": admin.accountEmail if admin else None,
            "isCompanyAdmin": bool(admin_id and str(admin_id) == str(user_id)),
        }

    async def disconnect(self, user: dict) -> None:
        connection = await self._connection(PydanticObjectId(user["companyId"]), PydanticObjectId(user["_id"]))
        if connection:
            await connection.delete()

    @staticmethod
    def _event_id(calendar_owner_id: str, record_id: str, entity_type: str = "lead") -> str:
        # Preserve existing lead event IDs for compatibility with already-synced reminders.
        key = f"{calendar_owner_id}:{record_id}:followup" if entity_type == "lead" else f"{calendar_owner_id}:{entity_type}:{record_id}:followup"
        return hashlib.sha256(key.encode()).hexdigest()

    async def _access_token(self, connection: GoogleCalendarConnectionModel) -> str:
        refresh_token = encryptor.decrypt_data(connection.encryptedRefreshToken)
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(GOOGLE_TOKEN_URL, data={
                "client_id": settings.GOOGLE_CALENDAR_CLIENT_ID,
                "client_secret": settings.GOOGLE_CALENDAR_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            })
            response.raise_for_status()
            access_token = response.json().get("access_token")
            if not access_token:
                raise ValueError("Google did not return a refreshed access token")
            return access_token

    async def _upsert_event(self, connection, event_id: str, event: dict) -> None:
        token = await self._access_token(connection)
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        url = f"{GOOGLE_API}/calendars/primary/events/{event_id}"
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.put(url, headers=headers, json=event)
            if response.status_code == 404:
                response = await client.post(f"{GOOGLE_API}/calendars/primary/events", headers=headers, json={"id": event_id, **event})
                if response.status_code == 409:
                    response = await client.put(url, headers=headers, json=event)
            response.raise_for_status()

    async def _delete_event(self, connection, event_id: str) -> None:
        token = await self._access_token(connection)
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.delete(
                f"{GOOGLE_API}/calendars/primary/events/{event_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code not in (404, 410):
                response.raise_for_status()

    async def sync_followup(
        self,
        *,
        company_id: PydanticObjectId,
        lead_id: str,
        lead_name: str,
        owner_id: PydanticObjectId | None,
        follow_up_at: datetime | None,
        previous_owner_id: PydanticObjectId | None = None,
        owner_name: str = "",
        entity_type: str = "lead",
    ) -> None:
        try:
            company = await CompanyModel.find_one({"_id": company_id})
            admin_id = getattr(company.primary_admin, "id", None) if company else None
            admin_id = PydanticObjectId(admin_id) if admin_id else None
            owner_id = PydanticObjectId(owner_id) if owner_id else None
            previous_owner_id = PydanticObjectId(previous_owner_id) if previous_owner_id else owner_id
            if follow_up_at is None:
                for target in {str(value) for value in (previous_owner_id, admin_id) if value}:
                    connection = await self._connection(company_id, PydanticObjectId(target))
                    if connection:
                        await self._delete_event(connection, self._event_id(target, lead_id, entity_type))
                return

            if follow_up_at.tzinfo is None:
                follow_up_at = follow_up_at.replace(tzinfo=timezone.utc)
            start = follow_up_at.astimezone(timezone.utc)
            end = start + timedelta(minutes=15)
            event = {
                "summary": f"Follow-up: {lead_name}",
                "description": f"CRM {entity_type} follow-up" + (f"\nScheduled by: {owner_name}" if owner_name else ""),
                "start": {"dateTime": start.isoformat().replace("+00:00", "Z"), "timeZone": "Asia/Kolkata"},
                "end": {"dateTime": end.isoformat().replace("+00:00", "Z"), "timeZone": "Asia/Kolkata"},
                "visibility": "private",
            }
            targets = [owner_id] if owner_id else []
            if admin_id and all(str(admin_id) != str(target) for target in targets):
                targets.append(admin_id)
            if previous_owner_id and previous_owner_id != owner_id:
                previous_connection = await self._connection(company_id, previous_owner_id)
                if previous_connection:
                    await self._delete_event(
                        previous_connection,
                        self._event_id(str(previous_owner_id), lead_id, entity_type),
                    )
            for target_id in targets:
                connection = await self._connection(company_id, target_id)
                if connection:
                    await self._upsert_event(connection, self._event_id(str(target_id), lead_id, entity_type), event)
        except Exception:
            logger.exception("Google Calendar follow-up sync failed for lead %s", lead_id)

    async def sync_open_followups(self, company_id: PydanticObjectId, connecting_user_id: PydanticObjectId) -> None:
        company = await CompanyModel.find_one({"_id": company_id})
        admin_id = getattr(company.primary_admin, "id", None) if company else None
        is_admin = bool(admin_id and str(admin_id) == str(connecting_user_id))
        query = {"companyId": company_id, "followUpAt": {"$ne": None}}
        if not is_admin:
            query["followUpOwnerId"] = connecting_user_id
        collections = [
            (LeadsModel, "lead", "fullName"),
            (DealModel, "deal", "dealName"),
            (QuotationModel, "quotation", "title"),
            (InvoiceModel, "invoice", "invoiceId"),
            (EnquiryModel, "enquiry", "fullName"),
        ]
        for model, entity_type, name_field in collections:
            records = await model.get_pymongo_collection().find(query).to_list(length=2000)
            for record in records:
                owner_id = record.get("followUpOwnerId")
                owner = await UserModel.get(PydanticObjectId(owner_id)) if owner_id else None
                await self.sync_followup(
                    company_id=company_id,
                    lead_id=str(record["_id"]),
                    lead_name=record.get(name_field) or f"{entity_type.title()} follow-up",
                    owner_id=PydanticObjectId(owner_id) if owner_id else connecting_user_id,
                    follow_up_at=record.get("followUpAt"),
                    owner_name=" ".join(filter(None, [owner.firstName, owner.lastName])) if owner else "",
                    entity_type=entity_type,
                )
