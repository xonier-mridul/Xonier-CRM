"""Company-owned lead stages. Keys never change when a display name is edited."""
from app.utils.transaction_retry import retry_transaction
from copy import deepcopy
from datetime import datetime, timezone
from uuid import uuid4
from bson import ObjectId
from pymongo import ReturnDocument
from app.core.tenant import current_company, is_admin_context
from app.utils.custom_exception import AppException

DEFAULT_STATUSES = [
    {"key": key, "name": name, "type": kind, "order": order, "color": color}
    for order, (key, name, kind, color) in enumerate([
        ("new", "New", "ongoing", "#64748b"),
        ("contacted", "Contacted", "ongoing", "#2563eb"),
        ("qualified", "Qualified", "ongoing", "#4f46e5"),
        ("proposal", "Proposal", "ongoing", "#9333ea"),
        ("won", "Won", "final", "#059669"),
        ("lost", "Lost", "ongoing", "#e11d48"),
    ])
]


def validate_stages(stages):
    if not stages or not any(s["type"] == "ongoing" for s in stages):
        raise AppException(400, "Keep at least one ongoing status for new leads")
    if sum(s["type"] == "final" for s in stages) > 1:
        raise AppException(409, "Only one final lead status is allowed. Change the existing final to ongoing first.")
    names = [s["name"].strip().casefold() for s in stages]
    if len(names) != len(set(names)):
        raise AppException(409, "A lead status with this name already exists")
    return sorted(stages, key=lambda s: (s["type"] == "final", s["order"], s["key"]))


class LeadStatusService:
    def __init__(self):
        # Lazy imports avoid the database/model import cycle.
        from app.db.db import Client, settings
        self.client = Client
        self.db = Client[settings.DATABASE_NAME]
        self.collection = self.db["lead_status_settings"]

    def company_id(self):
        cid = current_company.get()
        if not cid or not ObjectId.is_valid(cid):
            raise AppException(403, "A company context is required to manage lead statuses")
        return ObjectId(cid)

    async def config(self, session=None, lock=False):
        cid = self.company_id()
        if not lock:
            existing = await self.collection.find_one({"_id": cid}, session=session)
            if existing:
                return existing
        update = {"$setOnInsert": {"statuses": deepcopy(DEFAULT_STATUSES)}}
        if lock:
            # All lead status writes and configuration edits touch this document
            # in their transaction, preventing delete/assignment races.
            update["$inc"] = {"revision": 1}
        doc = await self.collection.find_one_and_update(
            {"_id": cid}, update, upsert=True,
            return_document=ReturnDocument.AFTER, session=session,
        )
        return doc

    async def statuses(self):
        cid = current_company.get()
        if is_admin_context.get() and (not cid or not ObjectId.is_valid(cid)):
            return validate_stages(deepcopy(DEFAULT_STATUSES))
        return validate_stages((await self.config())["statuses"])

    async def keys(self, kind):
        return [s["key"] for s in await self.statuses() if s["type"] == kind]

    async def resolve(self, value=None, session=None, final=False):
        cid = current_company.get()
        if is_admin_context.get() and (not cid or not ObjectId.is_valid(cid)):
            stages = validate_stages(deepcopy(DEFAULT_STATUSES))
        else:
            stages = validate_stages((await self.config(session=session, lock=False))["statuses"])
        if final:
            stage = next((s for s in stages if s["type"] == "final"), None)
            if not stage:
                raise AppException(400, "Configure a final lead status before converting a lead to a deal")
            return stage["key"]
        if not value:
            return next(s["key"] for s in stages if s["type"] == "ongoing")
        value = str(value).strip()
        stage = next((s for s in stages if s["key"] == value or s["name"].casefold() == value.casefold()), None)
        if not stage:
            raise AppException(422, "Select an existing lead status for this company")
        return stage["key"]

    async def list(self, include_usage=True):
        cid_raw = current_company.get()
        if is_admin_context.get() and (not cid_raw or not ObjectId.is_valid(cid_raw)):
            stages = sorted(await self.statuses(), key=lambda s: (s["order"], s["key"]))
            return [{**s, "leadCount": 0} for s in stages] if include_usage else stages
        cid = self.company_id()
        stages = sorted(await self.statuses(), key=lambda s: (s["order"], s["key"]))
        if not include_usage:
            return stages
        counts = await self.db["leads"].aggregate([
            {"$match": {"companyId": cid}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]).to_list(length=None)
        usage = {r["_id"]: r["count"] for r in counts}
        return [{**s, "leadCount": usage.get(s["key"], 0)} for s in stages]

    @retry_transaction
    async def mutate(self, payload=None, key=None, delete=False):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                doc = await self.config(session=session, lock=True)
                stages = deepcopy(doc["statuses"])
                target = next((s for s in stages if s["key"] == key), None)
                if key and not target:
                    raise AppException(404, "Lead status not found")
                if delete:
                    used = await self.db["leads"].count_documents(
                        {"companyId": self.company_id(), "status": key}, session=session)
                    if used:
                        raise AppException(409, "This status is used by leads. Move those leads to another status before deleting it.")
                    stages.remove(target)
                elif target:
                    if payload and payload.get("type") == "final":
                        for s in stages:
                            if s is not target and s.get("type") == "final":
                                s["type"] = "ongoing"
                    target.update(payload)
                else:
                    if payload and payload.get("type") == "final":
                        for s in stages:
                            if s.get("type") == "final":
                                s["type"] = "ongoing"
                    stages.append({"key": "stage_" + uuid4().hex, **payload})
                stages = validate_stages(stages)
                await self.collection.update_one({"_id": doc["_id"]}, {"$set": {
                    "statuses": stages, "updatedAt": datetime.now(timezone.utc),
                }}, session=session)
        return await self.list()
