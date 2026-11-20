"""Revenue forecast grouped by expected close month and deal owner."""
from collections import defaultdict
from datetime import datetime, timezone

from beanie import PydanticObjectId
from bson import DBRef, ObjectId

from app.utils.record_visibility import live_deal_filter
from app.db.models.deal_model import DealModel
from app.db.models.user_model import UserModel
from app.core.tenant import current_company
from app.services.deal_service import DealService
from app.services.deal_stage_service import DealStageService, stage_key
from app.utils.custom_exception import AppException
from app.utils.validate_admin import validate_admin_company_admin


def reference_id(value):
    if isinstance(value, DBRef):
        return value.id
    if isinstance(value, dict):
        return value.get("id") or value.get("$id")
    return value if isinstance(value, ObjectId) else None


def month_key(value: datetime) -> str:
    return value.astimezone(timezone.utc).strftime("%Y-%m")


def summarize(deals, owners, first_month, last_month, stage_probabilities=None):
    by_month_owner = defaultdict(lambda: {"dealCount": 0, "amount": 0, "weightedAmount": 0, "missingProbabilityCount": 0})
    undated = {"dealCount": 0, "amount": 0}
    for deal in deals:
        amount = int(deal.get("amount") or 0)
        close_date = deal.get("closeDate")
        if not isinstance(close_date, datetime):
            undated["dealCount"] += 1
            undated["amount"] += amount
            continue
        month = month_key(close_date.replace(tzinfo=close_date.tzinfo or timezone.utc))
        if month < first_month or month > last_month:
            continue
        owner_id = reference_id(deal.get("assignedTo")) or reference_id(deal.get("createdBy"))
        owner_key = str(owner_id) if owner_id else "unassigned"
        row = by_month_owner[(month, owner_key)]
        row["dealCount"] += 1
        row["amount"] += amount
        probability = deal.get("forecastProbability")
        if probability is None:
            probability = deal.get("dealProbability")
        if probability is None and stage_probabilities:
            probability = stage_probabilities.get(stage_key(deal.get("dealStage")))
        if probability is None:
            row["missingProbabilityCount"] += 1
        else:
            row["weightedAmount"] += round(amount * max(0, min(100, int(probability))) / 100)
    rows = [{"month": month, "ownerId": owner_id,
             "ownerName": owners.get(owner_id, "Unassigned" if owner_id == "unassigned" else "Unknown owner"),
             **values} for (month, owner_id), values in sorted(by_month_owner.items())]
    return {"rows": rows, "undated": undated,
            "total": {"dealCount": sum(row["dealCount"] for row in rows),
                      "amount": sum(row["amount"] for row in rows),
                      "weightedAmount": sum(row["weightedAmount"] for row in rows),
                      "missingProbabilityCount": sum(row["missingProbabilityCount"] for row in rows)}}


async def revenue_forecast(user, first_month, last_month):
    company = current_company.get()
    if not company or not ObjectId.is_valid(company):
        raise AppException(403, "Select a company to view its revenue forecast")
    stages = await DealStageService().list()
    stage_probabilities = {
        s["key"]: int(s["probability"])
        for s in stages
        if s.get("probability") is not None
    }
    closed_stages = {"won", "closed_won", "lost", "closed_lost", "delete"} | {
        s["key"] for s in stages if s.get("type") == "final"
    }
    last_year, last_number = (int(part) for part in last_month.split("-"))
    next_year, next_month = (last_year + 1, 1) if last_number == 12 else (last_year, last_number + 1)
    lower = datetime(int(first_month[:4]), int(first_month[5:]), 1, tzinfo=timezone.utc)
    upper = datetime(next_year, next_month, 1, tzinfo=timezone.utc)
    query = {"companyId": ObjectId(company), "status": "active", "deletedAt": None,
             "dealStage": {"$nin": list(closed_stages)},
             "$or": [{"closeDate": {"$gte": lower, "$lt": upper}}, {"closeDate": None}]}
    if not validate_admin_company_admin(user["userRole"]):
        members = await DealService().getTeamMem.get_team_members(user["_id"])
        visible_ids = list({str(member) for member in (members or [])} | {str(user["_id"])})
        query["createdBy.$id"] = {"$in": [PydanticObjectId(value) for value in visible_ids]}
    docs = await DealModel.get_pymongo_collection().find(
        DealModel._inject_scope(live_deal_filter(query)),
        {"amount": 1, "closeDate": 1, "dealStage": 1, "forecastProbability": 1, "dealProbability": 1,
         "assignedTo": 1, "createdBy": 1},
    ).to_list(length=None)
    ids = {ref for deal in docs for ref in
           (reference_id(deal.get("assignedTo")), reference_id(deal.get("createdBy"))) if ref}
    users = await UserModel.find({"_id": {"$in": list(ids)}}).to_list() if ids else []
    names = {str(person.id): " ".join(filter(None, [person.firstName, person.lastName])) for person in users}
    return summarize(docs, names, first_month, last_month, stage_probabilities=stage_probabilities)
