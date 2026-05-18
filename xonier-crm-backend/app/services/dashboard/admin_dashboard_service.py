from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.utils.custom_exception import AppException
from app.db.models.company_model import CompanyModel
from app.db.models.user_model import UserModel
from app.db.models.subscription_model import SubscriptionModel
from app.db.models.plan_model import PlanModel
from app.db.models.user_roles_model import UserRoleModel
from app.db.models.activity_model import ActivityModel
from app.core.enums import COMPANY_STATUS, USER_STATUS, SUBSCRIPTION_STATUS
from app.db import db as database_module
import asyncio


class SuperAdminDashboardService:

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
            range_start, range_end = self._resolve_date_range(
                filter, start_date, end_date
            )

            (
                company_stats,
                user_stats,
                subscription_stats,
                plan_stats,
                activity_stats,
                monthly_company_trend,
                monthly_user_trend,
                monthly_revenue_trend,
                company_by_status,
                company_by_industry,
                company_by_country,
                subscription_by_plan,
                subscription_by_cycle,
                latest_companies,
                top_companies_by_users,
                recent_activities,
                churn_stats,
            ) = await asyncio.gather(
                self._company_stats(range_start, range_end),
                self._user_stats(range_start, range_end),
                self._subscription_stats(range_start, range_end),
                self._plan_stats(),
                self._activity_stats(range_start, range_end),
                self._monthly_trend(CompanyModel, start_of_year),
                self._monthly_trend(UserModel, start_of_year),
                self._monthly_revenue_trend(start_of_year),
                self._company_by_status(),
                self._company_by_industry(),
                self._company_by_country(),
                self._subscription_by_plan(),
                self._subscription_by_billing_cycle(),
                self._latest_companies(),
                self._top_companies_by_users(),
                self._recent_activities(),
                self._churn_stats(range_start, range_end),
            )

            mrr = subscription_stats.get("mrr", 0)
            arr = mrr * 12

            return {
                "role": "super_admin",
                "period": {
                    "filter": filter,
                    "start": range_start.isoformat(),
                    "end": range_end.isoformat(),
                    "year": now.year,
                    "generatedAt": now.isoformat(),
                },
                "companies": company_stats,
                "users": user_stats,
                "subscriptions": subscription_stats,
                "revenue": {
                    "mrr": mrr,
                    "arr": arr,
                    "monthlyTrend": monthly_revenue_trend,
                },
                "plans": plan_stats,
                "activity": activity_stats,
                "trends": {
                    "monthlyCompanies": monthly_company_trend,
                    "monthlyUsers": monthly_user_trend,
                },
                "breakdowns": {
                    "companiesByStatus": company_by_status,
                    "companiesByIndustry": company_by_industry,
                    "companiesByCountry": company_by_country,
                    "subscriptionsByPlan": subscription_by_plan,
                    "subscriptionsByBillingCycle": subscription_by_cycle,
                },
                "latestCompanies": latest_companies,
                "topCompaniesByUsers": top_companies_by_users,
                "recentActivities": recent_activities,
                "churn": churn_stats,
            }

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def _company_stats(
        self, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {
                            "$match": {
                                "status": {"$ne": COMPANY_STATUS.DELETED.value}
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
                                "status": {"$ne": COMPANY_STATUS.DELETED.value},
                            }
                        },
                        {"$count": "count"},
                    ],
                    "active": [
                        {"$match": {"status": COMPANY_STATUS.ACTIVE.value}},
                        {"$count": "count"},
                    ],
                    "pending": [
                        {
                            "$match": {
                                "status": COMPANY_STATUS.PENDING_VERIFICATION.value
                            }
                        },
                        {"$count": "count"},
                    ],
                    "suspended": [
                        {"$match": {"status": COMPANY_STATUS.SUSPENDED.value}},
                        {"$count": "count"},
                    ],
                    "inactive": [
                        {"$match": {"status": COMPANY_STATUS.INACTIVE.value}},
                        {"$count": "count"},
                    ],
                    "deleted": [
                        {"$match": {"status": COMPANY_STATUS.DELETED.value}},
                        {"$count": "count"},
                    ],
                }
            }
        ]

        result = await self._aggregate(CompanyModel, pipeline)
        raw = result[0] if result else {}

        def _count(key):
            items = raw.get(key, [])
            return items[0].get("count", 0) if items else 0

        return {
            "total": _count("total"),
            "thisMonth": _count("thisMonth"),
            "active": _count("active"),
            "pending": _count("pending"),
            "suspended": _count("suspended"),
            "inactive": _count("inactive"),
            "deleted": _count("deleted"),
        }

    async def _user_stats(
        self, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        pipeline = [
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
                    "superAdmins": [
                        {"$match": {"isSuperAdmin": True}},
                        {"$count": "count"},
                    ],
                }
            }
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
            "superAdmins": _count("superAdmins"),
        }

    async def _subscription_stats(
        self, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [{"$count": "count"}],
                    "active": [
                        {
                            "$match": {
                                "status": SUBSCRIPTION_STATUS.ACTIVE.value
                            }
                        },
                        {"$count": "count"},
                    ],
                    "trial": [
                        {
                            "$match": {
                                "status": SUBSCRIPTION_STATUS.TRIAL.value
                            }
                        },
                        {"$count": "count"},
                    ],
                    "canceled": [
                        {
                            "$match": {
                                "status": SUBSCRIPTION_STATUS.CANCELED.value
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
                                }
                            }
                        },
                        {"$count": "count"},
                    ],
                    "mrr": [
                        {
                            "$match": {
                                "status": SUBSCRIPTION_STATUS.ACTIVE.value,
                                "billingCycle": "monthly",
                            }
                        },
                        {
                            "$group": {
                                "_id": None,
                                "total": {"$sum": "$finalPrice"},
                            }
                        },
                    ],
                    "totalRevenue": [
                        {
                            "$match": {
                                "status": {
                                    "$in": [
                                        SUBSCRIPTION_STATUS.ACTIVE.value,
                                        SUBSCRIPTION_STATUS.COMPLETED.value,
                                    ]
                                }
                            }
                        },
                        {
                            "$group": {
                                "_id": None,
                                "total": {"$sum": "$finalPrice"},
                            }
                        },
                    ],
                    "periodRevenue": [
                        {
                            "$match": {
                                "createdAt": {
                                    "$gte": range_start,
                                    "$lte": range_end,
                                }
                            }
                        },
                        {
                            "$group": {
                                "_id": None,
                                "total": {"$sum": "$finalPrice"},
                            }
                        },
                    ],
                    "avgRevenue": [
                        {
                            "$match": {
                                "status": SUBSCRIPTION_STATUS.ACTIVE.value
                            }
                        },
                        {
                            "$group": {
                                "_id": None,
                                "avg": {"$avg": "$finalPrice"},
                            }
                        },
                    ],
                }
            }
        ]

        result = await self._aggregate(SubscriptionModel, pipeline)
        raw = result[0] if result else {}

        def _count(key):
            items = raw.get(key, [])
            return items[0].get("count", 0) if items else 0

        def _sum(key, field="total"):
            items = raw.get(key, [])
            return round(items[0].get(field, 0), 2) if items else 0

        return {
            "total": _count("total"),
            "active": _count("active"),
            "trial": _count("trial"),
            "canceled": _count("canceled"),
            "thisMonth": _count("thisMonth"),
            "mrr": _sum("mrr"),
            "totalRevenue": _sum("totalRevenue"),
            "periodRevenue": _sum("periodRevenue"),
            "avgRevenue": _sum("avgRevenue", "avg"),
        }

    async def _plan_stats(self) -> list:
        pipeline = [
            {
                "$lookup": {
                    "from": "subscriptions",
                    "let": {"planId": "$_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$eq": ["$planId.$id", "$$planId"]
                                },
                                "status": SUBSCRIPTION_STATUS.ACTIVE.value,
                            }
                        },
                        {"$count": "count"},
                    ],
                    "as": "activeSubscriptions",
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "planId": {"$toString": "$_id"},
                    "name": 1,
                    "status": 1,
                    "visibility": 1,
                    "monthlyPrice": "$price.monthlyPrice",
                    "yearlyPrice": "$price.yearlyPrice",
                    "activeSubscriptions": {
                        "$ifNull": [
                            {"$arrayElemAt": ["$activeSubscriptions.count", 0]},
                            0,
                        ]
                    },
                }
            },
            {"$sort": {"activeSubscriptions": -1}},
        ]

        return await self._aggregate(PlanModel, pipeline)

    async def _activity_stats(
        self, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        pipeline = [
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
                    "byAction": [
                        {
                            "$group": {
                                "_id": "$action",
                                "count": {"$sum": 1},
                            }
                        },
                        {"$sort": {"count": -1}},
                        {"$limit": 10},
                        {
                            "$project": {
                                "_id": 0,
                                "action": "$_id",
                                "count": 1,
                            }
                        },
                    ],
                    "byEntity": [
                        {
                            "$group": {
                                "_id": "$entityType",
                                "count": {"$sum": 1},
                            }
                        },
                        {"$sort": {"count": -1}},
                        {
                            "$project": {
                                "_id": 0,
                                "entityType": "$_id",
                                "count": 1,
                            }
                        },
                    ],
                }
            }
        ]

        result = await self._aggregate(ActivityModel, pipeline)
        raw = result[0] if result else {}

        def _count(key):
            items = raw.get(key, [])
            return items[0].get("count", 0) if items else 0

        return {
            "total": _count("total"),
            "thisMonth": _count("thisMonth"),
            "byAction": raw.get("byAction", []),
            "byEntity": raw.get("byEntity", []),
        }

    async def _monthly_trend(self, model, start_of_year: datetime) -> list:
        pipeline = [
            {"$match": {"createdAt": {"$gte": start_of_year}}},
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

    async def _monthly_revenue_trend(self, start_of_year: datetime) -> list:
        pipeline = [
            {"$match": {"createdAt": {"$gte": start_of_year}}},
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$createdAt"},
                        "month": {"$month": "$createdAt"},
                    },
                    "revenue": {"$sum": "$finalPrice"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.year": 1, "_id.month": 1}},
            {
                "$project": {
                    "_id": 0,
                    "year": "$_id.year",
                    "month": "$_id.month",
                    "revenue": {"$round": ["$revenue", 2]},
                    "count": 1,
                }
            },
        ]

        result = await self._aggregate(SubscriptionModel, pipeline)
        month_names = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ]

        return [
            {
                "month": month_names[item["month"] - 1],
                "year": item["year"],
                "revenue": item["revenue"],
                "subscriptions": item["count"],
            }
            for item in result
        ]

    async def _company_by_status(self) -> list:
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "status": "$_id", "count": 1}},
        ]
        return await self._aggregate(CompanyModel, pipeline)

    async def _company_by_industry(self) -> list:
        pipeline = [
            {
                "$match": {
                    "status": {"$ne": COMPANY_STATUS.DELETED.value},
                    "industry": {"$exists": True, "$ne": None},
                }
            },
            {"$group": {"_id": "$industry", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
            {"$project": {"_id": 0, "industry": "$_id", "count": 1}},
        ]
        return await self._aggregate(CompanyModel, pipeline)

    async def _company_by_country(self) -> list:
        pipeline = [
            {
                "$match": {
                    "status": {"$ne": COMPANY_STATUS.DELETED.value},
                    "country": {"$exists": True, "$ne": None},
                }
            },
            {"$group": {"_id": "$country", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
            {"$project": {"_id": 0, "country": "$_id", "count": 1}},
        ]
        return await self._aggregate(CompanyModel, pipeline)

    async def _subscription_by_plan(self) -> list:
        pipeline = [
            {
                "$match": {
                    "status": {
                        "$in": [
                            SUBSCRIPTION_STATUS.ACTIVE.value,
                            SUBSCRIPTION_STATUS.TRIAL.value,
                        ]
                    }
                }
            },
            {
                "$group": {
                    "_id": "$planId.$id",
                    "count": {"$sum": 1},
                    "revenue": {"$sum": "$finalPrice"},
                }
            },
            {
                "$lookup": {
                    "from": "plans",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "plan",
                }
            },
            {"$unwind": {"path": "$plan", "preserveNullAndEmptyArrays": True}},
            {
                "$project": {
                    "_id": 0,
                    "planId": {"$toString": "$_id"},
                    "planName": {"$ifNull": ["$plan.name", "Unknown"]},
                    "count": 1,
                    "revenue": {"$round": ["$revenue", 2]},
                }
            },
            {"$sort": {"count": -1}},
        ]
        return await self._aggregate(SubscriptionModel, pipeline)

    async def _subscription_by_billing_cycle(self) -> list:
        pipeline = [
            {
                "$match": {
                    "status": SUBSCRIPTION_STATUS.ACTIVE.value
                }
            },
            {
                "$group": {
                    "_id": "$billingCycle",
                    "count": {"$sum": 1},
                    "revenue": {"$sum": "$finalPrice"},
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "cycle": "$_id",
                    "count": 1,
                    "revenue": {"$round": ["$revenue", 2]},
                }
            },
        ]
        return await self._aggregate(SubscriptionModel, pipeline)

    async def _latest_companies(self) -> list:
        pipeline = [
            {
                "$match": {
                    "status": {"$ne": COMPANY_STATUS.DELETED.value}
                }
            },
            {"$sort": {"createdAt": -1}},
            {"$limit": 5},
            {
                "$project": {
                    "_id": 0,
                    "companyId": 1,
                    "companyName": 1,
                    "industry": 1,
                    "country": 1,
                    "status": 1,
                    "subscriptionCount": 1,
                    "userLimit": 1,
                    "createdAt": 1,
                }
            },
        ]
        return await self._aggregate(CompanyModel, pipeline)

    async def _top_companies_by_users(self) -> list:
        pipeline = [
            {
                "$match": {
                    "status": {"$ne": USER_STATUS.DELETED.value},
                    "companyId": {"$exists": True, "$ne": None},
                }
            },
            {
                "$group": {
                    "_id": "$companyId",
                    "userCount": {"$sum": 1},
                }
            },
            {"$sort": {"userCount": -1}},
            {"$limit": 5},
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "_id",
                    "foreignField": "_id",
                    "as": "company",
                }
            },
            {"$unwind": {"path": "$company", "preserveNullAndEmptyArrays": True}},
            {
                "$project": {
                    "_id": 0,
                    "companyName": {
                        "$ifNull": ["$company.companyName", "Unknown"]
                    },
                    "companyId": "$company.companyId",
                    "industry": "$company.industry",
                    "status": "$company.status",
                    "userCount": 1,
                    "userLimit": "$company.userLimit",
                }
            },
        ]
        return await self._aggregate(UserModel, pipeline)

    async def _recent_activities(self) -> list:
        pipeline = [
            {"$sort": {"createdAt": -1}},
            {"$limit": 10},
            {
                "$project": {
                    "_id": 0,
                    "action": 1,
                    "entityType": 1,
                    "title": 1,
                    "description": 1,
                    "ipAddress": 1,
                    "createdAt": 1,
                }
            },
        ]
        return await self._aggregate(ActivityModel, pipeline)

    async def _churn_stats(
        self, range_start: datetime, range_end: datetime
    ) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "canceledThisPeriod": [
                        {
                            "$match": {
                                "status": SUBSCRIPTION_STATUS.CANCELED.value,
                                "cancelledAt": {
                                    "$gte": range_start,
                                    "$lte": range_end,
                                },
                            }
                        },
                        {"$count": "count"},
                    ],
                    "newThisPeriod": [
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
                    "canceledRevenueLost": [
                        {
                            "$match": {
                                "status": SUBSCRIPTION_STATUS.CANCELED.value,
                                "cancelledAt": {
                                    "$gte": range_start,
                                    "$lte": range_end,
                                },
                            }
                        },
                        {
                            "$group": {
                                "_id": None,
                                "total": {"$sum": "$finalPrice"},
                            }
                        },
                    ],
                }
            }
        ]

        result = await self._aggregate(SubscriptionModel, pipeline)
        raw = result[0] if result else {}

        def _count(key):
            items = raw.get(key, [])
            return items[0].get("count", 0) if items else 0

        canceled = _count("canceledThisPeriod")
        new_subs = _count("newThisPeriod")
        revenue_lost_items = raw.get("canceledRevenueLost", [])
        revenue_lost = round(revenue_lost_items[0].get("total", 0), 2) if revenue_lost_items else 0

        churn_rate = round((canceled / new_subs * 100), 2) if new_subs > 0 else 0

        return {
            "canceledThisPeriod": canceled,
            "newThisPeriod": new_subs,
            "churnRate": churn_rate,
            "revenueLost": revenue_lost,
        }