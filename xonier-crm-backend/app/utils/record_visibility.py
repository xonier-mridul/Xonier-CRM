"""MongoDB filters for live sales records, including legacy deletion markers."""

DELETED_STATUSES = ("delete", "deleted")


def live_lead_filter(filters=None, *, prefix=""):
    return _live_filter(filters, {
        f"{prefix}deletedAt": None,
        f"{prefix}status": {"$nin": list(DELETED_STATUSES)},
    })


def live_deal_filter(filters=None):
    return _live_filter(filters, {
        "deletedAt": None,
        "status": {"$nin": list(DELETED_STATUSES)},
        "dealStage": {"$nin": list(DELETED_STATUSES)},
    })


def _live_filter(filters, visibility):
    query = dict(filters or {})
    # Explicit status/stage filters must never replace the visibility constraint.
    for field, condition in visibility.items():
        if field in query and query[field] != condition:
            query["$and"] = [*query.get("$and", []), {field: condition}]
        else:
            query[field] = condition
    return query


def live_campaign_lead_join(company_id):
    """Join campaign membership to the current, same-company lead record."""
    return [
        {"$addFields": {"leadOid": {"$ifNull": ["$leadId.$id", "$leadId"]}}},
        {"$lookup": {
            "from": "leads", "localField": "leadOid", "foreignField": "_id", "as": "lead",
        }},
        {"$unwind": "$lead"},
        {"$match": live_lead_filter({"lead.companyId": company_id}, prefix="lead.")},
    ]
