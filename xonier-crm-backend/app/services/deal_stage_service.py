from copy import deepcopy
from datetime import datetime, timezone
from uuid import uuid4

from app.services.lead_status_service import LeadStatusService
from app.utils.custom_exception import AppException
from app.utils.transaction_retry import retry_transaction

DEFAULT_STAGE_PROBABILITIES = {
    "qualification": 10,
    "requirement_analysis": 25,
    "proposal": 50,
    "negotiation": 75,
    "won": 100,
    "closed_won": 100,
    "lost": 0,
    "closed_lost": 0,
}

DEFAULT_STAGES = [
    {"key": key, "name": name, "color": color, "order": order,
     "type": "final" if key in {"won", "lost"} else "ongoing",
     "probability": DEFAULT_STAGE_PROBABILITIES[key]}
    for order, (key, name, color) in enumerate([
        ("qualification", "Qualification", "#64748b"),
        ("requirement_analysis", "Requirement Analysis", "#d97706"),
        ("proposal", "Proposal", "#2563eb"),
        ("negotiation", "Negotiation", "#9333ea"),
        ("won", "Won", "#059669"),
        ("lost", "Lost", "#e11d48"),
    ])
]
SYSTEM_KEYS = {stage["key"] for stage in DEFAULT_STAGES}


def stage_key(value):
    return "won" if value == "closed_won" else value


def resolve_stage_probability(stage):
    prob = stage.get("probability")
    if prob is not None:
        return int(prob)
    return DEFAULT_STAGE_PROBABILITIES.get(stage_key(stage.get("key")))


class DealStageService(LeadStatusService):
    collection_name = "deal_stage_settings"
    default_statuses = DEFAULT_STAGES

    async def validate_key(self, value, session):
        stages = (await self.config(session=session, lock=True))["statuses"]
        if not any(stage["key"] == stage_key(value) for stage in stages):
            raise AppException(422, "Select a configured stage for this company")

    async def probability_map(self, session=None):
        stages = (await self.config(session=session))["statuses"]
        result = {}
        for stage in stages:
            prob = resolve_stage_probability(stage)
            if prob is not None:
                result[stage["key"]] = prob
        if "won" in result:
            result.setdefault("closed_won", result["won"])
        return result

    async def list(self, include_usage=False):
        stages = sorted((await self.config())["statuses"], key=lambda s: (s["type"] == "final", s["order"], s["key"]))
        counts = {}
        if include_usage:
            rows = await self.db["deals"].aggregate([
                {"$match": {"companyId": self.company_id()}},
                {"$group": {"_id": "$dealStage", "count": {"$sum": 1}}},
            ]).to_list(length=None)
            for row in rows:
                key = stage_key(row["_id"])
                counts[key] = counts.get(key, 0) + row["count"]
        return [{**stage,
                 "probability": resolve_stage_probability(stage),
                 "protected": stage["key"] in SYSTEM_KEYS,
                 **({"leadCount": counts.get(stage["key"], 0)} if include_usage else {})}
                for stage in stages]

    @retry_transaction
    async def mutate(self, payload=None, key=None, delete=False):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                doc = await self.config(session=session, lock=True)
                stages = deepcopy(doc["statuses"])
                target = next((stage for stage in stages if stage["key"] == key), None)
                if key and not target:
                    raise AppException(404, "Deal stage not found")
                if delete:
                    if key in SYSTEM_KEYS:
                        raise AppException(409, "Built-in stages are required by the sales workflow")
                    rules = await self.db["deal_stage_automation_rules"].count_documents(
                        {"companyId": doc["_id"], "stageKey": key}, session=session
                    )
                    if rules:
                        raise AppException(409, "Delete automation rules for this stage first")
                    used = await self.db["deals"].count_documents(
                        {"companyId": doc["_id"], "dealStage": key}, session=session)
                    if used:
                        raise AppException(409, "Move deals out of this stage before deleting it")
                    stages.remove(target)
                else:
                    fields = {field: payload[field] for field in ("name", "order", "color")}
                    if "probability" in payload:
                        fields["probability"] = int(payload["probability"]) if payload["probability"] is not None else None
                    if any(stage is not target and stage["name"].casefold() == fields["name"].casefold()
                           for stage in stages):
                        raise AppException(409, "A deal stage with this name already exists")
                    if target:
                        target.update(fields)
                    else:
                        stages.append({"key": "stage_" + uuid4().hex, "type": "ongoing", **fields})
                await self.collection.update_one({"_id": doc["_id"]}, {"$set": {"statuses": stages, "updatedAt": datetime.now(timezone.utc)}}, session=session)
        return await self.list(include_usage=True)
