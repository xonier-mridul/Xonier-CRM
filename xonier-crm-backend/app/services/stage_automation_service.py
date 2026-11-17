"""Company-scoped rules that create a next action when a deal enters a stage."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from bson import DBRef, ObjectId

from app.core.tenant import current_company
from app.db.db import Client, settings
from app.utils.custom_exception import AppException


COLLECTION = "deal_stage_automation_rules"


def company_id():
    value = current_company.get()
    if not value or not ObjectId.is_valid(value):
        raise AppException(403, "Company context required")
    return ObjectId(value)


def rules_collection():
    return Client[settings.DATABASE_NAME][COLLECTION]


def serialize(rule):
    return {key: rule[key] for key in ("id", "stageKey", "kind", "title", "delayDays", "enabled")}


async def apply_deal_rules(deal, stage, actor_id, session):
    """Called inside the deal update transaction; a retry rolls back its actions."""
    from app.db.models.next_action_model import NextActionModel

    tenant_id = deal.get("companyId")
    if not tenant_id or not ObjectId.is_valid(str(tenant_id)):
        raise AppException(422, "Deal has no valid company")
    tenant_id = ObjectId(str(tenant_id))
    now = datetime.now(timezone.utc)
    cursor = rules_collection().find({"companyId": tenant_id, "stageKey": stage, "enabled": True}, session=session)
    async for rule in cursor:
        owner = deal.get("assignedTo") or deal.get("createdBy")
        if isinstance(owner, DBRef):
            owner = owner.id
        elif isinstance(owner, dict):
            owner = owner.get("id") or owner.get("$id")
        if not owner or not ObjectId.is_valid(str(owner)):
            owner = actor_id
        if not owner or not ObjectId.is_valid(str(owner)):
            raise AppException(422, "Deal has no valid activity owner")
        creator = actor_id if actor_id and ObjectId.is_valid(str(actor_id)) else owner
        await NextActionModel.get_pymongo_collection().insert_one({
            "companyId": tenant_id, "entityType": "deal", "entityId": deal["_id"],
            "kind": rule["kind"], "title": rule["title"],
            "dueAt": now + timedelta(days=rule["delayDays"]), "ownerId": ObjectId(str(owner)),
            "createdById": ObjectId(str(creator)), "completedAt": None,
            "remindedAt": None, "createdAt": now, "updatedAt": now,
        }, session=session)


async def save_rule(data, rule_id=None):
    from app.services.deal_stage_service import DealStageService

    stages = await DealStageService().list()
    if data["stageKey"] not in {stage["key"] for stage in stages}:
        raise AppException(422, "Select an existing deal stage")
    collection = rules_collection()
    if rule_id:
        result = await collection.update_one({"companyId": company_id(), "id": rule_id}, {"$set": data})
        if not result.matched_count:
            raise AppException(404, "Automation rule not found")
        return rule_id
    rule_id = uuid4().hex
    await collection.insert_one({"companyId": company_id(), "id": rule_id, **data})
    return rule_id
