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
from fastapi.encoders import jsonable_encoder


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
            end = now

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
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                end = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            except ValueError:
                raise AppException(400, "Invalid date format. Use YYYY-MM-DD")

        else:
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end = now

        return start, end

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
                self._lead_source_breakdown(),
                self._lead_status_breakdown(),
                self._latest_leads(),
                self._deal_pipeline_breakdown(),
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

        except AppException as e:
            raise e

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
                    "thisMonth": [
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
            "total": raw.get("total", [{}])[0].get("count", 0) if raw.get("total") else 0,
            "thisMonth": raw.get("thisMonth", [{}])[0].get("count", 0) if raw.get("thisMonth") else 0,
            "active": raw.get("active", [{}])[0].get("count", 0) if raw.get("active") else 0,
            "won": raw.get("won", [{}])[0].get("count", 0) if raw.get("won") else 0,
            "deleted": raw.get("deleted", [{}])[0].get("count", 0) if raw.get("deleted") else 0,
            "inDeal": raw.get("inDeal", [{}])[0].get("count", 0) if raw.get("inDeal") else 0,
        }

    async def _deal_stats(self, range_start: datetime, range_end: datetime) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {"$match": {"status": {"$ne": DEAL_STATUS.DELETE.value}}},
                        {"$count": "count"}
                    ],
                    "thisMonth": [
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
                    "monthlyRevenue": [
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
            "total": raw.get("total", [{}])[0].get("count", 0) if raw.get("total") else 0,
            "thisMonth": raw.get("thisMonth", [{}])[0].get("count", 0) if raw.get("thisMonth") else 0,
            "active": raw.get("active", [{}])[0].get("count", 0) if raw.get("active") else 0,
            "closed": raw.get("closed", [{}])[0].get("count", 0) if raw.get("closed") else 0,
            "totalRevenue": raw.get("totalRevenue", [{}])[0].get("total", 0) if raw.get("totalRevenue") else 0,
            "monthlyRevenue": raw.get("monthlyRevenue", [{}])[0].get("total", 0) if raw.get("monthlyRevenue") else 0,
        }

    async def _user_stats(self, range_start: datetime, range_end: datetime) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {"$match": {"status": {"$ne": USER_STATUS.DELETED.value}}},
                        {"$count": "count"}
                    ],
                    "thisMonth": [
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
            "total": raw.get("total", [{}])[0].get("count", 0) if raw.get("total") else 0,
            "thisMonth": raw.get("thisMonth", [{}])[0].get("count", 0) if raw.get("thisMonth") else 0,
            "active": raw.get("active", [{}])[0].get("count", 0) if raw.get("active") else 0,
            "inactive": raw.get("inactive", [{}])[0].get("count", 0) if raw.get("inactive") else 0,
            "suspended": raw.get("suspended", [{}])[0].get("count", 0) if raw.get("suspended") else 0,
            "deleted": raw.get("deleted", [{}])[0].get("count", 0) if raw.get("deleted") else 0,
        }

    async def _enquiry_stats(self, range_start: datetime, range_end: datetime) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {"$match": {"deletedAt": None}},
                        {"$count": "count"}
                    ],
                    "thisMonth": [
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
            "total": raw.get("total", [{}])[0].get("count", 0) if raw.get("total") else 0,
            "thisMonth": raw.get("thisMonth", [{}])[0].get("count", 0) if raw.get("thisMonth") else 0,
            "assigned": raw.get("assigned", [{}])[0].get("count", 0) if raw.get("assigned") else 0,
            "unassigned": raw.get("unassigned", [{}])[0].get("count", 0) if raw.get("unassigned") else 0,
            "active": raw.get("active", [{}])[0].get("count", 0) if raw.get("active") else 0,
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

    async def _lead_source_breakdown(self) -> list:
        pipeline = [
            {"$match": {"status": {"$ne": SALES_STATUS.DELETE.value}}},
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "source": "$_id", "count": 1}}
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _lead_status_breakdown(self) -> list:
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "status": "$_id", "count": 1}}
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _latest_leads(self) -> list:
        pipeline = [
            {"$match": {"status": {"$ne": SALES_STATUS.DELETE.value}}},
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
            }
        ]
        data = await self._aggregate(LeadsModel, pipeline)

        
        return  data

    async def _deal_pipeline_breakdown(self) -> list:
        pipeline = [
            {"$match": {"status": {"$ne": DEAL_STATUS.DELETE.value}, "deletedAt": None}},
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
                    (result_map.get(stage, {}).get("count", 0) / total_count * 100), 2
                ) if total_count > 0 else 0,
            }
            for stage in pipeline_order
        ]