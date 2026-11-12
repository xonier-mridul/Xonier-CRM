from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from typing import Literal

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field, field_validator

from app.core.dependencies import Dependencies
from app.core.enums import FEATURE
from app.db.models.deal_model import DealModel
from app.db.models.lead_model import LeadsModel
from app.db.models.next_action_model import NextActionModel
from app.db.models.activity_model import ActivityModel
from app.db.models.user_model import UserModel
from app.db.models.company_model import CompanyModel
from app.db.models.communications.email_history_model import EmailHistoryModel
from app.services.deal_service import DealService
from app.services.lead_service import LeadService
from app.services.call_service import CallService
from app.utils.custom_exception import AppException

router = APIRouter()
dependencies = Dependencies()


class NextActionInput(BaseModel):
    kind: Literal["call", "email", "meeting", "task", "whatsapp", "other"]
    title: str = Field(min_length=1, max_length=200)
    dueAt: datetime | None = None
    localDueAt: datetime | None = None
    ownerId: str

    @field_validator("dueAt")
    @classmethod
    def aware_future_date(cls, value: datetime) -> datetime:
        if value is None:
            return value
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Due date must include a timezone")
        if value <= datetime.now(timezone.utc):
            raise ValueError("Due date must be in the future")
        return value.astimezone(timezone.utc)

    @field_validator("title")
    @classmethod
    def nonempty_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title is required")
        return value


def object_id(value: str) -> PydanticObjectId:
    if not PydanticObjectId.is_valid(value):
        raise AppException(400, "Invalid record or owner id")
    return PydanticObjectId(value)


async def require_record(request: Request, entity_type: str, entity_id: str, write: bool = False):
    if entity_type not in ("lead", "deal"):
        raise AppException(400, "Unsupported commercial record")
    await dependencies.permissions([f"{entity_type}:{'update' if write else 'read'}"])(request)
    record_id = object_id(entity_id)
    model = LeadsModel if entity_type == "lead" else DealModel
    record = await model.find_one({"_id": record_id, "deletedAt": None})
    if not record:
        raise AppException(404, "Commercial record not found")
    if entity_type == "lead":
        await LeadService().get_by_id(entity_id, request.state.user)
    else:
        await DealService().get_by_id(entity_id, request.state.user)
    return record_id


def output(action: NextActionModel, owner: UserModel | None = None) -> dict:
    def iso_utc(value: datetime | None) -> str | None:
        if value is None:
            return None
        return value.replace(tzinfo=value.tzinfo or timezone.utc).isoformat()

    return {
        "id": str(action.id), "entityType": action.entityType,
        "entityId": str(action.entityId), "kind": action.kind,
        "title": action.title, "dueAt": iso_utc(action.dueAt),
        "ownerId": str(action.ownerId),
        "ownerName": " ".join(filter(None, [owner.firstName, owner.lastName])) if owner else "",
        "completedAt": iso_utc(action.completedAt),
        "createdAt": iso_utc(action.createdAt),
    }


@router.get("/{entity_type}/{entity_id}/owners", dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM))])
async def list_owners(request: Request, entity_type: str, entity_id: str):
    await require_record(request, entity_type, entity_id, write=True)
    users = await UserModel.find({"deletedAt": None, "status": "active"}).sort("firstName").to_list()
    return {"data": [{"id": str(user.id), "name": " ".join(filter(None, [user.firstName, user.lastName]))} for user in users]}


@router.get("/{entity_type}/{entity_id}/timeline", dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM))])
async def timeline(request: Request, entity_type: str, entity_id: str):
    record_id = await require_record(request, entity_type, entity_id)
    actions = await NextActionModel.find({"entityType": entity_type, "entityId": record_id}).to_list()
    activities = await ActivityModel.find({"entityId": record_id}).sort("-createdAt").limit(100).to_list()
    user_ids = {str(action.ownerId) for action in actions} | {str(activity.userId.ref.id) for activity in activities if getattr(activity.userId, "ref", None)}
    users = {str(user.id): user for user in await UserModel.find({"_id": {"$in": [PydanticObjectId(user_id) for user_id in user_ids]}}).to_list()} if user_ids else {}
    items = []
    for action in actions:
        owner = users.get(str(action.ownerId))
        items.append({
            "id": f"action-{action.id}", "at": action.completedAt or action.dueAt,
            "kind": "next_action_completed" if action.completedAt else "next_action",
            "title": action.title, "detail": f"{action.kind} · {output(action, owner)['ownerName']}",
            "pending": action.completedAt is None,
        })
    for activity in activities:
        user_id = str(activity.userId.ref.id) if getattr(activity.userId, "ref", None) else ""
        actor = users.get(user_id)
        items.append({
            "id": f"activity-{activity.id}", "at": activity.createdAt,
            "kind": "activity", "title": activity.title.replace("_", " ").capitalize(),
            "detail": " ".join(filter(None, [activity.description, " ".join(filter(None, [actor.firstName, actor.lastName])) if actor else ""])),
            "pending": False,
        })
    # A deal can inherit call history only when the viewer can also read its lead.
    lead_id = entity_id if entity_type == "lead" else None
    if entity_type == "deal":
        deal = await DealModel.find_one({"_id": record_id, "deletedAt": None})
        if deal and deal.lead_id and getattr(deal.lead_id, "ref", None):
            candidate = str(deal.lead_id.ref.id)
            try:
                await require_record(request, "lead", candidate)
                lead_id = candidate
            except AppException:
                pass
    if lead_id:
        if entity_type == "deal":
            lead_oid = PydanticObjectId(lead_id)
            lead_actions = await NextActionModel.find({"entityType": "lead", "entityId": lead_oid}).to_list()
            lead_activities = await ActivityModel.find({"entityId": lead_oid}).sort("-createdAt").limit(100).to_list()
            for action in lead_actions:
                items.append({"id": f"lead-action-{action.id}", "at": action.completedAt or action.dueAt,
                              "kind": "next_action", "title": action.title,
                              "detail": f"Lead · {action.kind}", "pending": action.completedAt is None})
            for activity in lead_activities:
                items.append({"id": f"lead-activity-{activity.id}", "at": activity.createdAt,
                              "kind": "activity", "title": activity.title.replace("_", " ").capitalize(),
                              "detail": "Lead", "pending": False})
        calls = await CallService().lead_history(request.state.user, lead_id)
        for call in calls:
            at = call.get("requestedAt")
            if isinstance(at, str):
                at = datetime.fromisoformat(at.replace("Z", "+00:00"))
            if not at:
                continue
            items.append({"id": f"call-{call['id']}", "at": at, "kind": "call",
                          "title": "Call", "detail": " · ".join(filter(None, [call.get("status"), call.get("agentName")])), "pending": False})
    # Email history is private to the sender, as in the existing email history API.
    try:
        await dependencies.permissions(["email:read"])(request)
        email_links = [{"lead_id": lead_id}] if lead_id else []
        if entity_type == "deal":
            email_links.append({"deal_id": entity_id})
        if email_links:
            emails = await EmailHistoryModel.find({
                "companyId": PydanticObjectId(request.state.user["companyId"]),
                "sent_by.$id": PydanticObjectId(request.state.user["_id"]),
                "$or": email_links,
            }).sort("-created_at").limit(100).to_list()
            for email in emails:
                status = email.status.value if hasattr(email.status, "value") else str(email.status)
                items.append({"id": f"email-{email.id}", "at": email.sent_at or email.created_at,
                              "kind": "email", "title": f"Email: {email.subject}",
                              "detail": status, "pending": False})
    except AppException as exc:
        if exc.status_code != 403:
            raise
    for item in items:
        item["at"] = item["at"].replace(tzinfo=item["at"].tzinfo or timezone.utc).astimezone(timezone.utc)
    items.sort(key=lambda item: item["at"], reverse=True)
    return {"data": [{**item, "at": item["at"].replace(tzinfo=item["at"].tzinfo or timezone.utc).isoformat()} for item in items]}


@router.get("/{entity_type}/{entity_id}", dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM))])
async def list_actions(request: Request, entity_type: str, entity_id: str):
    record_id = await require_record(request, entity_type, entity_id)
    actions = await NextActionModel.find({"entityType": entity_type, "entityId": record_id}).sort("dueAt").to_list()
    owners = {str(user.id): user for user in await UserModel.find({"_id": {"$in": list({a.ownerId for a in actions})}}).to_list()} if actions else {}
    return {"data": [output(action, owners.get(str(action.ownerId))) for action in actions]}


@router.post("/{entity_type}/{entity_id}", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM))])
async def create_action(request: Request, entity_type: str, entity_id: str, payload: NextActionInput):
    record_id = await require_record(request, entity_type, entity_id, write=True)
    owner_id = object_id(payload.ownerId)
    owner = await UserModel.find_one({"_id": owner_id, "deletedAt": None})
    if not owner or str(owner.companyId) != str(request.state.user["companyId"]):
        raise AppException(422, "Owner must be an active user in this company")
    if str(owner.status).lower().split(".")[-1] != "active":
        raise AppException(422, "Owner must be active")
    due_at = payload.dueAt
    if payload.localDueAt is not None:
        if payload.localDueAt.tzinfo is not None:
            raise AppException(422, "Local due date must not include a timezone")
        company = await CompanyModel.get_pymongo_collection().find_one({"_id": PydanticObjectId(request.state.user["companyId"])}, {"timezone": 1})
        try:
            zone = ZoneInfo((company or {}).get("timezone") or "UTC")
        except ZoneInfoNotFoundError:
            raise AppException(422, "Company timezone is invalid")
        local = payload.localDueAt.replace(tzinfo=zone)
        due_at = local.astimezone(timezone.utc)
        if due_at.astimezone(zone).replace(tzinfo=None) != payload.localDueAt:
            raise AppException(422, "This local time does not exist in the company timezone")
    if due_at is None or due_at <= datetime.now(timezone.utc):
        raise AppException(422, "Due date must be in the future")
    action = NextActionModel(
        companyId=PydanticObjectId(request.state.user["companyId"]),
        entityType=entity_type, entityId=record_id, kind=payload.kind,
        title=payload.title, dueAt=due_at, ownerId=owner_id,
        createdById=PydanticObjectId(request.state.user["_id"]),
    )
    await action.insert()
    return {"data": output(action, owner)}


@router.patch("/{entity_type}/{entity_id}/{action_id}/complete", dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM))])
async def complete_action(request: Request, entity_type: str, entity_id: str, action_id: str):
    record_id = await require_record(request, entity_type, entity_id, write=True)
    action = await NextActionModel.find_one({"_id": object_id(action_id), "entityType": entity_type, "entityId": record_id})
    if not action:
        raise AppException(404, "Next action not found")
    if action.completedAt is None:
        action.completedAt = datetime.now(timezone.utc)
        action.updatedAt = action.completedAt
        await action.save()
    return {"data": output(action)}
