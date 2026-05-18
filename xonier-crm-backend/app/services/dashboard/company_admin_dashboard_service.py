from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.utils.custom_exception import AppException
from app.db.models.lead_model import LeadsModel
from app.db.models.enquiry_management_model import EnquiryModel
from app.db.models.user_model import UserModel
from app.db.models.deal_model import DealModel
from app.db.models.task_model import TaskModel
from app.db.models.quotation_model import QuotationModel
from app.core.enums import (
    SALES_STATUS,
    DEAL_STATUS,
    USER_STATUS,
    DEAL_PIPELINE,
    TASK_PRIORITY,
    FEATURE,
)
from app.db import db as database_module
from bson import ObjectId
import asyncio


class CompanyAdminDashboardService:

    async def _aggregate(self, model, pipeline: list) -> list:
        collection = database_module.db[model.Settings.name]
        cursor = collection.aggregate(pipeline)
        return await cursor.to_list(length=None)

    def _company_match(self, company_id: str) -> dict:
        return {"companyId": ObjectId(company_id)}

    def _resolve_date_range(
        self,
        filter: str,
        start_date: Optional[str],
        end_date: Optional[str],
    ):
        now = datetime.now(timezone.utc)

        if filter == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now

        elif filter == "this_week":
            start = (now - timedelta(days=now.weekday())).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            end = now

        elif filter == "this_month":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now

        elif filter == "this_year":
            start = now.replace(
                month=1, day=1, hour=0, minute=0, second=0, microsecond=0
            )
            end = now

        elif filter == "custom":
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").replace(
                    tzinfo=timezone.utc
                )
                end = datetime.strptime(end_date, "%Y-%m-%d").replace(
                    hour=23, minute=59, second=59, tzinfo=timezone.utc
                )
            except ValueError:
                raise AppException(400, "Invalid date format. Use YYYY-MM-DD")

        else:
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now

        return start, end

    def _get_enabled_features(self, user: Dict[str, Any]) -> set:
        """
        Extracts enabled feature keys from the user's company subscription plan.
        Returns a set of feature_key strings.
        """
        try:
            company = user.get("companyId", {})
            if not isinstance(company, dict):
                return set()

            subscription = company.get("subscription", {})
            if not isinstance(subscription, dict):
                return set()

            plan = subscription.get("planId", {})
            if not isinstance(plan, dict):
                return set()

            features = plan.get("features", [])
            enabled = set()

            for pf in features:
                if not pf.get("is_enabled", False):
                    continue
                feature_doc = pf.get("feature", {})
                if isinstance(feature_doc, dict):
                    key = feature_doc.get("feature_key")
                    if key:
                        enabled.add(key)

            return enabled
        except Exception:
            return set()

    async def get_stats(
        self,
        user: Dict[str, Any],
        filter: str = "this_month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            company_id = user.get("companyId")
            if isinstance(company_id, dict):
                company_id = company_id.get("id") or company_id.get("_id")

            if not company_id:
                raise AppException(403, "Company context missing")

            company_id = str(company_id)
            now = datetime.now(timezone.utc)
            start_of_year = now.replace(
                month=1, day=1, hour=0, minute=0, second=0, microsecond=0
            )

            range_start, range_end = self._resolve_date_range(
                filter, start_date, end_date
            )

            enabled_features = self._get_enabled_features(user)

            coroutines = {
                "users": self._user_stats(company_id, range_start, range_end),
            }

            crm_features = {
                FEATURE.CRM.value.strip(",").strip()
                if isinstance(FEATURE.CRM.value, tuple)
                else "crm:feature"
            }

            has_crm = bool(
                enabled_features.intersection(crm_features)
                or "crm:feature" in enabled_features
                or not enabled_features
            )

            has_task = (
                "task:feature" in enabled_features or not enabled_features
            )
            has_telecom = (
                "telecom:feature" in enabled_features or not enabled_features
            )

            if has_crm:
                coroutines.update(
                    {
                        "leads": self._lead_stats(
                            company_id, range_start, range_end
                        ),
                        "deals": self._deal_stats(
                            company_id, range_start, range_end
                        ),
                        "enquiries": self._enquiry_stats(
                            company_id, range_start, range_end
                        ),
                        "monthlyLeadTrend": self._monthly_trend(
                            LeadsModel, company_id, start_of_year
                        ),
                        "monthlyDealTrend": self._monthly_trend(
                            DealModel, company_id, start_of_year
                        ),
                        "leadSourceBreakdown": self._lead_source_breakdown(
                            company_id
                        ),
                        "leadStatusBreakdown": self._lead_status_breakdown(
                            company_id
                        ),
                        "latestLeads": self._latest_leads(company_id),
                        "dealPipelineBreakdown": self._deal_pipeline_breakdown(
                            company_id
                        ),
                        "topPerformers": self._top_performers(
                            company_id, range_start, range_end
                        ),
                        "conversionRate": self._conversion_rate(
                            company_id, range_start, range_end
                        ),
                    }
                )

            if has_task:
                coroutines["tasks"] = self._task_stats(
                    company_id, range_start, range_end
                )
                coroutines["taskPriorityBreakdown"] = (
                    self._task_priority_breakdown(company_id)
                )

            keys = list(coroutines.keys())
            results = await asyncio.gather(*coroutines.values())
            gathered = dict(zip(keys, results))

            response = {
                "role": "company_admin",
                "period": {
                    "filter": filter,
                    "start": range_start.isoformat(),
                    "end": range_end.isoformat(),
                    "year": now.year,
                    "generatedAt": now.isoformat(),
                },
                "enabledFeatures": list(enabled_features),
                "users": gathered.get("users", {}),
            }

            if has_crm:
                response.update(
                    {
                        "leads": gathered.get("leads", {}),
                        "deals": gathered.get("deals", {}),
                        "enquiries": gathered.get("enquiries", {}),
                        "monthlyLeadTrend": gathered.get("monthlyLeadTrend", []),
                        "monthlyDealTrend": gathered.get("monthlyDealTrend", []),
                        "leadSourceBreakdown": gathered.get(
                            "leadSourceBreakdown", []
                        ),
                        "leadStatusBreakdown": gathered.get(
                            "leadStatusBreakdown", []
                        ),
                        "latestLeads": gathered.get("latestLeads", []),
                        "dealPipelineBreakdown": gathered.get(
                            "dealPipelineBreakdown", []
                        ),
                        "topPerformers": gathered.get("topPerformers", []),
                        "conversionRate": gathered.get("conversionRate", {}),
                    }
                )

            if has_task:
                response.update(
                    {
                        "tasks": gathered.get("tasks", {}),
                        "taskPriorityBreakdown": gathered.get(
                            "taskPriorityBreakdown", []
                        ),
                    }
                )

            return response

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def _user_stats(
        self, company_id: str, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        match = self._company_match(company_id)
        pipeline = [
            {"$match": match},
            {
                "$facet": {
                    "total": [
                        {
                            "$match": {
                                "status": {"$ne": USER_STATUS.DELETED.value}
                            }
                        },
                        {"$count": "count"},
                    ],
                    "thisMonth": [
                        {
                            "$match": {
                                "createdAt": {
                                    "$gte": range_start,
                                    "$lte": range_end,
                                },
                                "status": {"$ne": USER_STATUS.DELETED.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "active": [
                        {"$match": {"status": USER_STATUS.ACTIVE.value}},
                        {"$count": "count"},
                    ],
                    "inactive": [
                        {"$match": {"status": USER_STATUS.INACTIVE.value}},
                        {"$count": "count"},
                    ],
                    "suspended": [
                        {"$match": {"status": USER_STATUS.SUSPENDED.value}},
                        {"$count": "count"},
                    ],
                    "deleted": [
                        {"$match": {"status": USER_STATUS.DELETED.value}},
                        {"$count": "count"},
                    ],
                    "notVerified": [
                        {"$match": {"isEmailVerified": False}},
                        {"$count": "count"},
                    ],
                }
            },
        ]

        result = await self._aggregate(UserModel, pipeline)
        raw = result[0] if result else {}

        def _count(key):
            items = raw.get(key, [])
            return items[0].get("count", 0) if items else 0

        return {
            "total": _count("total"),
            "thisMonth": _count("thisMonth"),
            "active": _count("active"),
            "inactive": _count("inactive"),
            "suspended": _count("suspended"),
            "deleted": _count("deleted"),
            "notVerified": _count("notVerified"),
        }

    async def _lead_stats(
        self, company_id: str, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        match = self._company_match(company_id)
        pipeline = [
            {"$match": match},
            {
                "$facet": {
                    "total": [
                        {
                            "$match": {
                                "status": {"$ne": SALES_STATUS.DELETE.value}
                            }
                        },
                        {"$count": "count"},
                    ],
                    "thisMonth": [
                        {
                            "$match": {
                                "createdAt": {
                                    "$gte": range_start,
                                    "$lte": range_end,
                                },
                                "status": {"$ne": SALES_STATUS.DELETE.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "active": [
                        {
                            "$match": {
                                "status": {
                                    "$in": [
                                        SALES_STATUS.NEW.value,
                                        SALES_STATUS.CONTACTED.value,
                                        SALES_STATUS.QUALIFIED.value,
                                        SALES_STATUS.PROPOSAL.value,
                                    ]
                                }
                            }
                        },
                        {"$count": "count"},
                    ],
                    "won": [
                        {"$match": {"status": SALES_STATUS.WON.value}},
                        {"$count": "count"},
                    ],
                    "lost": [
                        {"$match": {"status": SALES_STATUS.LOST.value}},
                        {"$count": "count"},
                    ],
                    "deleted": [
                        {"$match": {"status": SALES_STATUS.DELETE.value}},
                        {"$count": "count"},
                    ],
                    "unassigned": [
                        {
                            "$match": {
                                "status": {"$ne": SALES_STATUS.DELETE.value},
                                "$or": [
                                    {"assignTo": {"$exists": False}},
                                    {"assignTo": None},
                                ],
                            }
                        },
                        {"$count": "count"},
                    ],
                    "inDeal": [
                        {"$match": {"inDeal": True}},
                        {"$count": "count"},
                    ],
                }
            },
        ]

        result = await self._aggregate(LeadsModel, pipeline)
        raw = result[0] if result else {}

        def _count(key):
            items = raw.get(key, [])
            return items[0].get("count", 0) if items else 0

        return {
            "total": _count("total"),
            "thisMonth": _count("thisMonth"),
            "active": _count("active"),
            "won": _count("won"),
            "lost": _count("lost"),
            "deleted": _count("deleted"),
            "unassigned": _count("unassigned"),
            "inDeal": _count("inDeal"),
        }

    async def _deal_stats(
        self, company_id: str, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        match = self._company_match(company_id)
        pipeline = [
            {"$match": match},
            {
                "$facet": {
                    "total": [
                        {
                            "$match": {
                                "status": {"$ne": DEAL_STATUS.DELETE.value}
                            }
                        },
                        {"$count": "count"},
                    ],
                    "thisMonth": [
                        {
                            "$match": {
                                "createdAt": {
                                    "$gte": range_start,
                                    "$lte": range_end,
                                },
                                "status": {"$ne": DEAL_STATUS.DELETE.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "active": [
                        {"$match": {"status": DEAL_STATUS.ACTIVE.value}},
                        {"$count": "count"},
                    ],
                    "closed": [
                        {"$match": {"status": DEAL_STATUS.CLOSED.value}},
                        {"$count": "count"},
                    ],
                    "totalRevenue": [
                        {"$match": {"status": DEAL_STATUS.CLOSED.value}},
                        {
                            "$group": {
                                "_id": None,
                                "total": {"$sum": "$amount"},
                            }
                        },
                    ],
                    "periodRevenue": [
                        {
                            "$match": {
                                "status": DEAL_STATUS.CLOSED.value,
                                "createdAt": {
                                    "$gte": range_start,
                                    "$lte": range_end,
                                },
                            }
                        },
                        {
                            "$group": {
                                "_id": None,
                                "total": {"$sum": "$amount"},
                            }
                        },
                    ],
                    "avgDealValue": [
                        {
                            "$match": {
                                "status": {"$ne": DEAL_STATUS.DELETE.value}
                            }
                        },
                        {
                            "$group": {
                                "_id": None,
                                "avg": {"$avg": "$amount"},
                            }
                        },
                    ],
                }
            },
        ]

        result = await self._aggregate(DealModel, pipeline)
        raw = result[0] if result else {}

        def _count(key):
            items = raw.get(key, [])
            return items[0].get("count", 0) if items else 0

        def _sum(key):
            items = raw.get(key, [])
            return round(items[0].get("total", 0), 2) if items else 0

        def _avg(key):
            items = raw.get(key, [])
            val = items[0].get("avg", 0) if items else 0
            return round(val, 2)

        return {
            "total": _count("total"),
            "thisMonth": _count("thisMonth"),
            "active": _count("active"),
            "closed": _count("closed"),
            "totalRevenue": _sum("totalRevenue"),
            "periodRevenue": _sum("periodRevenue"),
            "avgDealValue": _avg("avgDealValue"),
        }

    async def _enquiry_stats(
        self, company_id: str, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        match = self._company_match(company_id)
        pipeline = [
            {"$match": {**match, "deletedAt": None}},
            {
                "$facet": {
                    "total": [{"$count": "count"}],
                    "thisMonth": [
                        {
                            "$match": {
                                "createdAt": {
                                    "$gte": range_start,
                                    "$lte": range_end,
                                }
                            }
                        },
                        {"$count": "count"},
                    ],
                    "assigned": [
                        {
                            "$match": {
                                "assignTo": {"$exists": True, "$ne": None}
                            }
                        },
                        {"$count": "count"},
                    ],
                    "unassigned": [
                        {
                            "$match": {
                                "$or": [
                                    {"assignTo": {"$exists": False}},
                                    {"assignTo": None},
                                ]
                            }
                        },
                        {"$count": "count"},
                    ],
                    "active": [
                        {"$match": {"isActive": True}},
                        {"$count": "count"},
                    ],
                }
            },
        ]

        result = await self._aggregate(EnquiryModel, pipeline)
        raw = result[0] if result else {}

        def _count(key):
            items = raw.get(key, [])
            return items[0].get("count", 0) if items else 0

        return {
            "total": _count("total"),
            "thisMonth": _count("thisMonth"),
            "assigned": _count("assigned"),
            "unassigned": _count("unassigned"),
            "active": _count("active"),
        }

    async def _task_stats(
        self, company_id: str, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        match = self._company_match(company_id)
        pipeline = [
            {"$match": {**match, "deletedAt": None}},
            {
                "$facet": {
                    "total": [{"$count": "count"}],
                    "thisMonth": [
                        {
                            "$match": {
                                "createdAt": {
                                    "$gte": range_start,
                                    "$lte": range_end,
                                }
                            }
                        },
                        {"$count": "count"},
                    ],
                    "completed": [
                        {"$match": {"status": "completed"}},
                        {"$count": "count"},
                    ],
                    "overdue": [
                        {
                            "$match": {
                                "dueDate": {"$lt": datetime.now(timezone.utc)},
                                "status": {"$nin": ["completed", "cancelled"]},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "unassigned": [
                        {
                            "$match": {
                                "$or": [
                                    {"assignedTo": {"$exists": False}},
                                    {"assignedTo": None},
                                ]
                            }
                        },
                        {"$count": "count"},
                    ],
                }
            },
        ]

        result = await self._aggregate(TaskModel, pipeline)
        raw = result[0] if result else {}

        def _count(key):
            items = raw.get(key, [])
            return items[0].get("count", 0) if items else 0

        total = _count("total")
        completed = _count("completed")

        return {
            "total": total,
            "thisMonth": _count("thisMonth"),
            "completed": completed,
            "overdue": _count("overdue"),
            "unassigned": _count("unassigned"),
            "completionRate": round((completed / total * 100), 2)
            if total > 0
            else 0,
        }

    async def _monthly_trend(
        self, model, company_id: str, start_of_year: datetime
    ) -> list:
        match = self._company_match(company_id)
        pipeline = [
            {"$match": {**match, "createdAt": {"$gte": start_of_year}}},
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$createdAt"},
                        "month": {"$month": "$createdAt"},
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.year": 1, "_id.month": 1}},
            {
                "$project": {
                    "_id": 0,
                    "year": "$_id.year",
                    "month": "$_id.month",
                    "count": 1,
                }
            },
        ]

        result = await self._aggregate(model, pipeline)
        month_names = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ]

        return [
            {
                "month": month_names[item["month"] - 1],
                "year": item["year"],
                "count": item["count"],
            }
            for item in result
        ]

    async def _lead_source_breakdown(self, company_id: str) -> list:
        match = self._company_match(company_id)
        pipeline = [
            {
                "$match": {
                    **match,
                    "status": {"$ne": SALES_STATUS.DELETE.value},
                }
            },
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "source": "$_id", "count": 1}},
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _lead_status_breakdown(self, company_id: str) -> list:
        match = self._company_match(company_id)
        pipeline = [
            {"$match": match},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "status": "$_id", "count": 1}},
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _latest_leads(self, company_id: str) -> list:
        match = self._company_match(company_id)
        pipeline = [
            {
                "$match": {
                    **match,
                    "status": {"$ne": SALES_STATUS.DELETE.value},
                }
            },
            {"$sort": {"createdAt": -1}},
            {"$limit": 5},
            {
                "$project": {
                    "_id": {"$toString": "$_id"},
                    "lead_id": 1,
                    "name": 1,
                    "email": 1,
                    "phone": 1,
                    "source": 1,
                    "status": 1,
                    "createdAt": 1,
                }
            },
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _deal_pipeline_breakdown(self, company_id: str) -> list:
        match = self._company_match(company_id)
        pipeline = [
            {
                "$match": {
                    **match,
                    "status": {"$ne": DEAL_STATUS.DELETE.value},
                    "deletedAt": None,
                }
            },
            {
                "$group": {
                    "_id": "$dealPipeline",
                    "count": {"$sum": 1},
                    "totalAmount": {"$sum": "$amount"},
                }
            },
            {"$sort": {"count": -1}},
            {
                "$project": {
                    "_id": 0,
                    "pipeline": "$_id",
                    "count": 1,
                    "totalAmount": 1,
                }
            },
        ]

        result = await self._aggregate(DealModel, pipeline)

        pipeline_order = [
            DEAL_PIPELINE.QUALIFICATION.value,
            DEAL_PIPELINE.REQUIREMENT_ANALYSIS.value,
            DEAL_PIPELINE.PROPOSAL.value,
            DEAL_PIPELINE.NEGOTIATION.value,
            DEAL_PIPELINE.WON.value,
            DEAL_PIPELINE.LOST.value,
        ]

        result_map = {item["pipeline"]: item for item in result}
        total_count = sum(item["count"] for item in result)

        return [
            {
                "pipeline": stage,
                "count": result_map.get(stage, {}).get("count", 0),
                "totalAmount": result_map.get(stage, {}).get("totalAmount", 0),
                "percentage": round(
                    result_map.get(stage, {}).get("count", 0)
                    / total_count
                    * 100,
                    2,
                )
                if total_count > 0
                else 0,
            }
            for stage in pipeline_order
        ]

    async def _task_priority_breakdown(self, company_id: str) -> list:
        match = self._company_match(company_id)
        pipeline = [
            {"$match": {**match, "deletedAt": None}},
            {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "priority": "$_id", "count": 1}},
        ]
        result = await self._aggregate(TaskModel, pipeline)

        priority_order = [
            TASK_PRIORITY.URGENT.value,
            TASK_PRIORITY.HIGH.value,
            TASK_PRIORITY.MEDIUM.value,
            TASK_PRIORITY.LOW.value,
        ]

        result_map = {item["priority"]: item["count"] for item in result}

        return [
            {"priority": p, "count": result_map.get(p, 0)}
            for p in priority_order
        ]

    async def _top_performers(
        self, company_id: str, range_start: datetime, range_end: datetime
    ) -> list:
        match = self._company_match(company_id)
        pipeline = [
            {
                "$match": {
                    **match,
                    "status": SALES_STATUS.WON.value,
                    "createdAt": {"$gte": range_start, "$lte": range_end},
                }
            },
            {
                "$group": {
                    "_id": "$assignTo",
                    "wonLeads": {"$sum": 1},
                }
            },
            {"$sort": {"wonLeads": -1}},
            {"$limit": 5},
            {
                "$lookup": {
                    "from": "users",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "user",
                }
            },
            {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
            {
                "$project": {
                    "_id": 0,
                    "userId": {"$toString": "$_id"},
                    "wonLeads": 1,
                    "firstName": "$user.firstName",
                    "lastName": "$user.lastName",
                }
            },
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _conversion_rate(
        self, company_id: str, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        match = self._company_match(company_id)
        pipeline = [
            {
                "$match": {
                    **match,
                    "createdAt": {"$gte": range_start, "$lte": range_end},
                    "status": {"$ne": SALES_STATUS.DELETE.value},
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": 1},
                    "won": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$status", SALES_STATUS.WON.value]},
                                1,
                                0,
                            ]
                        }
                    },
                    "lost": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$status", SALES_STATUS.LOST.value]},
                                1,
                                0,
                            ]
                        }
                    },
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "total": 1,
                    "won": 1,
                    "lost": 1,
                    "conversionRate": {
                        "$cond": [
                            {"$gt": ["$total", 0]},
                            {
                                "$round": [
                                    {
                                        "$multiply": [
                                            {"$divide": ["$won", "$total"]},
                                            100,
                                        ]
                                    },
                                    2,
                                ]
                            },
                            0,
                        ]
                    },
                }
            },
        ]

        result = await self._aggregate(LeadsModel, pipeline)
        return result[0] if result else {
            "total": 0,
            "won": 0,
            "lost": 0,
            "conversionRate": 0,
        }