from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from beanie import PydanticObjectId
from bson import ObjectId

from app.db.models.deal_model import DealModel
from app.db.models.enquiry_management_model import EnquiryModel
from app.db.models.invoice_model import InvoiceModel
from app.db.models.quotation_model import QuotationModel
from app.db.models.lead_model import LeadsModel
from app.services.google_calendar_service import GoogleCalendarService
from app.core.constants import DEAL_CACHE_NAMESPACE, DEAL_CACHE_NAMESPACE_BY_ID
from fastapi_cache import FastAPICache
from app.utils.get_team_members import GetTeamMembers
from app.utils.validate_admin import validate_admin_company_admin
from app.utils.custom_exception import AppException


FOLLOW_UP_MODELS = {
    "deal": (DealModel, "dealName", "deal"),
    "quotation": (QuotationModel, "title", "quotation"),
    "invoice": (InvoiceModel, "invoiceId", "invoice"),
    "enquiry": (EnquiryModel, "fullName", "enquiry"),
}

FOLLOW_UP_COUNT_MODELS = {**FOLLOW_UP_MODELS, "lead": (LeadsModel, "fullName", "lead")}


class FollowUpService:
    async def count(self, entity_type: str, from_date: str | None, to_date: str | None, user: dict) -> dict:
        if entity_type not in FOLLOW_UP_COUNT_MODELS:
            raise AppException(400, "Invalid follow-up entity")

        model = FOLLOW_UP_COUNT_MODELS[entity_type][0]
        user_id = PydanticObjectId(user["_id"])
        query: dict = {"followUpAt": {"$ne": None}, "deletedAt": None}
        if user.get("companyId"):
            query["companyId"] = PydanticObjectId(user["companyId"])

        if not validate_admin_company_admin(user["userRole"]):
            access_ids = [user_id, *await GetTeamMembers().get_team_members(str(user_id))]
            query["$or"] = [
                {"createdBy.$id": {"$in": access_ids}},
                {"assignedTo.$id": {"$in": access_ids}},
                {"assignTo.$id": {"$in": access_ids}},
            ]

        date_range = {}
        ist = ZoneInfo("Asia/Kolkata")
        try:
            if from_date:
                start = datetime.fromisoformat(from_date).replace(tzinfo=ist)
                date_range["$gte"] = start.astimezone(timezone.utc)
            if to_date:
                end = datetime.fromisoformat(to_date).replace(tzinfo=ist) + timedelta(days=1)
                date_range["$lt"] = end.astimezone(timezone.utc)
        except ValueError as error:
            raise AppException(400, "Date filters must use YYYY-MM-DD") from error

        if date_range:
            query["followUpAt"] = date_range

        return {"count": await model.find(query).count()}

    async def update(self, entity_type: str, record_id: str, follow_up_in: str | None, user: dict) -> dict:
        if entity_type not in FOLLOW_UP_MODELS or not ObjectId.is_valid(record_id):
            raise AppException(400, "Invalid follow-up record")

        model, title_field, calendar_type = FOLLOW_UP_MODELS[entity_type]
        user_id = PydanticObjectId(user["_id"])
        access_ids = [user_id]
        is_admin = validate_admin_company_admin(user["userRole"])
        if not is_admin:
            access_ids.extend(await GetTeamMembers().get_team_members(str(user_id)))
        access_filter = {} if is_admin else {
            "$or": [
                {"createdBy.$id": {"$in": access_ids}},
                {"assignedTo.$id": {"$in": access_ids}},
                {"assignTo.$id": {"$in": access_ids}},
            ]
        }
        record = await model.find_one({"_id": ObjectId(record_id), **access_filter})
        if not record:
            raise AppException(404, f"{entity_type.title()} not found or access denied")

        if getattr(record, "deletedAt", None):
            raise AppException(400, "Cannot schedule a follow-up for a deleted record")

        previous_owner_id = record.followUpOwnerId
        follow_up_at = self._parse_time(follow_up_in) if follow_up_in else None
        record.followUpAt = follow_up_at
        record.followUpOwnerId = PydanticObjectId(user["_id"]) if follow_up_at else None
        record.updatedAt = datetime.now(timezone.utc)
        await record.save()

        # Deal list responses are cached, so clear both list and detail caches
        # after updating the field that the table renders on each row.
        if entity_type == "deal":
            await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE)
            await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE_BY_ID)

        await GoogleCalendarService().sync_followup(
            company_id=PydanticObjectId(user["companyId"]),
            lead_id=str(record.id),
            lead_name=str(getattr(record, title_field, None) or entity_type.title()),
            owner_id=record.followUpOwnerId,
            previous_owner_id=previous_owner_id,
            follow_up_at=record.followUpAt,
            owner_name=" ".join(filter(None, [user.get("firstName"), user.get("lastName")])),
            entity_type=calendar_type,
        )

        return {"success": True, "followUpAt": record.followUpAt, "followUpOwnerId": record.followUpOwnerId}

    @staticmethod
    def _parse_time(value: str) -> datetime:
        presets = {"1h": timedelta(hours=1), "6h": timedelta(hours=6), "1d": timedelta(days=1)}
        now = datetime.now(ZoneInfo("Asia/Kolkata"))
        if value in presets:
            return (now + presets[value]).astimezone(timezone.utc)
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError as error:
            raise AppException(400, "Choose 1h, 6h, 1d, or a valid custom date and time") from error
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=ZoneInfo("Asia/Kolkata"))
        if parsed <= now:
            raise AppException(400, "Follow-up time must be in the future")
        return parsed.astimezone(timezone.utc)
