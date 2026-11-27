from datetime import datetime, timedelta, timezone

from pymongo.errors import DuplicateKeyError

from app.core.notification_enum import (
    NOTIFICATION_ENTITY_TYPE,
    NOTIFICATION_PRIORITY,
    NOTIFICATION_TYPE,
)
from app.core.tenant import bypass_scope
from app.db.models.company_model import CompanyModel
from app.db.models.deal_model import DealModel
from app.db.models.lead_model import LeadsModel
from app.db.models.next_action_model import NextActionModel
from app.db.models.notification_model import NotificationModel
from app.db.models.user_model import UserModel
from app.utils.timezone_utils import resolve_timezone


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _format_due(due_at: datetime, tz_name: str | None) -> str:
    zone = resolve_timezone(tz_name)
    return _ensure_utc(due_at).astimezone(zone).strftime("%d %b %Y, %I:%M %p")


async def _resolve_entity_label(action: NextActionModel) -> str:
    if action.entityType == "lead":
        lead = await LeadsModel.get_pymongo_collection().find_one(
            {"_id": action.entityId},
            {"fullName": 1, "companyName": 1, "lead_id": 1},
        )
        if lead:
            return (
                lead.get("fullName")
                or lead.get("companyName")
                or lead.get("lead_id")
                or "Lead"
            )
        return "Lead"

    deal = await DealModel.get_pymongo_collection().find_one(
        {"_id": action.entityId},
        {"dealName": 1, "deal_id": 1},
    )
    if deal:
        return deal.get("dealName") or deal.get("deal_id") or "Deal"
    return "Deal"


async def _get_company_timezone(company_id, cache: dict) -> str | None:
    key = str(company_id)
    if key in cache:
        return cache[key]
    company = await CompanyModel.get_pymongo_collection().find_one(
        {"_id": company_id}, {"timezone": 1}
    )
    tz_name = (company or {}).get("timezone")
    cache[key] = tz_name
    return tz_name


async def send_next_action_reminders():
    """Send in-app reminders for upcoming (15 min before) and due commercial next actions."""
    token = bypass_scope.set(True)
    try:
        now = datetime.now(timezone.utc)
        tz_cache: dict[str, str | None] = {}

        # 1. Advance reminder (~15 minutes before dueAt) for actions scheduled >= 20 min ahead
        upcoming_cutoff = now + timedelta(minutes=15)
        upcoming_actions = await NextActionModel.find({
            "dueAt": {"$gt": now, "$lte": upcoming_cutoff},
            "completedAt": None,
            "upcomingRemindedAt": None,
            "remindedAt": None,
        }).limit(100).to_list()

        for action in upcoming_actions:
            due_utc = _ensure_utc(action.dueAt)
            created_utc = _ensure_utc(action.createdAt)
            if (due_utc - created_utc) < timedelta(minutes=20):
                action.upcomingRemindedAt = now
                await action.save()
                continue

            recipient_ids = list({action.ownerId, action.createdById})
            recipients = await UserModel.find({
                "_id": {"$in": recipient_ids},
                "companyId": action.companyId,
                "deletedAt": None,
            }).to_list()
            if not recipients:
                continue

            entity_label = await _resolve_entity_label(action)
            tz_name = await _get_company_timezone(action.companyId, tz_cache)
            due_str = _format_due(action.dueAt, tz_name)
            minutes_left = max(1, int((due_utc - now).total_seconds() // 60))

            for recipient in recipients:
                try:
                    await NotificationModel(
                        companyId=action.companyId,
                        recipientId=recipient,
                        type=NOTIFICATION_TYPE.NEXT_ACTION_REMINDER,
                        entityType=(
                            NOTIFICATION_ENTITY_TYPE.LEAD
                            if action.entityType == "lead"
                            else NOTIFICATION_ENTITY_TYPE.DEAL
                        ),
                        entityId=action.entityId,
                        title=f"Upcoming Next Action ({minutes_left} min)",
                        body=f"{action.kind.title()} · '{action.title}' for {entity_label} is due at {due_str}.",
                        priority=NOTIFICATION_PRIORITY.HIGH,
                        metadata={
                            "upcomingNextActionId": f"{action.id}:{recipient.id}",
                            "actionId": str(action.id),
                            "kind": action.kind,
                            "dueAt": due_utc.isoformat(),
                            "entityName": entity_label,
                        },
                    ).insert()
                except DuplicateKeyError:
                    pass
            action.upcomingRemindedAt = now
            await action.save()

        # 2. Due-now reminder when dueAt <= now
        due_actions = await NextActionModel.find({
            "dueAt": {"$lte": now},
            "completedAt": None,
            "remindedAt": None,
        }).limit(100).to_list()

        for action in due_actions:
            recipient_ids = list({action.ownerId, action.createdById})
            recipients = await UserModel.find({
                "_id": {"$in": recipient_ids},
                "companyId": action.companyId,
                "deletedAt": None,
            }).to_list()
            if not recipients:
                continue

            entity_label = await _resolve_entity_label(action)
            tz_name = await _get_company_timezone(action.companyId, tz_cache)
            due_str = _format_due(action.dueAt, tz_name)

            for recipient in recipients:
                reminder_key = (
                    str(action.id)
                    if recipient.id == action.ownerId
                    else f"{action.id}:{recipient.id}"
                )
                try:
                    await NotificationModel(
                        companyId=action.companyId,
                        recipientId=recipient,
                        type=NOTIFICATION_TYPE.NEXT_ACTION_REMINDER,
                        entityType=(
                            NOTIFICATION_ENTITY_TYPE.LEAD
                            if action.entityType == "lead"
                            else NOTIFICATION_ENTITY_TYPE.DEAL
                        ),
                        entityId=action.entityId,
                        title="Next Action Due",
                        body=f"{action.kind.title()} · '{action.title}' for {entity_label} is due ({due_str}).",
                        priority=NOTIFICATION_PRIORITY.HIGH,
                        metadata={
                            "nextActionId": reminder_key,
                            "actionId": str(action.id),
                            "kind": action.kind,
                            "dueAt": _ensure_utc(action.dueAt).isoformat(),
                            "entityName": entity_label,
                        },
                    ).insert()
                except DuplicateKeyError:
                    pass
            action.remindedAt = now
            if action.upcomingRemindedAt is None:
                action.upcomingRemindedAt = now
            await action.save()
    finally:
        bypass_scope.reset(token)
