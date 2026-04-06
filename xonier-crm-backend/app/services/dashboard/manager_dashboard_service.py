
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.utils.custom_exception import AppException
from app.db.models.lead_model import LeadsModel
from app.db.models.enquiry_management_model import EnquiryModel
from app.db.models.deal_model import DealModel
from app.db.models.user_model import UserModel
from app.core.enums import SALES_STATUS, DEAL_STATUS, DEAL_PIPELINE
from app.db import db as database_module
from app.utils.get_team_members import GetTeamMembers
from app.repositories.team_repository import TeamRepository
from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder
from bson import ObjectId, DBRef
import asyncio
from app.core.crypto import encryptor


class ManagerDashboardService:

    def __init__(self):
        self.getTeamMembers = GetTeamMembers()
        self.teamRepo = TeamRepository()
        self.crypto = encryptor


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
        for item in result:
            if item.get("email"):
               item["email"] = self.crypto.decrypt_data(item["email"])
            
            if item.get("phone"):
                item["phone"] = self.crypto.decrypt_data(item["phone"])

        
        return result

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
        return items[0].get("count", 0)

    def _safe_sum(self, raw: dict, key: str, field: str = "total") -> float:
        items = raw.get(key)
        if not items:
            return 0
        return items[0].get(field, 0)

    async def _get_team_scope(self, user_id: str):
        manager_object_id = PydanticObjectId(user_id)

        teams = await self.teamRepo.find(
            {"manager.$id": {"$in": [manager_object_id]}},
            populate=["members"]
        )

        if not teams:
            return [], [], 0

        teams_encoded = jsonable_encoder(teams)

        member_ids = set()
        for team in teams_encoded:
            for member in team.get("members", []):
                member_ids.add(PydanticObjectId(member["id"]))

        all_scoped_ids = list(member_ids) + [manager_object_id]

        return list(member_ids), all_scoped_ids, len(teams)

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

            member_ids, all_scoped_ids, team_count = await self._get_team_scope(user["_id"])

            if not member_ids:
                return {
                    "role": "manager",
                    "period": {
                        "filter": filter,
                        "start": range_start.isoformat(),
                        "end": range_end.isoformat(),
                        "generatedAt": now.isoformat(),
                    },
                    "message": "No team members found. Assign members to your team first.",
                    "user": self._serialize([user_stats])[0] if user_stats else None,
                    "teams": {"total": 0},
                    "leads": {},
                    "deals": {},
                    "enquiries": {},
                    "members": [],
                    "monthlyLeadTrend": [],
                    "monthlyDealTrend": [],
                    "leadSourceBreakdown": [],
                    "leadStatusBreakdown": [],
                    "latestLeads": [],
                    "dealPipelineBreakdown": [],
                    "memberPerformance": [],
                    "topPerformer": None,
                }

            (user_stats,
                team_stats,
                lead_stats,
                deal_stats,
                enquiry_stats,
                monthly_lead_trend,
                monthly_deal_trend,
                lead_source_breakdown,
                lead_status_breakdown,
                latest_leads,
                deal_pipeline_breakdown,
                member_performance,
            ) = await asyncio.gather(
                self._user_data(ObjectId(user["_id"])),
                self._team_stats(user["_id"], team_count),
                self._lead_stats(all_scoped_ids, range_start, range_end),
                self._deal_stats(all_scoped_ids, range_start, range_end),
                self._enquiry_stats(all_scoped_ids, range_start, range_end),
                self._monthly_trend(LeadsModel, all_scoped_ids, start_of_year),
                self._monthly_trend(DealModel, all_scoped_ids, start_of_year),
                self._lead_source_breakdown(all_scoped_ids, range_start, range_end),
                self._lead_status_breakdown(all_scoped_ids, range_start, range_end),
                self._latest_leads(all_scoped_ids, range_start, range_end),
                self._deal_pipeline_breakdown(all_scoped_ids, range_start, range_end),
                self._member_performance(all_scoped_ids, range_start, range_end),
            )

            top_performer = None
            if member_performance:
                top_performer = max(member_performance, key=lambda x: x.get("totalLeads", 0))

            return {
                "role": "manager",
                "period": {
                    "filter": filter,
                    "start": range_start.isoformat(),
                    "end": range_end.isoformat(),
                    "year": now.year,
                    "generatedAt": now.isoformat(),
                },
                "user": self._serialize([user_stats])[0] if user_stats else None,
                "teams": team_stats,
                "leads": lead_stats,
                "deals": deal_stats,
                "enquiries": enquiry_stats,
                "monthlyLeadTrend": monthly_lead_trend,
                "monthlyDealTrend": monthly_deal_trend,
                "leadSourceBreakdown": lead_source_breakdown,
                "leadStatusBreakdown": lead_status_breakdown,
                "latestLeads": latest_leads,
                "dealPipelineBreakdown": deal_pipeline_breakdown,
                "memberPerformance": member_performance,
                "topPerformer": top_performer,
            }

        except AppException:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def _team_stats(self, manager_id: str, team_count: int) -> Dict[str, Any]:
        manager_object_id = PydanticObjectId(manager_id)

        teams = await self.teamRepo.find(
            {"manager.$id": {"$in": [manager_object_id]}},
            populate=["members"]
        )

        teams_encoded = jsonable_encoder(teams)

        

        total_members = set()
        active_teams = 0

        for team in teams_encoded:
            if team.get("isActive", True):
                active_teams += 1
            for member in team.get("members", []):
                total_members.add(member["id"])


        return {
            "totalTeams": team_count,
            "activeTeams": active_teams,
            "totalMembers": len(total_members),
        }

    async def _lead_stats(self, scoped_ids: list, range_start: datetime, range_end: datetime) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {
                            "$match": {
                                "status": {"$ne": SALES_STATUS.DELETE.value},
                                "$or": [
                                    {"createdBy.$id": {"$in": scoped_ids}},
                                    {"assignedTo.$id": {"$in": scoped_ids}},
                                ]
                            }
                        },
                        {"$count": "count"}
                    ],
                    "inRange": [
                        {
                            "$match": {
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "status": {"$ne": SALES_STATUS.DELETE.value},
                                "$or": [
                                    {"createdBy.$id": {"$in": scoped_ids}},
                                    {"assignedTo.$id": {"$in": scoped_ids}},
                                ]
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
                                },
                                "$or": [
                                    {"createdBy.$id": {"$in": scoped_ids}},
                                    {"assignedTo.$id": {"$in": scoped_ids}},
                                ]
                            }
                        },
                        {"$count": "count"}
                    ],
                    "won": [
                        {
                            "$match": {
                                "status": SALES_STATUS.WON.value,
                                "$or": [
                                    {"createdBy.$id": {"$in": scoped_ids}},
                                    {"assignedTo.$id": {"$in": scoped_ids}},
                                ]
                            }
                        },
                        {"$count": "count"}
                    ],
                    "inDeal": [
                        {
                            "$match": {
                                "inDeal": True,
                                "$or": [
                                    {"createdBy.$id": {"$in": scoped_ids}},
                                    {"assignedTo.$id": {"$in": scoped_ids}},
                                ]
                            }
                        },
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
            "inDeal": self._safe_count(raw, "inDeal"),
        }

    async def _deal_stats(self, scoped_ids: list, range_start: datetime, range_end: datetime) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {
                            "$match": {
                                "status": {"$ne": DEAL_STATUS.DELETE.value},
                                "createdBy.$id": {"$in": scoped_ids}
                            }
                        },
                        {"$count": "count"}
                    ],
                    "inRange": [
                        {
                            "$match": {
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "status": {"$ne": DEAL_STATUS.DELETE.value},
                                "createdBy.$id": {"$in": scoped_ids}
                            }
                        },
                        {"$count": "count"}
                    ],
                    "active": [
                        {
                            "$match": {
                                "status": DEAL_STATUS.ACTIVE.value,
                                "createdBy.$id": {"$in": scoped_ids}
                            }
                        },
                        {"$count": "count"}
                    ],
                    "closed": [
                        {
                            "$match": {
                                "status": DEAL_STATUS.CLOSED.value,
                                "createdBy.$id": {"$in": scoped_ids}
                            }
                        },
                        {"$count": "count"}
                    ],
                    "totalRevenue": [
                        {
                            "$match": {
                                "status": DEAL_STATUS.CLOSED.value,
                                "createdBy.$id": {"$in": scoped_ids}
                            }
                        },
                        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
                    ],
                    "rangeRevenue": [
                        {
                            "$match": {
                                "status": DEAL_STATUS.CLOSED.value,
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "createdBy.$id": {"$in": scoped_ids}
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

    async def _enquiry_stats(self, scoped_ids: list, range_start: datetime, range_end: datetime) -> Dict[str, Any]:
        pipeline = [
            {
                "$facet": {
                    "total": [
                        {
                            "$match": {
                                "deletedAt": None,
                                "$or": [
                                    {"createdBy.$id": {"$in": scoped_ids}},
                                    {"assignTo.$id": {"$in": [str(i) for i in scoped_ids]}},
                                ]
                            }
                        },
                        {"$count": "count"}
                    ],
                    "inRange": [
                        {
                            "$match": {
                                "createdAt": {"$gte": range_start, "$lte": range_end},
                                "deletedAt": None,
                                "$or": [
                                    {"createdBy.$id": {"$in": scoped_ids}},
                                    {"assignTo.$id": {"$in": [str(i) for i in scoped_ids]}},
                                ]
                            }
                        },
                        {"$count": "count"}
                    ],
                    "assigned": [
                        {
                            "$match": {
                                "deletedAt": None,
                                "assignTo": {"$exists": True, "$ne": None},
                                "$or": [
                                    {"createdBy.$id": {"$in": scoped_ids}},
                                    {"assignTo.$id": {"$in": [str(i) for i in scoped_ids]}},
                                ]
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
                                ],
                                "createdBy.$id": {"$in": scoped_ids}
                            }
                        },
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


        }
    
    async def _user_data(self, user_id: ObjectId):
        
        pipeline = [
            {
                "$match": {
                    "_id": user_id,
                    "status": {"$ne": SALES_STATUS.DELETE.value}
                }
            },
            
            {"$project": {"_id": 0, "password": 0, "refreshToken": 0, "createdBy": 0, "userRole": 0, "hashedPhone": 0, "hashedEmail": 0}},
        ]

        

        result = await self._aggregate(UserModel, pipeline)
        

        return result[0] if result else None

    async def _monthly_trend(self, model, scoped_ids: list, start_of_year: datetime) -> list:
        pipeline = [
            {
                "$match": {
                    "createdAt": {"$gte": start_of_year},
                    "createdBy.$id": {"$in": scoped_ids}
                }
            },
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

    async def _lead_source_breakdown(self, scoped_ids: list, range_start: datetime, range_end: datetime) -> list:
        pipeline = [
            {
                "$match": {
                    "status": {"$ne": SALES_STATUS.DELETE.value},
                    "createdAt": {"$gte": range_start, "$lte": range_end},
                    "createdBy.$id": {"$in": scoped_ids}
                }
            },
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "source": "$_id", "count": 1}}
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _lead_status_breakdown(self, scoped_ids: list, range_start: datetime, range_end: datetime) -> list:
        pipeline = [
            {
                "$match": {
                    "createdAt": {"$gte": range_start, "$lte": range_end},
                    "createdBy.$id": {"$in": scoped_ids}
                }
            },
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "status": "$_id", "count": 1}}
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _latest_leads(self, scoped_ids: list, range_start: datetime, range_end: datetime) -> list:
        pipeline = [
            {
                "$match": {
                    "status": {"$ne": SALES_STATUS.DELETE.value},
                    "createdAt": {"$gte": range_start, "$lte": range_end},
                    "$or": [
                        {"createdBy.$id": {"$in": scoped_ids}},
                        {"assignedTo.$id": {"$in": scoped_ids}},
                    ]
                }
            },
            {"$sort": {"createdAt": -1}},
            {"$limit": 5},
            {
                "$project": {
                    "_id": {"$toString": "$_id"},
                    "lead_id": 1,
                    "fullName": 1,
                    "email": 1,
                    "source": 1,
                    "status": 1,
                    "priority": 1,
                    "createdAt": 1,
                }
            }
        ]
        return await self._aggregate(LeadsModel, pipeline)

    async def _deal_pipeline_breakdown(self, scoped_ids: list, range_start: datetime, range_end: datetime) -> list:
        pipeline = [
            {
                "$match": {
                    "status": {"$ne": DEAL_STATUS.DELETE.value},
                    "createdAt": {"$gte": range_start, "$lte": range_end},
                    "createdBy.$id": {"$in": scoped_ids}
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

        pipeline_order = [
            DEAL_PIPELINE.QUALIFICATION.value,
            DEAL_PIPELINE.REQUIREMENT_ANALYSIS.value,
            DEAL_PIPELINE.PROPOSAL.value,
            DEAL_PIPELINE.NEGOTIATION.value,
            DEAL_PIPELINE.WON.value,
            DEAL_PIPELINE.LOST.value,
        ]

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

    async def _member_performance(self, scoped_ids: list, range_start: datetime, range_end: datetime) -> list:
        lead_pipeline = [
            {
                "$match": {
                    "createdAt": {"$gte": range_start, "$lte": range_end},
                    "status": {"$ne": SALES_STATUS.DELETE.value},
                    "createdBy.$id": {"$in": scoped_ids}
                }
            },
            {
                "$group": {
                    "_id": "$createdBy.$id",
                    "totalLeads": {"$sum": 1},
                    "wonLeads": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", SALES_STATUS.WON.value]}, 1, 0]
                        }
                    },
                }
            }
        ]

        deal_pipeline = [
            {
                "$match": {
                    "createdAt": {"$gte": range_start, "$lte": range_end},
                    "status": {"$ne": DEAL_STATUS.DELETE.value},
                    "createdBy.$id": {"$in": scoped_ids}
                }
            },
            {
                "$group": {
                    "_id": "$createdBy.$id",
                    "totalDeals": {"$sum": 1},
                    "closedDeals": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", DEAL_STATUS.CLOSED.value]}, 1, 0]
                        }
                    },
                    "totalRevenue": {"$sum": "$amount"}
                }
            }
        ]

        lead_results, deal_results, users = await asyncio.gather(
            self._aggregate(LeadsModel, lead_pipeline),
            self._aggregate(DealModel, deal_pipeline),
            self._get_member_details(scoped_ids),
        )

        lead_map = {str(item["_id"]): item for item in lead_results}
        deal_map = {str(item["_id"]): item for item in deal_results}

        performance = []
        for user in users:
            uid = str(user.get("id") or user.get("_id", ""))
            lead_data = lead_map.get(uid, {})
            deal_data = deal_map.get(uid, {})

            total_leads = lead_data.get("totalLeads", 0)
            won_leads = lead_data.get("wonLeads", 0)

            performance.append({
                "userId": uid,
                "firstName": user.get("firstName", ""),
                "lastName": user.get("lastName", ""),
                "totalLeads": total_leads,
                "wonLeads": won_leads,
                "conversionRate": round(won_leads / total_leads * 100, 2) if total_leads > 0 else 0,
                "totalDeals": deal_data.get("totalDeals", 0),
                "closedDeals": deal_data.get("closedDeals", 0),
                "totalRevenue": deal_data.get("totalRevenue", 0),
            })

        return sorted(performance, key=lambda x: x["totalLeads"], reverse=True)

    async def _get_member_details(self, scoped_ids: list) -> list:
        pipeline = [
            {"$match": {"_id": {"$in": scoped_ids}}},
            {
                "$project": {
                    "_id": 0,
                    "id": {"$toString": "$_id"},
                    "firstName": 1,
                    "lastName": 1,
                }
            }
        ]
        return await self._aggregate(UserModel, pipeline)


