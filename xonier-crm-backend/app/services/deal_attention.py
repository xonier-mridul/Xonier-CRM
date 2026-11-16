from datetime import datetime, timedelta, timezone

from app.db.models.deal_model import DealModel
from app.utils.custom_exception import AppException

STALL_DAYS = 14


async def get_attention_queue(filters, mode, page, limit):
    if mode not in {"all", "stalled", "missing"}:
        raise AppException(422, "Invalid deal attention filter")
    try:
        page = max(1, int(page))
        limit = min(100, max(1, int(limit)))
    except (ValueError, TypeError):
        raise AppException(422, "Invalid queue pagination")
    now = datetime.now(timezone.utc)
    stage_date = {"$ifNull": ["$stageEnteredAt", "$createdAt"]}
    queue_match = {"stalled": True} if mode == "stalled" else {"noNextAction": True} if mode == "missing" else {}
    rows = await DealModel.get_pymongo_collection().aggregate([
        {"$match": DealModel._inject_scope({"$and": [
            filters, {"deletedAt": None, "dealStage": {"$nin": ["won", "closed_won", "lost", "delete"]}},
        ]})},
        {"$lookup": {
            "from": "next_actions",
            "let": {"deal": "$_id", "company": "$companyId"},
            "pipeline": [
                {"$match": {"entityType": "deal", "completedAt": None, "$expr": {"$and": [
                    {"$eq": ["$entityId", "$$deal"]}, {"$eq": ["$companyId", "$$company"]},
                ]}}},
                {"$sort": {"dueAt": 1}}, {"$limit": 1}, {"$project": {"_id": 0, "dueAt": 1, "title": 1}},
            ],
            "as": "pending",
        }},
        {"$set": {
            "ageFrom": stage_date,
            "daysInStage": {"$max": [0, {"$floor": {"$divide": [{"$subtract": [now, stage_date]}, 86400000]}}]},
            "estimated": {"$eq": [{"$ifNull": ["$stageEnteredAt", None]}, None]},
            "stalled": {"$lte": [stage_date, now - timedelta(days=STALL_DAYS)]},
            "noNextAction": {"$eq": [{"$size": "$pending"}, 0]},
            "nextAction": {"$ifNull": [{"$arrayElemAt": ["$pending", 0]}, None]},
        }},
        {"$facet": {
            "stages": [{"$group": {
                "_id": "$dealStage", "total": {"$sum": 1},
                "stalled": {"$sum": {"$cond": ["$stalled", 1, 0]}},
                "missing": {"$sum": {"$cond": ["$noNextAction", 1, 0]}},
            }}],
            "count": [{"$match": queue_match}, {"$count": "total"}],
            "items": [
                {"$match": queue_match},
                {"$sort": {"ageFrom": 1, "_id": 1}}, {"$skip": (page - 1) * limit}, {"$limit": limit},
                {"$project": {
                    "_id": 0, "id": {"$toString": "$_id"}, "dealName": 1, "dealStage": 1,
                    "daysInStage": 1, "estimated": 1, "stalled": 1, "noNextAction": 1, "nextAction": 1,
                }},
            ],
        }},
    ]).to_list(length=1)
    report = rows[0]
    count = report["count"][0]["total"] if report["count"] else 0
    for item in report["items"]:
        if item["nextAction"]:
            due = item["nextAction"]["dueAt"]
            item["nextAction"]["dueAt"] = due.replace(tzinfo=due.tzinfo or timezone.utc).isoformat()
    return {
        "data": report["items"], "stages": report["stages"], "stallDays": STALL_DAYS,
        "totalPages": (count + limit - 1) // limit,
    }
