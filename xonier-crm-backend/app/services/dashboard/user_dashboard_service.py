from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId, DBRef
from app.utils.custom_exception import AppException
from app.repositories.enquiry_repository import EnquiryModel
from app.repositories.lead_repository import LeadRepository
from app.repositories.deal_repository import DealRepository
from app.repositories.activity_repository import ActivityRepository
from app.repositories.quotation_repository import QuotationRepository
from app.db.models.lead_model import LeadsModel
from app.db.models.deal_model import DealModel
from app.db.models.activity_model import ActivityModel
from app.db.models.quotation_model import QuotationModel
from app.db.models.user_model import UserModel
from app.core.enums import SALES_STATUS, DEAL_STATUS, DEAL_PIPELINE
from app.db import db as database_module
import asyncio



class UserDashboardService:

    def __init__(self):
        self.lead_repo = LeadRepository()
        self.deal_repo = DealRepository()
        self.activity_repo = ActivityRepository()
        self.quotation_repo = QuotationRepository()

    async def _aggregate(self, model, pipeline: list) -> list:
        collection = database_module.db[model.Settings.name]
        cursor = collection.aggregate(pipeline)
        return await cursor.to_list(length=None)

    def _serialize(self, data: list) -> list:
        result = []
        for item in data:
            serialized = {}
            for key, value in item.items():
                if isinstance(value, ObjectId):
                    serialized[key] = str(value)
                elif isinstance(value, datetime):
                    serialized[key] = value.isoformat()
                elif isinstance(value, list):
                    serialized[key] = [
                        (
                            str(v)
                            if isinstance(v, ObjectId)
                            else v.isoformat() if isinstance(v, datetime) else v
                        )
                        for v in value
                    ]
                elif isinstance(value, dict):
                    serialized[key] = self._serialize([value])[0]
                else:
                    serialized[key] = value
            result.append(serialized)
        return result

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

    async def get_stats(
        self,
        user: Dict[str, Any],
        filter: str = "this_month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            now = datetime.now(timezone.utc)
            start_of_year = now.replace(
                month=1, day=1, hour=0, minute=0, second=0, microsecond=0
            )
            user_id = ObjectId(user["_id"])

            range_start, range_end = self._resolve_date_range(
                filter, start_date, end_date
            )

            (
                user_stats,
                lead_stats,
                deal_stats,
                quotation_stats,
                enquiry_stats,
                activity_stats,
                monthly_lead_trend,
                monthly_deal_trend,
                deal_pipeline_breakdown,
                recent_activities,
                latest_leads,
                latest_deals,
            ) = await asyncio.gather(
                self._user_data(user_id),
                self._lead_stats(user_id, range_start, range_end),
                self._deal_stats(user_id, range_start, range_end),
                self._quotation_stats(user_id, range_start, range_end),
                self._enquiry_stats(user_id, range_start, range_end),
                self._activity_stats(user_id, range_start, range_end),
                self._monthly_lead_trend(user_id, start_of_year),
                self._monthly_deal_trend(user_id, start_of_year),
                self._deal_pipeline_breakdown(user_id),
                self._recent_activities(user_id),
                self._latest_leads(user_id),
                self._latest_deals(user_id),
            )

            return {
                "role": "user",
                "period": {
                    "filter": filter,
                    "start": range_start.isoformat(),
                    "end": range_end.isoformat(),
                    "year": now.year,
                    "generatedAt": now.isoformat(),
                },
                "user": self._serialize([user_stats])[0] if user_stats else None,
                "leads": lead_stats,
                "deals": deal_stats,
                "quotations": quotation_stats,
                "enquiries": enquiry_stats,
                "activities": activity_stats,
                "monthlyLeadTrend": monthly_lead_trend,
                "monthlyDealTrend": monthly_deal_trend,
                "dealPipelineBreakdown": deal_pipeline_breakdown,
                "recentActivities": self._serialize(recent_activities),
                "latestLeads": self._serialize(latest_leads),
                "latestDeals": self._serialize(latest_deals),
            }

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    def _serialize(self, data: list) -> list:
        result = []
        for item in data:
            serialized = {}
            for key, value in item.items():
                if isinstance(value, ObjectId):
                    serialized[key] = str(value)
                elif isinstance(value, DBRef):
                    serialized[key] = {
                        "collection": value.collection,
                        "id": str(value.id),
                    }
                elif isinstance(value, datetime):
                    serialized[key] = value.isoformat()
                elif isinstance(value, list):
                    serialized[key] = [
                        (
                            str(v)
                            if isinstance(v, ObjectId)
                            else (
                                {"collection": v.collection, "id": str(v.id)}
                                if isinstance(v, DBRef)
                                else v.isoformat() if isinstance(v, datetime) else v
                            )
                        )
                        for v in value
                    ]
                elif isinstance(value, dict):
                    serialized[key] = self._serialize([value])[0]
                else:
                    serialized[key] = value
            result.append(serialized)
        return result

    async def _user_data(self, user_id: ObjectId):
        pipeline = [
            {
                "$match": {
                    "_id": user_id,
                    "status": {"$ne": SALES_STATUS.DELETE.value}
                }
            },
            
            {"$project": {"_id": 0, "password": 0, "refreshToken": 0}},
        ]

        result = await self._aggregate(UserModel, pipeline)

        

        return result[0] if result else None

    async def _lead_stats(
        self, user_id: ObjectId, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "status": {"$ne": SALES_STATUS.DELETE.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "inRange": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "status": {"$ne": SALES_STATUS.DELETE.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "active": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "status": {
                                    "$in": [
                                        SALES_STATUS.NEW.value,
                                        SALES_STATUS.CONTACTED.value,
                                        SALES_STATUS.QUALIFIED.value,
                                        SALES_STATUS.PROPOSAL.value,
                                    ]
                                },
                            }
                        },
                        {"$count": "count"},
                    ],
                    "won": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "status": SALES_STATUS.WON.value,
                            }
                        },
                        {"$count": "count"},
                    ],
                    "lost": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "status": SALES_STATUS.LOST.value,
                            }
                        },
                        {"$count": "count"},
                    ],
                    "inDeal": [
                        {"$match": {"createdBy.$id": user_id, "inDeal": True}},
                        {"$count": "count"},
                    ],
                    "assigned": [
                        {
                            "$match": {
                                "assignedTo.$id": user_id,
                                "status": {"$ne": SALES_STATUS.DELETE.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                }
            }
        ]

        result = await self._aggregate(LeadsModel, pipeline)
        raw = result[0] if result else {}

        return {
            "total": (
                raw.get("total", [{}])[0].get("count", 0) if raw.get("total") else 0
            ),
            "inRange": (
                raw.get("inRange", [{}])[0].get("count", 0) if raw.get("inRange") else 0
            ),
            "active": (
                raw.get("active", [{}])[0].get("count", 0) if raw.get("active") else 0
            ),
            "won": raw.get("won", [{}])[0].get("count", 0) if raw.get("won") else 0,
            "lost": raw.get("lost", [{}])[0].get("count", 0) if raw.get("lost") else 0,
            "inDeal": (
                raw.get("inDeal", [{}])[0].get("count", 0) if raw.get("inDeal") else 0
            ),
            "assigned": (
                raw.get("assigned", [{}])[0].get("count", 0)
                if raw.get("assigned")
                else 0
            ),
        }

    async def _deal_stats(
        self, user_id: ObjectId, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "status": {"$ne": DEAL_STATUS.DELETE.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "inRange": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "status": {"$ne": DEAL_STATUS.DELETE.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "active": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "status": DEAL_STATUS.ACTIVE.value,
                            }
                        },
                        {"$count": "count"},
                    ],
                    "closed": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "status": DEAL_STATUS.CLOSED.value,
                            }
                        },
                        {"$count": "count"},
                    ],
                    "totalRevenue": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "status": DEAL_STATUS.CLOSED.value,
                            }
                        },
                        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
                    ],
                    "rangeRevenue": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "status": DEAL_STATUS.CLOSED.value,
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                            }
                        },
                        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
                    ],
                    "inQuotation": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "inQuotation": True,
                                "status": {"$ne": DEAL_STATUS.DELETE.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                }
            }
        ]

        result = await self._aggregate(DealModel, pipeline)
        raw = result[0] if result else {}

        return {
            "total": (
                raw.get("total", [{}])[0].get("count", 0) if raw.get("total") else 0
            ),
            "inRange": (
                raw.get("inRange", [{}])[0].get("count", 0) if raw.get("inRange") else 0
            ),
            "active": (
                raw.get("active", [{}])[0].get("count", 0) if raw.get("active") else 0
            ),
            "closed": (
                raw.get("closed", [{}])[0].get("count", 0) if raw.get("closed") else 0
            ),
            "totalRevenue": (
                raw.get("totalRevenue", [{}])[0].get("total", 0)
                if raw.get("totalRevenue")
                else 0
            ),
            "rangeRevenue": (
                raw.get("rangeRevenue", [{}])[0].get("total", 0)
                if raw.get("rangeRevenue")
                else 0
            ),
            "inQuotation": (
                raw.get("inQuotation", [{}])[0].get("count", 0)
                if raw.get("inQuotation")
                else 0
            ),
        }

    async def _quotation_stats(
        self, user_id: ObjectId, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {"$match": {"createdBy.$id": user_id, "deletedAt": None}},
                        {"$count": "count"},
                    ],
                    "inRange": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "deletedAt": None,
                            }
                        },
                        {"$count": "count"},
                    ],
                    "totalValue": [
                        {"$match": {"createdBy.$id": user_id, "deletedAt": None}},
                        {"$group": {"_id": None, "total": {"$sum": "$total"}}},
                    ],
                    "rangeValue": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "deletedAt": None,
                            }
                        },
                        {"$group": {"_id": None, "total": {"$sum": "$total"}}},
                    ],
                }
            }
        ]

        result = await self._aggregate(QuotationModel, pipeline)
        raw = result[0] if result else {}

        return {
            "total": (
                raw.get("total", [{}])[0].get("count", 0) if raw.get("total") else 0
            ),
            "inRange": (
                raw.get("inRange", [{}])[0].get("count", 0) if raw.get("inRange") else 0
            ),
            "totalValue": (
                raw.get("totalValue", [{}])[0].get("total", 0)
                if raw.get("totalValue")
                else 0
            ),
            "rangeValue": (
                raw.get("rangeValue", [{}])[0].get("total", 0)
                if raw.get("rangeValue")
                else 0
            ),
        }
    
    async def _enquiry_stats(self, user_id: ObjectId, range_start: datetime, range_end: datetime) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "deletedAt": None,
                                "status": {"$ne": SALES_STATUS.DELETE.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "inRange": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "deletedAt": None,
                                "status": {"$ne": SALES_STATUS.DELETE.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "active": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "status": {
                                    "$in": [
                                        SALES_STATUS.NEW.value,
                                        SALES_STATUS.CONTACTED.value,
                                        SALES_STATUS.QUALIFIED.value,
                                        SALES_STATUS.PROPOSAL.value,
                                    ]
                                },
                                "deletedAt": None,
                            }
                        },
                        {"$count": "count"},
                    ],
                    "won": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "status": SALES_STATUS.WON.value,
                            }
                        },
                        {"$count": "count"},
                    ],
                    "lost": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "status": SALES_STATUS.LOST.value,
                            }
                        },
                        {"$count": "count"},
                    ],
                    "assigned": [
                        {
                            "$match": {
                                "assignTo.$id": user_id,
                                "deletedAt": None,
                                "status": {"$ne": SALES_STATUS.DELETE.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "bySource": [
                        {
                            "$match": {
                                "createdBy.$id": user_id,
                                "deletedAt": None,
                            }
                        },
                        {"$group": {"_id": "$source", "count": {"$sum": 1}}},
                        {"$project": {"_id": 0, "source": "$_id", "count": 1}},
                    ],
                }
            }
        ]

        result = await self._aggregate(EnquiryModel, pipeline)
        raw = result[0] if result else {}

        return {
            "total": raw.get("total", [{}])[0].get("count", 0) if raw.get("total") else 0,
            "inRange": raw.get("inRange", [{}])[0].get("count", 0) if raw.get("inRange") else 0,
            "active": raw.get("active", [{}])[0].get("count", 0) if raw.get("active") else 0,
            "won": raw.get("won", [{}])[0].get("count", 0) if raw.get("won") else 0,
            "lost": raw.get("lost", [{}])[0].get("count", 0) if raw.get("lost") else 0,
            "assigned": raw.get("assigned", [{}])[0].get("count", 0) if raw.get("assigned") else 0,
            "bySource": raw.get("bySource", []) if raw.get("bySource") else [],
        }




    async def _activity_stats(
        self, user_id: ObjectId, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [{"$match": {"userId.$id": user_id}}, {"$count": "count"}],
                    "inRange": [
                        {
                            "$match": {
                                "userId.$id": user_id,
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "byEntity": [
                        {"$match": {"userId.$id": user_id}},
                        {"$group": {"_id": "$entityType", "count": {"$sum": 1}}},
                        {"$project": {"_id": 0, "entityType": "$_id", "count": 1}},
                    ],
                }
            }
        ]

        result = await self._aggregate(ActivityModel, pipeline)
        raw = result[0] if result else {}

        return {
            "total": (
                raw.get("total", [{}])[0].get("count", 0) if raw.get("total") else 0
            ),
            "inRange": (
                raw.get("inRange", [{}])[0].get("count", 0) if raw.get("inRange") else 0
            ),
            "byEntity": raw.get("byEntity", []) if raw.get("byEntity") else [],
        }
    
    async def _monthly_lead_trend(
        self, user_id: ObjectId, start_of_year: datetime
    ) -> list:
        pipeline = [
            {
                "$match": {
                    "createdBy.$id": user_id,
                    "createdAt": {"$gte": start_of_year},
                }
            },
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

        result = await self._aggregate(LeadsModel, pipeline)
        month_names = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ]

        return [
            {
                "month": month_names[item["month"] - 1],
                "year": item["year"],
                "count": item["count"],
            }
            for item in result
        ]

    async def _monthly_deal_trend(
        self, user_id: ObjectId, start_of_year: datetime
    ) -> list:
        pipeline = [
            {
                "$match": {
                    "createdBy.$id": user_id,
                    "createdAt": {"$gte": start_of_year},
                }
            },
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$createdAt"},
                        "month": {"$month": "$createdAt"},
                    },
                    "count": {"$sum": 1},
                    "totalAmount": {"$sum": "$amount"},
                }
            },
            {"$sort": {"_id.year": 1, "_id.month": 1}},
            {
                "$project": {
                    "_id": 0,
                    "year": "$_id.year",
                    "month": "$_id.month",
                    "count": 1,
                    "totalAmount": 1,
                }
            },
        ]

        result = await self._aggregate(DealModel, pipeline)
        month_names = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ]

        return [
            {
                "month": month_names[item["month"] - 1],
                "year": item["year"],
                "count": item["count"],
                "totalAmount": item["totalAmount"],
            }
            for item in result
        ]

    async def _deal_pipeline_breakdown(self, user_id: ObjectId) -> list:
        pipeline = [
            {
                "$match": {
                    "createdBy.$id": user_id,
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
            {"$project": {"_id": 0, "pipeline": "$_id", "count": 1, "totalAmount": 1}},
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
                "percentage": (
                    round(
                        (result_map.get(stage, {}).get("count", 0) / total_count * 100),
                        2,
                    )
                    if total_count > 0
                    else 0
                ),
            }
            for stage in pipeline_order
        ]

    async def _recent_activities(self, user_id: ObjectId) -> list:
        pipeline = [
            {"$match": {"userId.$id": user_id}},
            {"$sort": {"createdAt": -1}},
            {"$limit": 10},
            {
                "$project": {
                    "_id": 0,
                    "entityType": 1,
                    "entityId": {"$toString": "$entityId"},
                    "action": 1,
                    "title": 1,
                    "description": 1,
                    "createdAt": 1,
                }
            },
        ]
        return await self._aggregate(ActivityModel, pipeline)

    async def _latest_leads(self, user_id: ObjectId) -> list:
        pipeline = [
            {
                "$match": {
                    "createdBy.$id": user_id,
                    "status": {"$ne": SALES_STATUS.DELETE.value},
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
            },
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _latest_deals(self, user_id: ObjectId) -> list:
        pipeline = [
            {
                "$match": {
                    "createdBy.$id": user_id,
                    "status": {"$ne": DEAL_STATUS.DELETE.value},
                }
            },
            {"$sort": {"createdAt": -1}},
            {"$limit": 5},
            {
                "$project": {
                    "_id": 0,
                    "deal_id": 1,
                    "dealName": 1,
                    "dealPipeline": 1,
                    "dealStage": 1,
                    "amount": 1,
                    "status": 1,
                    "closeDate": 1,
                    "createdAt": 1,
                }
            },
        ]
        return await self._aggregate(DealModel, pipeline)
