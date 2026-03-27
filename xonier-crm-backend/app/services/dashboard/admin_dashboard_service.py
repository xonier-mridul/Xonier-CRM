from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.utils.custom_exception import AppException
from app.db.models.lead_model import LeadsModel
from app.db.models.enquiry_management_model import EnquiryModel
from app.db.models.user_model import UserModel
from app.db.models.deal_model import DealModel
from app.core.enums import SALES_STATUS, DEAL_STATUS, USER_STATUS, DEAL_PIPELINE
from app.db import db as database_module
import asyncio


class AdminDashboardService:

    async def _aggregate(self, model, pipeline: list) -> list:
        collection = database_module.db[model.Settings.name]
        cursor = collection.aggregate(pipeline)
        return await cursor.to_list(length=None)

    def _resolve_date_range(
        self,
        filter: str,
        start_date: Optional[str],
        end_date: Optional[str],
    ):
        now = datetime.now(timezone.utc)

        if filter == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

        elif filter == "this_week":
            start = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
            end = now

        elif filter == "this_month":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now

        elif filter == "this_year":
            start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now

        elif filter == "custom":
            if not start_date or not end_date:
                raise AppException(400, "start_date and end_date are required for custom filter")
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
            except ValueError:
                raise AppException(400, "Invalid date format. Use YYYY-MM-DD")

        else:
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now

        return start, end

    def _safe_count(self, raw: dict, key: str) -> int:
        items = raw.get(key)
        if not items:
            return 0
        return items[0].get("count", 0) if items else 0

    def _safe_sum(self, raw: dict, key: str, field: str = "total") -> float:
        items = raw.get(key)
        if not items:
            return 0
        return items[0].get(field, 0) if items else 0

    async def get_stats(
        self,
        user: Dict[str, Any],
        filter: str = "this_month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            now = datetime.now(timezone.utc)
            start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

            range_start, range_end = self._resolve_date_range(filter, start_date, end_date)

            (
                lead_stats,
                deal_stats,
                user_stats,
                enquiry_stats,
                monthly_lead_trend,
                monthly_deal_trend,
                lead_source_breakdown,
                lead_status_breakdown,
                latest_leads,
                deal_pipeline_breakdown,
            ) = await asyncio.gather(
                self._lead_stats(range_start, range_end),
                self._deal_stats(range_start, range_end),
                self._user_stats(range_start, range_end),
                self._enquiry_stats(range_start, range_end),
                self._monthly_trend(LeadsModel, start_of_year),
                self._monthly_trend(DealModel, start_of_year),
                self._lead_source_breakdown(range_start, range_end),
                self._lead_status_breakdown(range_start, range_end),
                self._latest_leads(range_start, range_end),
                self._deal_pipeline_breakdown(range_start, range_end),
            )

            return {
                "role": "admin",
                "period": {
                    "filter": filter,
                    "start": range_start.isoformat(),
                    "end": range_end.isoformat(),
                    "year": now.year,
                    "generatedAt": now.isoformat(),
                },
                "leads": lead_stats,
                "deals": deal_stats,
                "users": user_stats,
                "enquiries": enquiry_stats,
                "monthlyLeadTrend": monthly_lead_trend,
                "monthlyDealTrend": monthly_deal_trend,
                "leadSourceBreakdown": lead_source_breakdown,
                "leadStatusBreakdown": lead_status_breakdown,
                "latestLeads": latest_leads,
                "dealPipelineBreakdown": deal_pipeline_breakdown,
            }

        except AppException:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def _lead_stats(self, range_start: datetime, range_end: datetime) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {"$match": {"status": {"$ne": SALES_STATUS.DELETE.value}}},
                        {"$count": "count"}
                    ],
                    "inRange": [
                        {
                            "$match": {
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "status": {"$ne": SALES_STATUS.DELETE.value}
                            }
                        },
                        {"$count": "count"}
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
                        {"$count": "count"}
                    ],
                    "won": [
                        {"$match": {"status": SALES_STATUS.WON.value}},
                        {"$count": "count"}
                    ],
                    "deleted": [
                        {"$match": {"status": SALES_STATUS.DELETE.value}},
                        {"$count": "count"}
                    ],
                    "inDeal": [
                        {"$match": {"inDeal": True}},
                        {"$count": "count"}
                    ],
                }
            }
        ]

        result = await self._aggregate(LeadsModel, pipeline)
        raw = result[0] if result else {}

        return {
            "total": self._safe_count(raw, "total"),
            "inRange": self._safe_count(raw, "inRange"),
            "active": self._safe_count(raw, "active"),
            "won": self._safe_count(raw, "won"),
            "deleted": self._safe_count(raw, "deleted"),
            "inDeal": self._safe_count(raw, "inDeal"),
        }

    async def _deal_stats(self, range_start: datetime, range_end: datetime) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {"$match": {"status": {"$ne": DEAL_STATUS.DELETE.value}}},
                        {"$count": "count"}
                    ],
                    "inRange": [
                        {
                            "$match": {
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "status": {"$ne": DEAL_STATUS.DELETE.value}
                            }
                        },
                        {"$count": "count"}
                    ],
                    "active": [
                        {"$match": {"status": DEAL_STATUS.ACTIVE.value}},
                        {"$count": "count"}
                    ],
                    "closed": [
                        {"$match": {"status": DEAL_STATUS.CLOSED.value}},
                        {"$count": "count"}
                    ],
                    "totalRevenue": [
                        {"$match": {"status": DEAL_STATUS.CLOSED.value}},
                        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
                    ],
                    "rangeRevenue": [
                        {
                            "$match": {
                                "status": DEAL_STATUS.CLOSED.value,
                                "createdAt": {"$gte": range_start, "$lte": range_end}
                            }
                        },
                        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
                    ],
                }
            }
        ]

        result = await self._aggregate(DealModel, pipeline)
        raw = result[0] if result else {}

        return {
            "total": self._safe_count(raw, "total"),
            "inRange": self._safe_count(raw, "inRange"),
            "active": self._safe_count(raw, "active"),
            "closed": self._safe_count(raw, "closed"),
            "totalRevenue": self._safe_sum(raw, "totalRevenue"),
            "rangeRevenue": self._safe_sum(raw, "rangeRevenue"),
        }

    async def _user_stats(self, range_start: datetime, range_end: datetime) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {"$match": {"status": {"$ne": USER_STATUS.DELETED.value}}},
                        {"$count": "count"}
                    ],
                    "inRange": [
                        {
                            "$match": {
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "status": {"$ne": USER_STATUS.DELETED.value}
                            }
                        },
                        {"$count": "count"}
                    ],
                    "active": [
                        {"$match": {"status": USER_STATUS.ACTIVE.value}},
                        {"$count": "count"}
                    ],
                    "inactive": [
                        {"$match": {"status": USER_STATUS.INACTIVE.value}},
                        {"$count": "count"}
                    ],
                    "suspended": [
                        {"$match": {"status": USER_STATUS.SUSPENDED.value}},
                        {"$count": "count"}
                    ],
                    "deleted": [
                        {"$match": {"status": USER_STATUS.DELETED.value}},
                        {"$count": "count"}
                    ],
                }
            }
        ]

        result = await self._aggregate(UserModel, pipeline)
        raw = result[0] if result else {}

        return {
            "total": self._safe_count(raw, "total"),
            "inRange": self._safe_count(raw, "inRange"),
            "active": self._safe_count(raw, "active"),
            "inactive": self._safe_count(raw, "inactive"),
            "suspended": self._safe_count(raw, "suspended"),
            "deleted": self._safe_count(raw, "deleted"),
        }

    async def _enquiry_stats(self, range_start: datetime, range_end: datetime) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {"$match": {"deletedAt": None}},
                        {"$count": "count"}
                    ],
                    "inRange": [
                        {
                            "$match": {
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "deletedAt": None
                            }
                        },
                        {"$count": "count"}
                    ],
                    "assigned": [
                        {
                            "$match": {
                                "deletedAt": None,
                                "assignTo": {"$exists": True, "$ne": None}
                            }
                        },
                        {"$count": "count"}
                    ],
                    "unassigned": [
                        {
                            "$match": {
                                "deletedAt": None,
                                "$or": [
                                    {"assignTo": {"$exists": False}},
                                    {"assignTo": None}
                                ]
                            }
                        },
                        {"$count": "count"}
                    ],
                    "active": [
                        {"$match": {"isActive": True, "deletedAt": None}},
                        {"$count": "count"}
                    ],
                }
            }
        ]

        result = await self._aggregate(EnquiryModel, pipeline)
        raw = result[0] if result else {}

        return {
            "total": self._safe_count(raw, "total"),
            "inRange": self._safe_count(raw, "inRange"),
            "assigned": self._safe_count(raw, "assigned"),
            "unassigned": self._safe_count(raw, "unassigned"),
            "active": self._safe_count(raw, "active"),
        }

    async def _monthly_trend(self, model, start_of_year: datetime) -> list:
        pipeline = [
            {"$match": {"createdAt": {"$gte": start_of_year}}},
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$createdAt"},
                        "month": {"$month": "$createdAt"}
                    },
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id.year": 1, "_id.month": 1}},
            {
                "$project": {
                    "_id": 0,
                    "year": "$_id.year",
                    "month": "$_id.month",
                    "count": 1
                }
            }
        ]

        result = await self._aggregate(model, pipeline)

        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        return [
            {
                "month": month_names[item["month"] - 1],
                "year": item["year"],
                "count": item["count"]
            }
            for item in result
        ]

    async def _lead_source_breakdown(self, range_start: datetime, range_end: datetime) -> list:
        pipeline = [
            {
                "$match": {
                    "status": {"$ne": SALES_STATUS.DELETE.value},
                    "createdAt": {"$gte": range_start, "$lte": range_end}
                }
            },
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "source": "$_id", "count": 1}}
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _lead_status_breakdown(self, range_start: datetime, range_end: datetime) -> list:
        pipeline = [
            {
                "$match": {
                    "createdAt": {"$gte": range_start, "$lte": range_end}
                }
            },
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "status": "$_id", "count": 1}}
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _latest_leads(self, range_start: datetime, range_end: datetime) -> list:
        pipeline = [
            {
                "$match": {
                    "status": {"$ne": SALES_STATUS.DELETE.value},
                    "createdAt": {"$gte": range_start, "$lte": range_end}
                }
            },
            {"$sort": {"createdAt": -1}},
            {"$limit": 5},
            {
                "$project": {
                    "_id": 0,
                    "lead_id": 1,
                    "fullName": 1,
                    "email": 1,
                    "phone": 1,
                    "source": 1,
                    "status": 1,
                    "priority": 1,
                    "createdAt": 1,
                }
            }
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _deal_pipeline_breakdown(self, range_start: datetime, range_end: datetime) -> list:
        pipeline = [
            {
                "$match": {
                    "status": {"$ne": DEAL_STATUS.DELETE.value},
                    "createdAt": {"$gte": range_start, "$lte": range_end}
                }
            },
            {
                "$group": {
                    "_id": "$dealPipeline",
                    "count": {"$sum": 1},
                    "totalAmount": {"$sum": "$amount"}
                }
            },
            {"$sort": {"count": -1}},
            {
                "$project": {
                    "_id": 0,
                    "pipeline": "$_id",
                    "count": 1,
                    "totalAmount": 1
                }
            }
        ]

        result = await self._aggregate(DealModel, pipeline)

        pipeline_order = [p.value for p in DEAL_PIPELINE]

        result_map = {item["pipeline"]: item for item in result if item.get("pipeline")}
        total_count = sum(item["count"] for item in result)

        return [
            {
                "pipeline": stage,
                "count": result_map.get(stage, {}).get("count", 0),
                "totalAmount": result_map.get(stage, {}).get("totalAmount", 0),
                "percentage": round(
                    result_map.get(stage, {}).get("count", 0) / total_count * 100, 2
                ) if total_count > 0 else 0,
            }
            for stage in pipeline_order
        ]