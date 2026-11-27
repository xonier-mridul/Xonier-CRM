from datetime import datetime, timezone
from typing import Literal

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field, field_validator

from app.utils.record_visibility import live_deal_filter, live_lead_filter
from app.utils.timezone_utils import resolve_timezone
from app.utils.validate_admin import validate_admin, validate_company_admin
from app.utils.get_team_members import GetTeamMembers
from app.core.dependencies import Dependencies
from app.core.enums import FEATURE, NOTE_STATUS, NOTE_VISIBILITY, ACTIVITY_ACTION, ACTIVITY_ENTITY_TYPE
from app.core.notification_enum import (
    NOTIFICATION_ENTITY_TYPE,
    NOTIFICATION_PRIORITY,
    NOTIFICATION_TYPE,
)
from app.db.models.deal_model import DealModel
from app.db.models.lead_model import LeadsModel
from app.db.models.next_action_model import NextActionModel
from app.db.models.notification_model import NotificationModel
from app.db.models.activity_model import ActivityModel
from app.db.models.notes_model import NoteModel
from app.db.models.task_model import TaskModel
from app.db.models.task_status_model import TaskStatusModel
from app.db.models.task_activity_model import TaskActivityModel
from app.db.models.calender_event_model import CalenderEventModel
from app.db.models.user_model import UserModel
from app.db.models.company_model import CompanyModel
from app.db.models.communications.email_history_model import EmailHistoryModel
from app.services.deal_service import DealService
from app.services.lead_service import LeadService
from app.services.call_service import CallService
from app.repositories.activity_repository import ActivityRepository
from app.utils.activity_payload import activity_payload
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


class LeadInteractionInput(BaseModel):
    channel: Literal["call", "email", "whatsapp", "linkedin", "meeting", "other"]
    summary: str = Field(min_length=2, max_length=2000)

    @field_validator("summary")
    @classmethod
    def nonempty_summary(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Interaction summary is required")
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
    visibility = live_lead_filter if entity_type == "lead" else live_deal_filter
    record = await model.find_one(visibility({"_id": record_id}))
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


@router.get(
    "/upcoming",
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.company_active),
        Depends(dependencies.company_context),
        Depends(dependencies.feature_access(FEATURE.CRM)),
    ],
)
async def list_upcoming_actions(
    request: Request,
    status: Literal["pending", "completed", "all"] = Query(default="pending"),
    scope: Literal["mine", "all"] = Query(default="all"),
    limit: int = Query(default=50, ge=1, le=200),
):
    user = request.state.user
    user_oid = PydanticObjectId(user["_id"])
    company_id = PydanticObjectId(user["companyId"])
    roles = user.get("userRole") or []

    is_admin = validate_admin(roles) or validate_company_admin(roles)
    team_member_ids: list[PydanticObjectId] = []
    is_manager = False
    if not is_admin:
        team_helper = GetTeamMembers()
        is_manager = await team_helper.validate_manager(str(user_oid))
        if is_manager:
            team_member_ids = await team_helper.get_team_members(str(user_oid))

    base_filter: dict = {"companyId": company_id}
    if scope == "mine" or (not is_admin and not is_manager):
        base_filter["$or"] = [{"ownerId": user_oid}, {"createdById": user_oid}]
    elif is_manager:
        allowed_ids = list({user_oid, *team_member_ids})
        base_filter["$or"] = [
            {"ownerId": {"$in": allowed_ids}},
            {"createdById": {"$in": allowed_ids}},
        ]

    status_filter = dict(base_filter)
    if status == "pending":
        status_filter["completedAt"] = None
    elif status == "completed":
        status_filter["completedAt"] = {"$ne": None}

    sort_order = [("dueAt", 1)] if status != "completed" else [("completedAt", -1)]
    actions = await NextActionModel.find(status_filter).sort(sort_order).limit(limit).to_list()

    lead_ids = list({a.entityId for a in actions if a.entityType == "lead"})
    deal_ids = list({a.entityId for a in actions if a.entityType == "deal"})
    owner_ids = list({a.ownerId for a in actions} | {a.createdById for a in actions})

    leads_map: dict[str, dict] = {}
    if lead_ids:
        cursor = LeadsModel.get_pymongo_collection().find(
            live_lead_filter({"_id": {"$in": lead_ids}, "companyId": company_id}),
            {"fullName": 1, "companyName": 1, "lead_id": 1, "status": 1, "priority": 1},
        )
        for doc in await cursor.to_list(length=len(lead_ids)):
            leads_map[str(doc["_id"])] = doc

    deals_map: dict[str, dict] = {}
    if deal_ids:
        cursor = DealModel.get_pymongo_collection().find(
            live_deal_filter({"_id": {"$in": deal_ids}, "companyId": company_id}),
            {"dealName": 1, "deal_id": 1, "dealStage": 1, "amount": 1},
        )
        for doc in await cursor.to_list(length=len(deal_ids)):
            deals_map[str(doc["_id"])] = doc

    owners = (
        {
            str(u.id): u
            for u in await UserModel.find({"_id": {"$in": owner_ids}}).to_list()
        }
        if owner_ids
        else {}
    )

    company_doc = await CompanyModel.get_pymongo_collection().find_one(
        {"_id": company_id}, {"timezone": 1}
    )
    tz_name = (company_doc or {}).get("timezone") or "UTC"
    zone = resolve_timezone(tz_name)
    now_utc = datetime.now(timezone.utc)
    today_local = now_utc.astimezone(zone).date()

    items = []
    for action in actions:
        entity_key = str(action.entityId)
        if action.entityType == "lead":
            record = leads_map.get(entity_key)
            if not record:
                continue
            entity_name = record.get("fullName") or record.get("companyName") or record.get("lead_id") or "Lead"
            entity_code = record.get("lead_id") or ""
            entity_subtext = record.get("companyName") or record.get("status") or ""
        else:
            record = deals_map.get(entity_key)
            if not record:
                continue
            entity_name = record.get("dealName") or record.get("deal_id") or "Deal"
            entity_code = record.get("deal_id") or ""
            entity_subtext = record.get("dealStage") or ""

        due_utc = action.dueAt.replace(tzinfo=action.dueAt.tzinfo or timezone.utc).astimezone(timezone.utc)
        is_overdue = action.completedAt is None and due_utc < now_utc
        is_due_today = action.completedAt is None and due_utc.astimezone(zone).date() == today_local

        base_item = output(action, owners.get(str(action.ownerId)))
        creator = owners.get(str(action.createdById))
        items.append({
            **base_item,
            "entityName": entity_name,
            "entityCode": entity_code,
            "entitySubtext": entity_subtext,
            "createdByName": " ".join(filter(None, [creator.firstName, creator.lastName])) if creator else "",
            "isOverdue": is_overdue,
            "isDueToday": is_due_today,
        })

    # Summary counts across pending actions for current scope
    pending_filter = {**base_filter, "completedAt": None}
    all_pending = await NextActionModel.find(pending_filter).to_list()
    pending_lead_ids = list({a.entityId for a in all_pending if a.entityType == "lead"})
    pending_deal_ids = list({a.entityId for a in all_pending if a.entityType == "deal"})
    live_lead_ids = set()
    if pending_lead_ids:
        c = LeadsModel.get_pymongo_collection().find(
            live_lead_filter({"_id": {"$in": pending_lead_ids}, "companyId": company_id}),
            {"_id": 1},
        )
        live_lead_ids = {str(d["_id"]) for d in await c.to_list(length=len(pending_lead_ids))}
    live_deal_ids = set()
    if pending_deal_ids:
        c = DealModel.get_pymongo_collection().find(
            live_deal_filter({"_id": {"$in": pending_deal_ids}, "companyId": company_id}),
            {"_id": 1},
        )
        live_deal_ids = {str(d["_id"]) for d in await c.to_list(length=len(pending_deal_ids))}

    total_pending = 0
    overdue_count = 0
    due_today_count = 0
    for a in all_pending:
        eid = str(a.entityId)
        if (a.entityType == "lead" and eid not in live_lead_ids) or (
            a.entityType == "deal" and eid not in live_deal_ids
        ):
            continue
        total_pending += 1
        d_utc = a.dueAt.replace(tzinfo=a.dueAt.tzinfo or timezone.utc).astimezone(timezone.utc)
        if d_utc < now_utc:
            overdue_count += 1
        elif d_utc.astimezone(zone).date() == today_local:
            due_today_count += 1

    return {
        "data": items,
        "summary": {
            "totalPending": total_pending,
            "overdueCount": overdue_count,
            "dueTodayCount": due_today_count,
            "timezone": tz_name,
            "canViewTeam": is_admin or is_manager,
        },
    }


@router.get("/{entity_type}/{entity_id}/owners", dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM))])
async def list_owners(request: Request, entity_type: str, entity_id: str):
    await require_record(request, entity_type, entity_id, write=True)
    company_id = PydanticObjectId(request.state.user["companyId"])
    users = await UserModel.find({
        "companyId": company_id,
        "deletedAt": None,
        "status": "active",
    }).sort("firstName").to_list()
    return {"data": [{"id": str(user.id), "name": " ".join(filter(None, [user.firstName, user.lastName]))} for user in users]}


def _link_id(link) -> str:
    if not link:
        return ""
    ref = getattr(link, "ref", None)
    if ref is not None and getattr(ref, "id", None) is not None:
        return str(ref.id)
    if getattr(link, "id", None) is not None:
        return str(link.id)
    return str(link) if isinstance(link, PydanticObjectId) else ""


async def _collect_notes_and_tasks(
    entity_type: str,
    entity_id_str: str,
    current_user_id: str,
    prefix: str = "",
) -> list[dict]:
    items: list[dict] = []
    label_prefix = "Lead · " if prefix else ""

    notes = await NoteModel.find({
        "entityType": entity_type,
        "entityId": entity_id_str,
        "status": NOTE_STATUS.ACTIVE.value,
        "deletedAt": None,
    }).sort("-createdAt").limit(100).to_list()

    visible_notes = []
    for note in notes:
        vis = note.visibility.value if hasattr(note.visibility, "value") else str(note.visibility)
        creator_id = _link_id(note.createdBy)
        if vis == NOTE_VISIBILITY.PRIVATE.value and creator_id != str(current_user_id):
            continue
        visible_notes.append((note, creator_id))

    tasks = await TaskModel.find({
        "entityType": entity_type,
        "entityId": entity_id_str,
        "deletedAt": None,
    }).sort("-createdAt").limit(100).to_list()

    task_activities = []
    if tasks:
        task_oids = [task.id for task in tasks]
        task_activities = await TaskActivityModel.find({
            "$or": [
                {"task.$id": {"$in": task_oids}},
                {"task": {"$in": task_oids}},
            ]
        }).sort("-createdAt").limit(100).to_list()

    user_ids = {creator_id for _, creator_id in visible_notes if creator_id}
    user_ids |= {
        actor_id
        for actor_id in (_link_id(ta.performedBy) for ta in task_activities)
        if actor_id
    }

    calendar_events = []
    if PydanticObjectId.is_valid(entity_id_str):
        entity_oid = PydanticObjectId(entity_id_str)
        type_match = [entity_type, None] if entity_type == "lead" else [entity_type]
        calendar_events = await CalenderEventModel.find({
            "entityId": entity_oid,
            "entityType": {"$in": type_match},
        }).sort("-start").limit(100).to_list()
        user_ids |= {
            ev_creator_id
            for ev_creator_id in (_link_id(ev.createdBy) for ev in calendar_events)
            if ev_creator_id
        }

    valid_user_oids = [PydanticObjectId(uid) for uid in user_ids if PydanticObjectId.is_valid(uid)]
    users = (
        {str(user.id): user for user in await UserModel.find({"_id": {"$in": valid_user_oids}}).to_list()}
        if valid_user_oids
        else {}
    )

    status_ids = {sid for sid in (_link_id(task.status) for task in tasks) if sid}
    valid_status_oids = [PydanticObjectId(sid) for sid in status_ids if PydanticObjectId.is_valid(sid)]
    statuses = (
        {str(st.id): st for st in await TaskStatusModel.find({"_id": {"$in": valid_status_oids}}).to_list()}
        if valid_status_oids
        else {}
    )

    for note, creator_id in visible_notes:
        creator = users.get(creator_id)
        creator_name = " ".join(filter(None, [creator.firstName, creator.lastName])) if creator else ""
        items.append({
            "id": f"{prefix}note-{note.id}",
            "at": note.createdAt,
            "kind": "note",
            "title": f"{label_prefix}Note: {note.title}",
            "detail": " · ".join(filter(None, [note.content, creator_name])),
            "pending": False,
        })

    task_map = {str(task.id): task for task in tasks}
    for task in tasks:
        status_doc = statuses.get(_link_id(task.status))
        status_name = status_doc.name.replace("_", " ").title() if status_doc and getattr(status_doc, "name", None) else "Task"
        is_final = bool(getattr(status_doc, "isFinal", False))
        priority = task.priority.value if hasattr(task.priority, "value") else str(task.priority or "")
        items.append({
            "id": f"{prefix}task-{task.id}",
            "at": task.completedAt or task.createdAt,
            "kind": "task",
            "title": f"{label_prefix}Task: {task.title}",
            "detail": " · ".join(filter(None, [status_name, f"Priority: {priority}" if priority else "", task.description or ""])),
            "pending": task.completedAt is None and not is_final,
        })

    for ta in task_activities:
        parent_task = task_map.get(_link_id(ta.task))
        parent_title = parent_task.title if parent_task else "Task"
        actor = users.get(_link_id(ta.performedBy))
        actor_name = " ".join(filter(None, [actor.firstName, actor.lastName])) if actor else ""
        action_label = ta.action.value if hasattr(ta.action, "value") else str(ta.action)
        items.append({
            "id": f"{prefix}task-activity-{ta.id}",
            "at": ta.createdAt,
            "kind": "task_activity",
            "title": f"{label_prefix}Task {action_label.replace('_', ' ')}: {parent_title}",
            "detail": " · ".join(filter(None, [ta.description, actor_name])),
            "pending": False,
        })

    now_utc = datetime.now(timezone.utc)
    for ev in calendar_events:
        ev_creator = users.get(_link_id(ev.createdBy))
        ev_creator_name = " ".join(filter(None, [ev_creator.firstName, ev_creator.lastName])) if ev_creator else ""
        ev_type_str = ev.eventType.value if hasattr(ev.eventType, "value") else str(ev.eventType or "meeting")
        ev_start = ev.start.replace(tzinfo=ev.start.tzinfo or timezone.utc) if ev.start else ev.createdAt
        items.append({
            "id": f"{prefix}event-{ev.id}",
            "at": ev_start,
            "kind": "meeting",
            "title": f"{label_prefix}{ev_type_str.replace('_', ' ').title()}: {ev.title}",
            "detail": " · ".join(filter(None, [ev.description or "", ev.meetingLink or "", ev_creator_name])),
            "pending": ev_start > now_utc,
        })

    return items


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
    items.extend(await _collect_notes_and_tasks(entity_type, str(record_id), str(request.state.user["_id"])))
    # A deal can inherit call history only when the viewer can also read its lead.
    lead_id = entity_id if entity_type == "lead" else None
    if entity_type == "deal":
        deal = await DealModel.find_one(live_deal_filter({"_id": record_id}))
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
            items.extend(await _collect_notes_and_tasks("lead", str(lead_id), str(request.state.user["_id"]), prefix="lead-"))
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


@router.post("/lead/{entity_id}/interaction", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM))])
async def log_lead_interaction(request: Request, entity_id: str, payload: LeadInteractionInput):
    record_id = await require_record(request, "lead", entity_id, write=True)
    activity = activity_payload(
        userId=PydanticObjectId(request.state.user["_id"]),
        entityType=ACTIVITY_ENTITY_TYPE.LEAD,
        entityId=record_id,
        action=ACTIVITY_ACTION.UPDATED,
        title=f"{payload.channel.title()} interaction",
        description=payload.summary,
        metadata={"channel": payload.channel, "manual": True},
    )
    created = await ActivityRepository().create(data=activity)
    return {"data": {"id": str(created.id)}}


@router.post("/{entity_type}/{entity_id}", status_code=201, dependencies=[Depends(dependencies.authorized), Depends(dependencies.company_active), Depends(dependencies.company_context), Depends(dependencies.feature_access(FEATURE.CRM))])
async def create_action(request: Request, entity_type: str, entity_id: str, payload: NextActionInput):
    record_id = await require_record(request, entity_type, entity_id, write=True)
    owner_id = object_id(payload.ownerId)
    company_id = PydanticObjectId(request.state.user["companyId"])
    owner = await UserModel.find_one({
        "_id": owner_id,
        "companyId": company_id,
        "deletedAt": None,
        "status": "active",
    })
    if not owner:
        raise AppException(422, "Owner must be an active user in this company")
    company_doc = await CompanyModel.get_pymongo_collection().find_one(
        {"_id": company_id}, {"timezone": 1}
    )
    zone = resolve_timezone((company_doc or {}).get("timezone"))
    due_at = payload.dueAt
    if payload.localDueAt is not None:
        if payload.localDueAt.tzinfo is not None:
            raise AppException(422, "Local due date must not include a timezone")
        local = payload.localDueAt.replace(tzinfo=zone)
        due_at = local.astimezone(timezone.utc)
        if due_at.astimezone(zone).replace(tzinfo=None) != payload.localDueAt:
            raise AppException(422, "This local time does not exist in the company timezone")
    if due_at is None or due_at <= datetime.now(timezone.utc):
        raise AppException(422, "Due date must be in the future")
    creator_id = PydanticObjectId(request.state.user["_id"])
    action = NextActionModel(
        companyId=company_id,
        entityType=entity_type, entityId=record_id, kind=payload.kind,
        title=payload.title, dueAt=due_at, ownerId=owner_id,
        createdById=creator_id,
    )
    await action.insert()

    # Send in-app notification on next action creation to both owner and creator
    try:
        if entity_type == "lead":
            rec = await LeadsModel.get_pymongo_collection().find_one(
                {"_id": record_id}, {"fullName": 1, "companyName": 1, "lead_id": 1}
            )
            entity_label = (rec or {}).get("fullName") or (rec or {}).get("companyName") or (rec or {}).get("lead_id") or "Lead"
        else:
            rec = await DealModel.get_pymongo_collection().find_one(
                {"_id": record_id}, {"dealName": 1, "deal_id": 1}
            )
            entity_label = (rec or {}).get("dealName") or (rec or {}).get("deal_id") or "Deal"

        due_formatted = due_at.astimezone(zone).strftime("%d %b %Y, %I:%M %p")
        sender_doc = await UserModel.find_one({"_id": creator_id, "deletedAt": None})
        recipient_ids = list({owner_id, creator_id})
        recipients = await UserModel.find(
            {"_id": {"$in": recipient_ids}, "deletedAt": None}
        ).to_list()
        owner_name = " ".join(filter(None, [owner.firstName, owner.lastName])) or "Owner"

        for recipient in recipients:
            is_owner = recipient.id == owner_id
            body_text = (
                f"{payload.kind.title()} · '{payload.title}' for {entity_label} scheduled for {due_formatted}."
                if is_owner
                else f"{payload.kind.title()} · '{payload.title}' for {entity_label} assigned to {owner_name} for {due_formatted}."
            )
            await NotificationModel(
                companyId=company_id,
                recipientId=recipient,
                senderId=sender_doc,
                type=NOTIFICATION_TYPE.NEXT_ACTION_CREATED,
                entityType=(
                    NOTIFICATION_ENTITY_TYPE.LEAD
                    if entity_type == "lead"
                    else NOTIFICATION_ENTITY_TYPE.DEAL
                ),
                entityId=record_id,
                title="Next Action Scheduled",
                body=body_text,
                priority=NOTIFICATION_PRIORITY.MEDIUM,
                metadata={
                    "createdNextActionId": f"{action.id}:{recipient.id}",
                    "actionId": str(action.id),
                    "kind": payload.kind,
                    "dueAt": due_at.isoformat(),
                    "entityName": entity_label,
                    "ownerName": owner_name,
                },
            ).insert()
    except Exception as exc:
        print(f"Failed to create next action notification: {exc}")

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
