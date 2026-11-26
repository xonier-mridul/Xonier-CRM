from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from bson import DBRef, ObjectId
from pymongo import ReturnDocument

from app.core.tenant import current_company
from app.db.db import Client
from app.db.models.lead_model import LeadsModel
from app.utils.custom_exception import AppException
from app.utils.record_visibility import live_lead_filter
from app.utils.transaction_retry import retry_transaction

SALES_TIMEZONE = ZoneInfo("Asia/Kolkata")


def sales_company_id(user):
    company_id = current_company.get()
    if not ObjectId.is_valid(company_id or "") or company_id != str(user.get("companyId")):
        raise AppException(403, "Company context missing")
    return ObjectId(company_id)


def tasks_collection():
    return LeadsModel.get_pymongo_collection().database["sales_lead_tasks"]


def task_requests_collection():
    return tasks_collection().database["sales_lead_task_requests"]


async def cancel_pending_tasks(company_id, lead_ids, changed_at, session, keep_assignee=None):
    query = {"companyId": company_id, "leadId": {"$in": lead_ids}, "status": "pending"}
    if keep_assignee is not None:
        query["assigneeId"] = {"$ne": keep_assignee}
    await tasks_collection().update_many(
        query, {"$set": {"status": "cancelled", "updatedAt": changed_at}}, session=session
    )


def lead_access_pipeline(company_id, assignee_id):
    return [
        {"$lookup": {
            "from": "leads", "localField": "leadId", "foreignField": "_id", "as": "lead",
        }},
        {"$unwind": "$lead"},
        {"$match": live_lead_filter({
            "lead.companyId": company_id,
            "lead.isAssigned": True,
            "$or": [
                {"lead.assignedTo.$id": assignee_id},
                {"lead.assignedTo": {"$in": [DBRef("users", assignee_id), assignee_id, str(assignee_id)]}},
            ],
        }, prefix="lead.")},
    ]


def task_scope(user):
    return {
        "companyId": sales_company_id(user),
        "assigneeId": ObjectId(user["_id"]),
    }


def task_filter(scope, *, date_field, date_from, date_to, due_today, status, today):
    query = {**scope, "status": status if status else {"$in": ["pending", "completed"]}}
    if due_today:
        return {**query, "status": "pending", "dueDate": {"$lte": today.isoformat()}}
    if date_from and date_to and date_from > date_to:
        raise AppException(400, "Start date must be on or before end date")
    bounds = {}
    if date_field == "assignedAt":
        if date_from and date_from > date.min:
            bounds["$gte"] = datetime.combine(date_from, time.min, SALES_TIMEZONE).astimezone(timezone.utc)
        if date_to and date_to < date.max:
            bounds["$lt"] = datetime.combine(
                date_to + timedelta(days=1), time.min, SALES_TIMEZONE
            ).astimezone(timezone.utc)
    else:
        if date_from:
            bounds["$gte"] = date_from.isoformat()
        if date_to:
            bounds["$lte"] = date_to.isoformat()
    if bounds:
        query[date_field] = bounds
    return query


async def list_sales_tasks(user, *, date_field, date_from, date_to, due_today, status, page, limit, team=False, assignee_id=None, search=""):
    scope = task_scope(user)
    if team:
        from app.utils.lead_assignment_access import require_lead_assigner
        require_lead_assigner(user)
        scope.pop("assigneeId")
        # Managers supervise assignments they created; company administrators
        # have company-wide oversight. The authenticated company is mandatory.
        if not any(r.get("code") in {"SUPER_ADMIN", "COMPANY_ADMIN", "ADMIN"} for r in user.get("userRole", [])):
            scope["createdBy"] = ObjectId(user["_id"])
    if assignee_id and not team:
        raise AppException(403, "Team access required")
    if assignee_id:
        scope["assigneeId"] = ObjectId(assignee_id)
    today = datetime.now(SALES_TIMEZONE).date()
    query = task_filter(
        scope, date_field=date_field, date_from=date_from, date_to=date_to,
        due_today=due_today, status=status, today=today,
    )
    pipeline = [
        {"$match": query},
        {"$sort": {"dueDate": 1, "_id": 1}},
        *(lead_access_pipeline(scope["companyId"], scope["assigneeId"]) if not team else [
            {"$lookup": {"from": "leads", "localField": "leadId", "foreignField": "_id", "as": "lead"}},
            {"$unwind": "$lead"},
            {"$match": live_lead_filter({"lead.companyId": scope["companyId"]}, prefix="lead.")},
        ]),
        {"$lookup": {"from": "users", "localField": "assigneeId", "foreignField": "_id", "as": "assignee"}},
        {"$project": {
            "assigneeId": 1, "assigneeName": {"$arrayElemAt": ["$assignee.firstName", 0]}, "title": 1, "instructions": 1, "status": 1, "dueDate": 1, "assignedAt": 1,
            "leadId": 1, "leadCode": "$lead.lead_id", "leadName": "$lead.fullName",
            "connectStatus": {"$ifNull": ["$lead.connectStatus", "not_reached"]},
            "followUpAt": {"$ifNull": ["$lead.followUpAt", None]},
        }},
        *([{"$group": {
            "_id": "$assigneeId", "assigneeName": {"$first": "$assigneeName"},
            "taskCount": {"$sum": 1},
            "pending": {"$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}},
            "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            "overdue": {"$sum": {"$cond": [{"$and": [{"$eq": ["$status", "pending"]}, {"$lt": ["$dueDate", today.isoformat()]}]}, 1, 0]}},
        }}, *([{"$match": {"assigneeName": {"$regex": __import__("re").escape(search), "$options": "i"}}}] if search else []),
        {"$sort": {"assigneeName": 1, "_id": 1}}] if team and not assignee_id else []),
        {"$facet": {
            "items": [{"$skip": (page - 1) * limit}, {"$limit": limit}],
            "total": [{"$count": "count"}],
        }},
    ]
    result = (await tasks_collection().aggregate(pipeline).to_list(length=1))[0]
    for task in result["items"]:
        task["assigneeId"] = str(task.get("assigneeId", ""))
        task["id"] = str(task.pop("_id"))
        if team and not assignee_id:
            task["assigneeId"] = task["id"]
            continue
        task["leadId"] = str(task["leadId"])
        task["assignedAt"] = task["assignedAt"].replace(tzinfo=timezone.utc).isoformat()
        if isinstance(task["followUpAt"], datetime):
            task["followUpAt"] = task["followUpAt"].replace(tzinfo=timezone.utc).isoformat()
    return {
        "items": result["items"],
        "total": result["total"][0]["count"] if result["total"] else 0,
    }


@retry_transaction
async def complete_sales_task(user, task_id):
    scope = task_scope(user)
    query = {**scope, "_id": ObjectId(task_id), "status": {"$in": ["pending", "completed"]}}
    collection = tasks_collection()
    async with await Client.start_session() as session:
        async with session.start_transaction():
            found = await collection.aggregate([
                {"$match": query},
                *lead_access_pipeline(scope["companyId"], scope["assigneeId"]),
                {"$project": {"status": 1}},
            ], session=session).to_list(length=1)
            if not found:
                raise AppException(404, "Sales task not found")
            if found[0]["status"] == "pending":
                now = datetime.now(timezone.utc)
                updated = await collection.find_one_and_update(
                    {**query, "status": "pending"},
                    {"$set": {"status": "completed", "completedAt": now, "updatedAt": now}},
                    projection={"_id": 1}, return_document=ReturnDocument.AFTER, session=session,
                )
                if updated is None:
                    raise AppException(409, "The task changed. Refresh and try again.")
    return {"id": task_id, "status": "completed"}
