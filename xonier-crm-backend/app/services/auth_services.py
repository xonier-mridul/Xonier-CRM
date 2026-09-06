from app.utils.custom_exception import AppException
from app.repositories.user_repository import UserRepository
from app.core.security import hash_value
from app.db.db import Client
from app.db.models.company_model import CompanyModel
from difflib import SequenceMatcher
from beanie.operators import Or
from typing import Dict, Any, List
from app.utils.otp_manager import generate_otp
from app.utils.get_team_members import GetTeamMembers



from app.utils.rating_filters import (
    compute_date_range,
    apply_rating_filter,
    apply_on_time_filter,
    generate_month_buckets,
    get_trend_start_date,
)
from app.schemas.rating_schema import UserRatingStats, MonthlyTrendItem

from app.utils.email_manager import EmailManager
from app.core.enums import (
    OTP_TYPE,
    OTP_EXPIRY,
    USER_STATUS,
    ACTIVITY_ENTITY_TYPE,
    ACTIVITY_ACTION,
    COMPANY_STATUS,
    SUBSCRIPTION_STATUS, USER_ROLES
)
from datetime import datetime, timezone, timedelta
from app.core.config import get_setting
from fastapi.encoders import jsonable_encoder
from beanie import PydanticObjectId
from pydantic import ValidationError
from app.core.crypto import encryptor
from app.repositories.otp_repository import OtpRepository
from app.db.models.user_model import UserModel
from app.schemas.user_schema import UpdateUserSchema
from app.core.security import hash_password
from bson import ObjectId, DBRef

from app.core.constants import SUPER_ADMIN_CODE, COMPANY_ADMIN_CODE
from app.repositories.user_role_repository import UserRoleRepository
from app.utils.cache_key_generator import cache_key_generator_by_id
from app.repositories.activity_repository import ActivityRepository
from app.core.constants import GET_ME_NAMESPACE
from fastapi_cache import FastAPICache
import json
from typing import Optional

from app.utils.validate_admin import (
    validate_admin,
    validate_company_admin,
    validate_admin_company_admin,
)

from app.utils.activity_payload import activity_payload
from app.core.tenant import system_query
from app.utils.validate_admin import validate_admin
from app.repositories.company_repository import CompanyRepository
from app.repositories.task_repository import TaskRepository
from app.schemas.project.user_project import USER_GET_ME_PROJECT, USER_LOOKUP
import math
from app.core.lookup_constants import USER_ROLE_LOOKEUP
from app.schemas.project.user_project import USER_GET_RATING_PROJECT
import asyncio


class AuthServices:
    def __init__(self):
        self.client = Client
        self.repo = UserRepository()
        self.otp_repo = OtpRepository()
        self.role_repo = UserRoleRepository()
        self.email_manager = EmailManager()
        self.settings = get_setting()
        self.get_team_members = GetTeamMembers()
        self.activityRepo = ActivityRepository()
        self.crypto = encryptor
        self.companyRepo = CompanyRepository()
        self.taskRepo = TaskRepository()

    MATCH_THRESHOLD = 90.0 

    async def getAll(
        self,
        page: int = 1,
        limit: int = 10,
        filters: Dict[str, Any] = {},
        user: Dict[str, Any] = [],
    ) -> List[UserModel]:
        try:
            query = {
                "$or": [
                    {"status": USER_STATUS.ACTIVE},
                    {"status": USER_STATUS.INACTIVE},
                    {"status": USER_STATUS.SUSPENDED},
                ]
            }

            is_admin = validate_admin(user["userRole"])
            is_c_admin = validate_company_admin(user["userRole"])

            if is_admin:
                c_role = await self.role_repo.get_company_admin_role()
                query.update(
                    {"userRole": {"$elemMatch": {"$id": PydanticObjectId(c_role.id)}}}
                )

            if not is_admin and not is_c_admin:
                members = await self.get_team_members.get_team_members(user["_id"])

                obj_members = [PydanticObjectId(item) for item in members]

                if members:
                    query.update(
                        {
                            "$or": [
                                {"_id": {"$in": obj_members}},
                                {"id": PydanticObjectId(user["_id"])},
                            ]
                        }
                    )
                    is_manager = True

                else:
                    query.update({"_id": PydanticObjectId(user["_id"])})

            if "search" in filters and filters["search"].strip():
                regex_data = {"$regex": filters["search"].strip(), "$options": "i"}

                query.update(
                    {
                        "$or": [
                            {"firstName": regex_data},
                            {"lastName": regex_data},
                        ]
                    }
                )

            if "status" in filters:
                if filters["status"] != USER_STATUS.DELETED:
                    query.update({"status": filters["status"]})

            if "companyId" in filters:
                query.update({"companyId": ObjectId(filters["companyId"])})

            users = await self.repo.get_all_nested(
                page,
                limit,
                query,
                populate=["userRole", "createdBy"],
                sort=["-createdAt"],
            )

            if not users:
                raise AppException(404, "Users not found")

            parsed_users = jsonable_encoder(
                users["data"], exclude={"password", "refreshToken"}
            )
            for item in parsed_users:
                item["email"] = encryptor.decrypt_data(item["email"])
                item["phone"] = encryptor.decrypt_data(item["phone"])

            users["data"] = parsed_users

            return users

        except Exception as e:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def get_user_by_team(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = filters.get("page") or 1
            limit = filters.get("limit") or 10

            is_admin = validate_admin(user["userRole"])
            is_c_admin = validate_company_admin(user["userRole"])
            is_manager = False

            query = {"status": USER_STATUS.ACTIVE}

            if not is_admin and not is_c_admin:
                members = await self.get_team_members.get_team_members(user["_id"])

                obj_members = [PydanticObjectId(item) for item in members]

                if members:
                    query.update(
                        {
                            "$or": [
                                {"_id": {"$in": obj_members}},
                                {"id": PydanticObjectId(user["_id"])},
                            ]
                        }
                    )
                    is_manager = True

                else:
                    query.update({"_id": PydanticObjectId(user["_id"])})

            if "search" in filters and filters["search"].strip():
                regex_data = {"$regex": filters["search"].strip(), "$options": "i"}

                query.update(
                    {"$or": [{"firstName": regex_data}, {"lastName": regex_data}]}
                )

            if not is_admin and not is_manager and query == {}:
                raise AppException(409, "You are not authorized to get this data")

            result = await self.repo.get_all(
                page=int(page), limit=int(limit), filters=query, sort=["-createdAt"]
            )

            if not result:
                raise AppException(404, "Users not found")

            result = jsonable_encoder(result["data"])

            for item in result:
                if item and item.get("email"):
                    item["email"] = self.crypto.decrypt_data(item["email"])

            return result

        except Exception as e:
            raise e

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def get_all_for_frontend(
        self, page: int = 1, limit: int = 10, filters: Dict[str, Any] = {}
    ) -> List[UserModel]:
        try:
            query = {}

            if "firstName" in filters:
                query.update({"firstName": filters["firstName"]})

            if "lastName" in filters:
                query.update({"lastName": filters["lastName"]})

            query.update({"status": USER_STATUS.ACTIVE})

            users = await self.repo.get_all(
                page, limit, query, populate=["userRole", "createdBy"]
            )

            if not users:
                raise AppException(404, "Users not found")

            parsed_users = jsonable_encoder(
                users["data"], exclude={"password", "refreshToken"}
            )
            for item in parsed_users:
                item["email"] = encryptor.decrypt_data(item["email"])
                item["phone"] = encryptor.decrypt_data(item["phone"])
            users["data"] = parsed_users

            return users

        except Exception as e:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def get_all_active_without_pagination(self, filters: Dict[str, Any]):
        try:
            query = {}

            query.update({"status": USER_STATUS.ACTIVE.value})

            result = await self.repo.get_all_without_pagination(
                query, populate=["userRole", "createdBy", "assignedPhoneNumber"]
            )

            if not result:
                raise AppException(404, "Users not found")

            return jsonable_encoder(result, exclude={"password"})

        except AppException:

            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def get_all_deleted_users(
        self,
        page: int = 1,
        limit: int = 10,
        user: Dict[str, Any] = {},
        filters: Dict[str, Any] = {},
    ):
        try:
            is_admin = validate_admin(user["userRole"])
            is_com_admin = validate_company_admin(user["userRole"])
            is_manager = False

            query = {"status": USER_STATUS.DELETED.value}

            if not is_admin and not is_com_admin:
            
                
                members = await self.get_team_members.get_team_members(user["_id"])
                
                obj_members = [PydanticObjectId(item) for item in members]
                
                if members:
                    query.update({
                            "$or": [
                                {"_id": {"$in": obj_members}},
                                {"id": PydanticObjectId(user["_id"])},
                            ]
                        })
                    is_manager = True

            


            if "search" in filters and filters["search"].strip():
                search_regex = {"$regex": filters["search"].strip(), "$options": "i"}

                query.update(
                    {
                        "$or": [
                            {"firstName": search_regex},
                            {"lastName": search_regex},
                        ]
                    }
                )

            if "email" in filters:
                hashed_email = hash_value(filters["email"].lower())
                query["hashedEmail"] = {"$regex": hashed_email, "$options": "i"}

            if "fromDate" in filters or "toDate" in filters:
                date_filter = {}
                if "fromDate" in filters:
                    try:
                        from_dt = datetime.fromisoformat(str(filters["fromDate"]))
                        from_dt = from_dt.replace(
                            hour=0,
                            minute=0,
                            second=0,
                            microsecond=0,
                            tzinfo=timezone.utc,
                        )
                        date_filter["$gte"] = from_dt
                    except (ValueError, TypeError):
                        raise AppException(
                            400, "Invalid fromDate format. Use ISO format: YYYY-MM-DD"
                        )

                if "toDate" in filters:
                    try:
                        to_dt = datetime.fromisoformat(str(filters["toDate"]))
                        to_dt = to_dt.replace(
                            hour=23,
                            minute=59,
                            second=59,
                            microsecond=999999,
                            tzinfo=timezone.utc,
                        )
                        date_filter["$lte"] = to_dt
                    except (ValueError, TypeError):
                        raise AppException(
                            400, "Invalid toDate format. Use ISO format: YYYY-MM-DD"
                        )

                if date_filter:
                    query["deletedAt"] = date_filter

            if not is_admin and not is_com_admin and not is_manager:
                raise AppException(
                    403, "Unauthorized, only Company admin and manager can access deleted users"
                )


            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["userRole", "deletedBy", "createdBy"],
                sort=["-deletedAt"],
            )

            if not result:
                raise AppException(404, "No deleted users found")

            result = jsonable_encoder(result)

            for item in result["data"]:
                item["email"] = encryptor.decrypt_data(item["email"])
                if item.get("phone"):
                    item["phone"] = encryptor.decrypt_data(item["phone"])
                item.pop("password", None)
                item.pop("refreshToken", None)
                item.pop("hashedEmail", None)
                item.pop("hashedPhone", None)

            return result

        except AppException:
            raise

        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error: {e}")

    async def get_user_by_id(self, id: PydanticObjectId, user: Dict[str, Any]):
        try:

            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid user object id")

            exist_user = await self.repo.find_by_id(
                id=id, populate=["userRole", "createdBy"]
            )

            if not exist_user:
                raise AppException(404, "User not found for this Id")

            ex_user = jsonable_encoder(exist_user, exclude={"password", "refreshToken"})

            is_admin = validate_admin(user["userRole"])

            sums = None

            if not is_admin:
                task_data = await self.taskRepo.find_with_project(
                    filter={
                        "assignedTo.$id": {"$in": [PydanticObjectId(id)]},
                        "completedAt": {"$ne": None},
                    },
                    project={"rating": 1},
                )

                sums = [(item.get("rating") or None) for item in task_data]

                filtered_sums = [x for x in sums if isinstance(x, (int, float))] or [0]
                
                if sums:
                    overall_rating = (
                        round((sum(filtered_sums) / len(filtered_sums)), 1) or None
                    )

            if ex_user.get("companyId"):
                company = await self.companyRepo.find_by_id_nested(
                    PydanticObjectId(ex_user["companyId"]),
                    ["subscription.planId.features.feature"],
                )

                ex_user["companyId"] = company

            ex_user["email"] = encryptor.decrypt_data(ex_user["email"])
            ex_user["phone"] = encryptor.decrypt_data(ex_user["phone"])
            ex_user["rating"] = overall_rating if sums else None

            return ex_user

        except Exception as e:
            raise e

        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error: {e}")

    async def _compute_rating_analytics(
        self,
        user_id: str,
        stats_filter: Dict[str, Any],
        trend_months: int = 6,
    ) -> UserRatingStats:
        """
        3 lightweight parallel aggregations instead of one heavy $facet.
        Doesn't touch TaskRepository — uses same underlying collection
        access pattern your repo already exposes.
        """
        collection = self.taskRepo.model.get_pymongo_collection()

        overall_pipeline = [
            {"$match": stats_filter},
            {
                "$group": {
                    "_id": None,
                    "totalTasksDone": {"$sum": 1},
                    "ratedTasksCount": {
                        "$sum": {"$cond": [{"$ne": ["$rating", None]}, 1, 0]}
                    },
                    "onTimeTasksCount": {
                        "$sum": {"$cond": [{"$eq": ["$isOverdue", False]}, 1, 0]}
                    },
                    "overdueTasksCount": {
                        "$sum": {"$cond": [{"$eq": ["$isOverdue", True]}, 1, 0]}
                    },
                    "sumRating": {"$sum": {"$ifNull": ["$rating", 0]}},
                    "sumActualHours": {"$sum": {"$ifNull": ["$actualHours", 0]}},
                    "efficiencySum": {
                        "$sum": {
                            "$cond": [
                                {"$gt": ["$estimatedHours", 0]},
                                {"$divide": ["$actualHours", "$estimatedHours"]},
                                0,
                            ]
                        }
                    },
                    "efficiencyCount": {
                        "$sum": {"$cond": [{"$gt": ["$estimatedHours", 0]}, 1, 0]}
                    },
                }
            },
        ]

        rating_dist_pipeline = [
            {"$match": {**stats_filter, "rating": {"$ne": None}}},
            {"$group": {"_id": "$rating", "count": {"$sum": 1}}},
        ]

        trend_start = get_trend_start_date(trend_months)
        trend_pipeline = [
            {
                "$match": {
                    "assignedTo.$id": {"$in": [PydanticObjectId(user_id)]},
                    "completedAt": {"$gte": trend_start, "$ne": None},
                }
            },
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m", "date": "$completedAt"}},
                    "tasksCompleted": {"$sum": 1},
                    "onTimeCount": {
                        "$sum": {"$cond": [{"$eq": ["$isOverdue", False]}, 1, 0]}
                    },
                    "ratedCount": {
                        "$sum": {"$cond": [{"$ne": ["$rating", None]}, 1, 0]}
                    },
                    "sumRating": {"$sum": {"$ifNull": ["$rating", 0]}},
                }
            },
            {"$sort": {"_id": 1}},
        ]

        overall_result, dist_result, trend_result = await asyncio.gather(
            collection.aggregate(overall_pipeline).to_list(length=1),
            collection.aggregate(rating_dist_pipeline).to_list(length=None),
            collection.aggregate(trend_pipeline).to_list(length=None),
        )

        totals = overall_result[0] if overall_result else {}
        total_done = totals.get("totalTasksDone", 0)
        rated_count = totals.get("ratedTasksCount", 0)
        on_time_count = totals.get("onTimeTasksCount", 0)
        efficiency_count = totals.get("efficiencyCount", 0)

        overall_rating = (
            round(totals["sumRating"] / rated_count, 1) if rated_count > 0 else None
        )
        avg_actual_hours = (
            round(totals["sumActualHours"] / total_done, 1) if total_done > 0 else 0
        )
        efficiency_rate = (
            round((totals["efficiencySum"] / efficiency_count) * 100, 1)
            if efficiency_count > 0
            else None
        )
        on_time_rate = round((on_time_count / total_done) * 100, 1) if total_done > 0 else 0
        rating_rate = round((rated_count / total_done) * 100, 1) if total_done > 0 else 0

        rating_distribution = {str(i): 0 for i in range(1, 6)}
        for item in dist_result:
            if item["_id"] is not None:
                key = str(int(item["_id"]))
                if key in rating_distribution:
                    rating_distribution[key] = item["count"]

        trend_map = {item["_id"]: item for item in trend_result}
        month_buckets = generate_month_buckets(trend_months)

        monthly_trend: List[MonthlyTrendItem] = []
        for month_key in month_buckets:
            data = trend_map.get(month_key)
            if not data:
                monthly_trend.append(
                    MonthlyTrendItem(month=month_key, tasksCompleted=0, onTimeRate=0, avgRating=None)
                )
                continue

            tasks_completed = data["tasksCompleted"]
            month_on_time_rate = (
                round((data["onTimeCount"] / tasks_completed) * 100, 1)
                if tasks_completed > 0 else 0
            )
            month_avg_rating = (
                round(data["sumRating"] / data["ratedCount"], 1)
                if data["ratedCount"] > 0 else None
            )
            monthly_trend.append(
                MonthlyTrendItem(
                    month=month_key,
                    tasksCompleted=tasks_completed,
                    onTimeRate=month_on_time_rate,
                    avgRating=month_avg_rating,
                )
            )

        return UserRatingStats(
            totalTasksDone=total_done,
            ratedTasksCount=rated_count,
            unratedTasksCount=total_done - rated_count,
            onTimeTasksCount=on_time_count,
            overdueTasksCount=totals.get("overdueTasksCount", 0),
            onTimeRate=on_time_rate,
            ratingRate=rating_rate,
            overallRating=overall_rating,
            avgActualHours=avg_actual_hours,
            efficiencyRate=efficiency_rate,
            ratingDistribution=rating_distribution,
            monthlyTrend=monthly_trend,
        )


    async def get_user_rating_data(
        self,
        userId: str,
        user: Dict[str, Any],
        page: int = 1,
        limit: int = 20,
        date_filter: Optional[str] = None,
        start_date_str: Optional[str] = None,
        end_date_str: Optional[str] = None,
        rating_filter: Optional[str] = None,
        on_time_filter: Optional[str] = None,
        trend_months: int = 6,
    ):
        try:
            if not ObjectId.is_valid(userId):
                raise AppException(400, "Invalid user object id")

            exist_user = await self.repo.find_by_id_with_project(
                id=PydanticObjectId(userId),
                lookups=[USER_ROLE_LOOKEUP],
                project=USER_GET_RATING_PROJECT,
            )

            if not exist_user:
                raise AppException(404, "User not found for this Id")

            target_user = jsonable_encoder(exist_user)
            is_admin = validate_admin_company_admin(target_user["userRole"])

            task_data = []
            total = 0
            total_pages = 0
            stats: Optional[UserRatingStats] = None

            if not is_admin:
                start_date, end_date = compute_date_range(
                    date_filter, start_date_str, end_date_str
                )

                base_filter: Dict[str, Any] = {
                    "assignedTo.$id": {"$in": [PydanticObjectId(userId)]},
                    "completedAt": {"$ne": None},
                }

                if start_date or end_date:
                    date_range = {}
                    if start_date:
                        date_range["$gte"] = start_date
                    if end_date:
                        date_range["$lte"] = end_date
                    base_filter["completedAt"] = {**base_filter["completedAt"], **date_range}

                # Used for stat cards / charts — date-scoped only
                stats_filter = dict(base_filter)

                # Used for the actual paginated task list — date + rating + onTime
                task_filter = dict(base_filter)
                apply_rating_filter(task_filter, rating_filter)
                apply_on_time_filter(task_filter, on_time_filter)

                task_project = {
                    "rating": 1,
                    "remark": 1,
                    "title": 1,
                    "assignedAt": 1,
                    "dueDate": 1,
                    "completedAt": 1,
                    "estimatedHours": 1,
                    "actualHours": 1,
                    "isOverdue": 1,
                }

                paginated_result, total, stats = await asyncio.gather(
                    self.taskRepo.find_with_project(
                        filter=task_filter,
                        project=task_project,
                        skip=(page - 1) * limit,
                        limit=limit,
                        sort=[("completedAt", -1)],
                    ),
                    self.taskRepo.count(filter=task_filter),
                    self._compute_rating_analytics(userId, stats_filter, trend_months),
                )

                total_pages = math.ceil(total / limit) if total > 0 else 0
                task_data = paginated_result or []

            target_user["email"] = encryptor.decrypt_data(target_user["email"])
            target_user["phone"] = encryptor.decrypt_data(target_user["phone"])
            target_user["rating"] = stats.overallRating if stats else None
            target_user["stats"] = stats.model_dump() if stats else None
            target_user["taskData"] = {
                "data": task_data,
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            }

            return target_user

        except AppException:
            raise
        except Exception as e:
            raise AppException(status_code=500, message=f"Internal server error: {e}")
    
    async def get_user_profile(self, user: Dict[str, Any]):
        try:

            is_admin = validate_admin(user["userRole"])
            is_manager = False
            is_creator = False

            exist_user = await self.repo.find_by_id(
                PydanticObjectId(user["_id"]), populate=["userRole", "createdBy"]
            )

            if not exist_user:
                raise AppException(404, "User not found for this Id")

            if not is_admin:
                members = await self.get_team_members.get_team_members(user["_id"])

                if exist_user.id in members:
                    is_manager = True

            if str(exist_user.id) == str(user["_id"]):
                is_creator = True

            if not is_admin and not is_manager and not is_creator:
                raise AppException(
                    403, "Permission denied, you can not access this user profile data"
                )
            user = jsonable_encoder(exist_user, exclude={"password", "refreshToken"})

            user["email"] = encryptor.decrypt_data(user["email"])
            user["phone"] = encryptor.decrypt_data(user["phone"])

            return user

        except Exception as e:
            raise

        except Exception as e:
            raise AppException(status_code=500, message="internal server error")

    async def create(self, user: Dict[str, Any], data: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()
            hashed_email = hash_value(data["email"])
            is_admin = validate_admin(user["userRole"])
            is_company_admin = validate_company_admin(user["userRole"])

            is_new_company_admin = False
            is_user_exist = await self.repo.find_user_by_hashMail(
                hashMail=hashed_email, populate=["userRole"], session=session
            )

            if is_user_exist:
                raise AppException(400, "User already exist, please delete user permanently first")

            for item in data["userRole"]:

                get_role = await self.role_repo.find_by_id(
                    id=PydanticObjectId(item), session=session
                )

                if get_role.code == SUPER_ADMIN_CODE:
                    raise AppException(
                        400,
                        "Super admin user creation is invalid, please use different role",
                    )

                if not is_admin and get_role.code == COMPANY_ADMIN_CODE:
                    raise AppException(
                        400,
                        "Company admin user only created by super admin"
                    )

                if get_role.code == COMPANY_ADMIN_CODE:
                    is_new_company_admin = True


            userModel = await self.repo.find_by_id(id=user["_id"], session=session)

            if not userModel:
                raise AppException(404, "Current user not found")

            if is_admin:
                companyId = data["companyId"] if data.get("companyId") else None
            
            else:
                
                companyId = userModel.companyId if userModel.companyId else None


            company = await self.companyRepo.find_by_id(id=companyId, populate=["subscription", "primary_admin"])

            if not company:
                raise AppException(400, "Company not found")



            if company.primary_admin.id and is_new_company_admin:
                raise AppException(400, "Company admin role already exist")


            if company.status == COMPANY_STATUS.DELETED or company.status == COMPANY_STATUS.INACTIVE or company.status == COMPANY_STATUS.SUSPENDED or company.status == COMPANY_STATUS.PENDING_VERIFICATION:
                raise AppException(status_code=400, message=f"Company status is {"Deleted" if company.status == COMPANY_STATUS.DELETED else "Inactive" if company.status == COMPANY_STATUS.INACTIVE else "Suspended" if company.status == COMPANY_STATUS.SUSPENDED else "Pending Verification" }")

            user_count = await self.repo.get_user_count_by_company_id(companyId=company.id)


            if company.userLimit and int(user_count or 0) >= int(company.userLimit or 0):
                raise AppException(400, "User limit exceeded")


            new_user = await self.repo.create(
                data={**data, "createdBy": userModel.id, "companyId": companyId},
                session=session,
            )

            if not new_user:
                raise AppException(400, "User not created")

            activity = activity_payload(
                userId=PydanticObjectId(user["_id"]),
                entityType=ACTIVITY_ENTITY_TYPE.USER,
                entityId=PydanticObjectId(new_user.id),
                action=ACTIVITY_ACTION.CREATED,
                title="create user",
                metadata={
                    "userName": f"{new_user.firstName} {new_user.lastName}",
                    "company": companyId,
                },
            )

            is_activity = await self.activityRepo.create(data=activity, session=session)

            if not is_activity:
                raise AppException(400, "Activity creation failed")

            await session.commit_transaction()

            return new_user.model_dump(mode="json")

        except AppException as e:
            await session.abort_transaction()
            raise e

        except Exception as e:

            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")

        except ValidationError as e:
            raise AppException(status_code=422, message=e.errors())

        finally:
            await session.end_session()
            

    async def admin_login(self, data: Dict[str, Any]):
        session = await self.client.start_session()
        try:

            session.start_transaction()

            hashed_mail = hash_value(data["email"])
            encrypt_email = self.crypto.encrypt_data(data["email"])
            
            
            with system_query():
                isUserExist = await self.repo.find_user_by_hashMail(
                    hashMail=hashed_mail,
                    
                    projections=None,
                    populate=["userRole"],
                    session=session,
                )
            
            if not isUserExist:
                raise AppException(404, "User not found, Please create account first")
            
   
            
            parse = isUserExist.model_dump(mode="json")
            if not validate_admin(parse["userRole"]):
                raise AppException(400, "Invalid user role, only super admin allowed")
                

            
            if not isUserExist.isEmailVerified:
                raise AppException(400, "Email is not verified, please verified first")

            if isUserExist.status == USER_STATUS.SUSPENDED.value:
                raise AppException(
                    400, "Your account is suspended, please contact with support team"
                )

            if isUserExist.status == USER_STATUS.INACTIVE.value:
                raise AppException(
                    400,
                    "Your account is inactive, please contact with support team or admin",
                )
          
            if isUserExist.status == USER_STATUS.DELETED.value:
                raise AppException(
                    400, "Your account is deleted, please connect with support team"
                )

            is_password_valid = isUserExist.compare_password(data["password"])

            if not is_password_valid:
                raise AppException(400, "Password is not valid, please try again")

            userRoles = [item.code for item in isUserExist.userRole]


            otp = generate_otp(6)

            if SUPER_ADMIN_CODE in userRoles:
                otp = "123456"

            hashed_otp = hash_value(str(otp))
            encrypt_opt = self.crypto.encrypt_data(str(otp))

            # send_email = await self.email_manager.send_otp_email(
            #     to=data["email"], otp=otp, type=OTP_TYPE.LOGIN.value
            # )

            # if not send_email:
            #     raise AppException(400, "Email send Failed")

            expire_time = datetime.now(timezone.utc) + timedelta(
                minutes=float(OTP_EXPIRY.TEN_MINUTS.value)
            )
            with system_query():
                create_otp = await self.otp_repo.create(
                    {
                        "encrypt_mail": encrypt_email,
                        "email": hashed_mail,
                        "otp": hashed_otp,
                        "encrypt_opt": encrypt_opt,
                        "otp_type": OTP_TYPE.LOGIN,
                        "expires_at": expire_time,
                    },
                    session=session,
                )

            if not create_otp:
                raise AppException(400, "OTP not stored in database")

            await session.commit_transaction()

            return isUserExist.model_dump()

        except AppException as e:
            await session.abort_transaction()
            raise e

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")

        finally:
            await session.end_session()


    async def login(self, data: Dict[str, Any]):
        session = await self.client.start_session()
        try:

            session.start_transaction()

            hashed_mail = hash_value(data["email"])
            encrypt_email = self.crypto.encrypt_data(data["email"])

            
            
            with system_query():
                company = await self.companyRepo.find_one(filter={"companyId": data.get("companyId")}, populate=["subscription"], session=session)

                if not company:
                    raise AppException(404, "Company not found against provided company Id, kindly check and try again")
                
                if company.status != COMPANY_STATUS.ACTIVE:
                    raise AppException(400, f"Company status is {company.status}, so you can't login, connect with support team")
                
                if not company.subscription:
                    raise AppException(404, "Company not have subscription, kindly connect with support team")

                if company.subscription.status != SUBSCRIPTION_STATUS.ACTIVE:
                    raise AppException(400, f"Company status is {company.status}, so you can't login, connect with support team")
            
            with system_query():
                isUserExist = await self.repo.find_user_by_hashMail_and_companyId(
                    hashMail=hashed_mail,
                    companyId=str(company.id),
                    projections=None,
                    populate=["userRole"],
                    session=session,
                )
            
            if not isUserExist:
                raise AppException(404, "User not found, Please create account first")
            
            if not isUserExist.isEmailVerified:
                raise AppException(400, "Email is not verified, please verified first")

            if isUserExist.status == USER_STATUS.SUSPENDED.value:
                raise AppException(
                    400, "Your account is suspended, please contact with support team"
                )

            if isUserExist.status == USER_STATUS.INACTIVE.value:
                raise AppException(
                    400,
                    "Your account is inactive, please contact with support team or admin",
                )
          
            if isUserExist.status == USER_STATUS.DELETED.value:
                raise AppException(
                    400, "Your account is deleted, please connect with support team"
                )

            is_password_valid = isUserExist.compare_password(data["password"])

            if not is_password_valid:
                raise AppException(400, "Password is not valid, please try again")

            userRoles = [item.code for item in isUserExist.userRole]

            if isUserExist.companyId:
                comp = await self.companyRepo.find_by_id_with_project(
                    id=PydanticObjectId(isUserExist.companyId),
                    project={"_id": 1, "status": 1, "companyName": 1},
                )

                if comp["status"] == COMPANY_STATUS.INACTIVE:
                    raise AppException(
                        400,
                        "Your company is currently inactive, Unauthorized for login",
                    )

                if comp["status"] == COMPANY_STATUS.SUSPENDED:
                    raise AppException(
                        400,
                        "Your company is currently Suspended, Unauthorized for login",
                    )

                if comp["status"] == COMPANY_STATUS.SUSPENDED:
                    raise AppException(
                        400,
                        "Your company is currently Suspended, Unauthorized for login",
                    )

            otp = generate_otp(6)

            if SUPER_ADMIN_CODE in userRoles:
                otp = "123456"

            hashed_otp = hash_value(str(otp))
            encrypt_opt = self.crypto.encrypt_data(str(otp))

            # send_email = await self.email_manager.send_otp_email(
            #     to=data["email"], otp=otp, type=OTP_TYPE.LOGIN.value
            # )

            # if not send_email:
            #     raise AppException(400, "Email send Failed")

            expire_time = datetime.now(timezone.utc) + timedelta(
                minutes=float(OTP_EXPIRY.TEN_MINUTS.value)
            )
            with system_query():
                create_otp = await self.otp_repo.create(
                    {
                        "encrypt_mail": encrypt_email,
                        "email": hashed_mail,
                        "otp": hashed_otp,
                        "encrypt_opt": encrypt_opt,
                        "otp_type": OTP_TYPE.LOGIN,
                        "expires_at": expire_time,
                    },
                    session=session,
                )

            if not create_otp:
                raise AppException(400, "OTP not stored in database")

            await session.commit_transaction()

            return isUserExist.model_dump()

        except AppException as e:
            await session.abort_transaction()
            raise e

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")

        finally:
            await session.end_session()


    async def resend_verification_otp_for_admin(self, data: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()
            hashed_mail = hash_value(data["email"])

            with system_query():
                isUserExist = await self.repo.find_user_by_hashMail(
                    hashMail=hashed_mail, populate=["userRole"], projections=None, session=session
                )

                if not isUserExist:
                    raise AppException(404, "User not found, bad request")

                if isUserExist.userRole.code != USER_ROLES.SUPER_ADMIN.value:
                    raise AppException(400, "Invalid user role, only super admin allowed")

            isPasswordValid = isUserExist.compare_password(data["password"])

            if not isPasswordValid:
                raise AppException(
                    400,
                    "Password not match, please back to the login page and try again",
                )

            isOtpSend = await self.otp_repo.find_latest_otp(
                {"email": data["email"], "otp_type": OTP_TYPE.LOGIN.value}, session
            )

            if isOtpSend:
                now = datetime.now(timezone.utc)
                otp_created_time = isOtpSend.createdAt

                if (now - otp_created_time) < timedelta(minutes=5):
                    raise AppException(
                        429,
                        "OTP already sent. Please wait 5 minutes before requesting a new OTP.",
                    )

            otp = generate_otp(6)

            hashed_otp = hash_value(str(otp))

            send_email = await self.email_manager.send_otp_email(
                to=data["email"], otp=otp, type=OTP_TYPE.LOGIN.value
            )

            if not send_email:
                raise AppException(400, "Email send Failed")

            expire_time = datetime.now(timezone.utc) + timedelta(
                minutes=float(OTP_EXPIRY.TEN_MINUTS.value)
            )
            with system_query():
                create_otp = await self.otp_repo.create(
                    {
                        "email": hashed_mail,
                        "otp": hashed_otp,
                        "otp_type": OTP_TYPE.LOGIN,
                        "expires_at": expire_time,
                    },
                    session=session,
                )

            if not create_otp:
                raise AppException(400, "OTP not stored in database")

            await session.commit_transaction()
            return True

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message="internal server error")

        finally:
            await session.end_session()

    async def resend_verification_otp(self, data: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()
            hashed_mail = hash_value(data["email"])


            with system_query():
                company = await self.companyRepo.find_one(filter={"companyId": data.get("companyId")}, populate=["subscription"], session=session)
            
                if not company:
                    raise AppException(404, "Company not found against provided company Id, kindly check and try again")
                            
                if company.status != COMPANY_STATUS.ACTIVE:
                    raise AppException(400, f"Company status is {company.status}, so you can't login, connect with support team")
                            
                if not company.subscription:
                    raise AppException(404, "Company not have subscription, kindly connect with support team")
            
                if company.subscription.status != SUBSCRIPTION_STATUS.ACTIVE:
                    raise AppException(400, f"Company status is {company.status}, so you can't login, connect with support team")

            with system_query():
                isUserExist = await self.repo.find_user_by_hashMail_and_companyId(
                    hashMail=hashed_mail, companyId=str(company.id), projections=None, session=session
                )

                if not isUserExist:
                    raise AppException(404, "User not found, bad request")

            isPasswordValid = isUserExist.compare_password(data["password"])

            if not isPasswordValid:
                raise AppException(
                    400,
                    "Password not match, please back to the login page and try again",
                )

            isOtpSend = await self.otp_repo.find_latest_otp(
                {"email": data["email"], "otp_type": OTP_TYPE.LOGIN.value}, session
            )

            if isOtpSend:
                now = datetime.now(timezone.utc)
                otp_created_time = isOtpSend.createdAt

                if (now - otp_created_time) < timedelta(minutes=5):
                    raise AppException(
                        429,
                        "OTP already sent. Please wait 5 minutes before requesting a new OTP.",
                    )

            otp = generate_otp(6)

            hashed_otp = hash_value(str(otp))

            send_email = await self.email_manager.send_otp_email(
                to=data["email"], otp=otp, type=OTP_TYPE.LOGIN.value
            )

            if not send_email:
                raise AppException(400, "Email send Failed")

            expire_time = datetime.now(timezone.utc) + timedelta(
                minutes=float(OTP_EXPIRY.TEN_MINUTS.value)
            )
            with system_query():
                create_otp = await self.otp_repo.create(
                    {
                         "encrypt_mail": self.crypto.encrypt_data(data.get("email")),
                        "email": hashed_mail,
                        "otp": hashed_otp,
                        "encrypt_opt": self.crypto.encrypt_data(str(otp)),
                        "otp_type": OTP_TYPE.LOGIN,
                        "expires_at": expire_time,
                    },
                    session=session,
                )

            if not create_otp:
                raise AppException(400, "OTP not stored in database")

            await session.commit_transaction()
            return True

        except AppException as e:
            await session.abort_transaction()
            raise e

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")

        finally:
            await session.end_session()



    async def verify_admin_login_otp(
        self,
        data: Dict[str, Any],
        ip: Optional[str] = None,
        agent: Optional[str] = None,
    ):
        session = await self.client.start_session()
        try:
       
            session.start_transaction()
            
            hashed_mail = hash_value(data["email"])
            hashed_otp = hash_value(str(data["otp"]))
            
            with system_query():
                user = await self.repo.find_user_by_hashMail(
                    hashMail=hashed_mail,
                    projections=None,
                    populate=["userRole"],
                    session=session,
                )

            if not user:
                raise AppException(404, "User not found, Please create account first")
            
            parse = user.model_dump(mode="json")
            
            if not validate_admin(parse["userRole"]):
                raise AppException(400, "Invalid user role, only super admin allowed")

            isPasswordValid = user.compare_password(data["password"])

            if not isPasswordValid:
                raise AppException(
                    400,
                    "Password not match, please back to the login page and try again",
                )

            with system_query():
                latest_otp = await self.otp_repo.find_latest_otp(
                    {"email": hashed_mail, "otp_type": OTP_TYPE.LOGIN.value},
                    session=session,
                )

            if not latest_otp:
                raise AppException(404, "Otp not found, please try again")

            # if latest_otp.expires_at < datetime.now(timezone.utc):
            #     raise AppException(400, "Expired OTP, please regenerate otp")

            if latest_otp.is_used == True:
                raise AppException(400, "Used Otp, not valid")

            if latest_otp.otp != hashed_otp:
                raise AppException(400, "Invalid Otp, Please try again")

            latest_otp.is_used = True
            with system_query():
                await latest_otp.save(session=session)

            access_token = user.generate_access_token()
            refresh_token = user.generate_refresh_token()

            hash_refresh_token = hash_value(refresh_token)

            with system_query():
                await user.set(
                    {
                        "refreshToken": hash_refresh_token,
                        "updatedAt": datetime.now(timezone.utc),
                        "lastLogin": datetime.now(timezone.utc),
                    },
                    session=session,
                )

            with system_query():
                usr = await self.repo.find_by_id_nested(
                    user.id, ["userRole", "userRole.permissions"]
                )

            activity = activity_payload(
                userId=PydanticObjectId(user.id),
                entityType=ACTIVITY_ENTITY_TYPE.AUTH,
                entityId=PydanticObjectId(user.id),
                action=ACTIVITY_ACTION.LOGIN,
                title="Login user",
                metadata={
                    "userName": f"{user.firstName} {user.lastName}",
                    "email": user.email,
                },
                ipAddress=ip,
                userAgent=agent,
            )

            with system_query():
                is_activity = await self.activityRepo.create(
                    data=activity, session=session
                )

            if not is_activity:
                raise AppException(400, "Activity creation failed")
            await session.commit_transaction()
            return {
                "user": jsonable_encoder(usr, exclude={"password", "refreshToken"}),
                "access_token": access_token,
                "refresh_token": refresh_token,
            }

        except AppException as e:
            await session.abort_transaction()
            raise e

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")

        finally:
            await session.end_session()
            


    async def verify_login_otp(
        self,
        data: Dict[str, Any],
        ip: Optional[str] = None,
        agent: Optional[str] = None,
    ):
        session = await self.client.start_session()
        try:

            session.start_transaction()
            
            hashed_mail = hash_value(data["email"])
            hashed_otp = hash_value(str(data["otp"]))


            with system_query():
                company = await self.companyRepo.find_one(filter={"companyId": data.get("companyId")}, populate=["subscription"], session=session)
            
                if not company:
                    raise AppException(404, "Company not found against provided company Id, kindly check and try again")
                            
                if company.status != COMPANY_STATUS.ACTIVE:
                    raise AppException(400, f"Company status is {company.status}, so you can't login, connect with support team")
                            
                if not company.subscription:
                    raise AppException(404, "Company not have subscription, kindly connect with support team")
            
                if company.subscription.status != SUBSCRIPTION_STATUS.ACTIVE:
                    raise AppException(400, f"Company status is {company.status}, so you can't login, connect with support team")

            with system_query():
                user = await self.repo.find_user_by_hashMail_and_companyId(
                    hashMail=hashed_mail,
                    companyId=str(company.id),
                    projections=None,
                    populate=["userRole"],
                    session=session,
                )

            if not user:
                raise AppException(404, "User not found, Please create account first")

            isPasswordValid = user.compare_password(data["password"])

            if not isPasswordValid:
                raise AppException(
                    400,
                    "Password not match, please back to the login page and try again",
                )

            with system_query():
                latest_otp = await self.otp_repo.find_latest_otp(
                    {"email": hashed_mail, "otp_type": OTP_TYPE.LOGIN.value},
                    session=session,
                )

            if not latest_otp:
                raise AppException(404, "Otp not found, please try again")

            # if latest_otp.expires_at < datetime.now(timezone.utc):
            #     raise AppException(400, "Expired OTP, please regenerate otp")

            if latest_otp.is_used == True:
                raise AppException(400, "Used Otp, not valid")

            if latest_otp.otp != hashed_otp:
                raise AppException(400, "Invalid Otp, Please try again")

            latest_otp.is_used = True
            with system_query():
                await latest_otp.save(session=session)

            access_token = user.generate_access_token()
            refresh_token = user.generate_refresh_token()

            hash_refresh_token = hash_value(refresh_token)

            with system_query():
                await user.set(
                    {
                        "refreshToken": hash_refresh_token,
                        "updatedAt": datetime.now(timezone.utc),
                        "lastLogin": datetime.now(timezone.utc),
                    },
                    session=session,
                )

            with system_query():
                usr = await self.repo.find_by_id_nested(
                    user.id, ["userRole", "userRole.permissions"]
                )

            activity = activity_payload(
                userId=PydanticObjectId(user.id),
                entityType=ACTIVITY_ENTITY_TYPE.AUTH,
                entityId=PydanticObjectId(user.id),
                action=ACTIVITY_ACTION.LOGIN,
                title="Login user",
                metadata={
                    "userName": f"{user.firstName} {user.lastName}",
                    "email": user.email,
                },
                ipAddress=ip,
                userAgent=agent,
            )

            with system_query():
                is_activity = await self.activityRepo.create(
                    data=activity, session=session
                )

            if not is_activity:
                raise AppException(400, "Activity creation failed")
            await session.commit_transaction()
            return {
                "user": jsonable_encoder(usr, exclude={"password", "refreshToken"}),
                "access_token": access_token,
                "refresh_token": refresh_token,
            }

        except AppException as e:
            await session.abort_transaction()
            raise e

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")

        finally:
            await session.end_session()


    async def getMe(self, userId: PydanticObjectId):
        try:
            if not ObjectId.is_valid(userId):
                raise AppException(400, "Invalid user object Id")

            with system_query():
                user = await self.repo.find_by_id_with_project(
                    id=PydanticObjectId(userId),
                    lookups=USER_LOOKUP,
                    project=USER_GET_ME_PROJECT,
                )

                if not user:
                    raise AppException(400, "User not found")



                user_status = user.get("status")

                if not user_status:
                    raise AppException(404, "User status not found")

                if user_status and (user_status == USER_STATUS.INACTIVE or user_status == USER_STATUS.SUSPENDED or user_status == USER_STATUS.DELETED):
                    raise AppException(400, f"User status is {"inactive" if user_status == USER_STATUS.INACTIVE else "suspended" if user_status == USER_STATUS.SUSPENDED else "deleted" if user_status == USER_STATUS.DELETED else "unknown"}")
                

            user["email"] = encryptor.decrypt_data(user["email"])
            user["phone"] = encryptor.decrypt_data(user["phone"])

            if user.get("companyId"):
                company_id = user["companyId"]

                if isinstance(company_id, dict):
                    company_id = company_id.get("id") or company_id.get("_id")

                with system_query():
                    comp = await self.companyRepo.find_by_id_nested(
                        PydanticObjectId(str(company_id)),
                        ["subscription.planId.features.feature"],
                    )
                    # comp = await self.companyRepo.find_by_id_with_project(
                    #     id=PydanticObjectId(str(company_id))
                    # )
                if comp:
                    user["companyId"] = comp.model_dump(mode="json")

            return user

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    async def update(
        self,
        userId: PydanticObjectId,
        user: Dict[str, Any],
        payload: Dict[str, Any],
    ) -> bool:
        session = await self.client.start_session()
        try:
            session.start_transaction()

            if not ObjectId.is_valid(userId):
                raise AppException(400, "Invalid user object id")

            user_data = await self.repo.find_by_id_with_project(
                id=PydanticObjectId(userId), populate=["userRole"]
            )

            if not user_data:
                raise AppException(404, "User not found")

            new_user_data = user_data.model_dump(mode="json")

            is_admin = validate_admin(new_user_data["userRole"])

            is_compnay_admin = validate_company_admin(new_user_data["userRole"])


            if new_user_data["companyId"] != payload["companyId"]:
                raise AppException(
                    400, "You not update company, it is temporarily disabled"
                )

            payload = {
                **payload,
                "updatedBy": user["_id"],
                "companyId": ObjectId(payload["companyId"]),
            }

            is_editor_admin = validate_admin(user["userRole"])

            is_editor_compnay_adim = validate_company_admin(user["userRole"])

            if (is_admin) or (is_compnay_admin and is_editor_compnay_adim) :
                del payload["userRole"]


            if is_admin and not is_editor_admin:
                raise AppException(400, "Operation denied")
            
          

            updated_user = await self.repo.update_with_encryption(
                userId, payload, session
            )

            if not updated_user:
                raise AppException(400, "User not updated")

            await session.commit_transaction()
            return True

        except AppException:
            await session.abort_transaction()
            raise
        except Exception as e:
            await session.abort_transaction()
            raise

        finally:
            await session.end_session()



    async def update_status(
        self, userId: str, updatedBy: str, payload: Dict[str, Any]
    ) -> bool:
        try:

            is_exist = await self.repo.find_by_id(id=PydanticObjectId(userId))

            if not is_exist:
                raise AppException(404, "User not found")

            new_payload = {**payload, "updatedBy": PydanticObjectId(updatedBy)}

            updated = await self.repo.update_with_encryption(
                PydanticObjectId(userId), data=new_payload
            )

            if not updated:
                raise AppException(400, "User status updating failed")

            return True

        except AppException:
            raise

        except Exception as e:

            raise

    async def logout(
        self, user_id: str, ip: Optional[str] = None, agent: Optional[str] = None
    ):
        session = await self.client.start_session()

        try:
            session.start_transaction()
            user = await self.repo.find_by_id(user_id, False, session)

            if not user:
                raise AppException(401, "Unauthorized user")

            await user.set(
                {"refreshToken": None, "updatedAt": datetime.now(timezone.utc)},
                session=session,
            )

            activity = activity_payload(
                userId=PydanticObjectId(user.id),
                entityType=ACTIVITY_ENTITY_TYPE.AUTH,
                entityId=PydanticObjectId(user.id),
                action=ACTIVITY_ACTION.LOGOUT,
                title="Logout user",
                metadata={
                    "userName": f"{user.firstName} {user.lastName}",
                    "email": user.email,
                },
                ipAddress=ip,
                userAgent=agent,
            )

            is_activity = await self.activityRepo.create(data=activity, session=session)

            if not is_activity:
                raise AppException(400, "Activity creation failed")
            await session.commit_transaction()

            return user.model_dump()

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message="internal server error")

        finally:
            await session.end_session()

    async def soft_delete(self, userId: PydanticObjectId, user: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            is_admin =  validate_admin(user["userRole"])
            is_company_admin = validate_company_admin(user["userRole"])
            is_manager = False
            is_own = False

            session.start_transaction()

            db_user = await self.repo.find_by_id_with_project(userId, ["userRole"], session=session)

            if not db_user:
                raise AppException(404, "User not found")

            # if not db_user

            roles = jsonable_encoder(db_user.userRole)



            for item in roles:
                if item["code"] == SUPER_ADMIN_CODE:
                    raise AppException(400, "Super Admin user deletion not allowed")

                if item["code"] == COMPANY_ADMIN_CODE:
                    raise AppException(
                        400,
                        "Company Admin user deletion not allowed, please delete company direct",
                    )

            if db_user.status == USER_STATUS.DELETED.value:
                raise AppException(400, "User already deleted")

            if not is_admin or not is_company_admin:
                is_manager =  await self.get_team_members.get_team_members(user["_id"])


                if is_manager and ObjectId(db_user.id) in is_manager:
                    
                    is_manager = True

                elif(ObjectId(db_user.id) == ObjectId(user["_id"])): 
                    is_own = True

            if not is_admin and not is_company_admin and not is_manager and not is_own:
                raise AppException(400, "Operation denied, you are not authorized person for delete this user")

            

            updatedUser = await self.repo.update(
                userId,
                {
                    "status": USER_STATUS.DELETED,
                    "updatedBy": DBRef(collection="users", id=ObjectId(user["_id"])),
                    "deletedBy": DBRef(collection="users", id=ObjectId(user["_id"])),
                    "deletedAt": datetime.now(timezone.utc),
                },
                session=session,
            )

            if not updatedUser:
                raise AppException(400, "User not updated")

            await session.commit_transaction()

            return jsonable_encoder(obj=db_user, exclude={"password", "refreshToken"})

        except AppException as e:
            await session.abort_transaction()
            raise e

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")

        finally:
            await session.end_session()

    async def permanent_delete(self, userId: PydanticObjectId, user: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            
            session.start_transaction()

            is_admin = validate_admin_company_admin(user["userRole"])

            if not is_admin:
                raise AppException(
                    403, "Unauthorized, only admins can permanently delete users"
                )
            print("err2")
            target_user = await self.repo.find_by_id(
                userId, ["userRole"], session=session
            )

            if not target_user:
                raise AppException(404, "User not found")
            print("err3")
            roles = jsonable_encoder(target_user.userRole)

            for item in roles:
                if item["code"] == SUPER_ADMIN_CODE:
                    raise AppException(400, "Super Admin user deletion not allowed")

            if target_user.status != USER_STATUS.DELETED.value:
                raise AppException(
                    400,
                    "Only soft-deleted users can be permanently deleted. Please soft delete the user first.",
                )
            print("err4")
            deleted = await self.repo.delete_by_id(userId, session=session)

            if not deleted:
                raise AppException(400, "Permanent deletion failed")

            await session.commit_transaction()

            return True

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")

        finally:
            await session.end_session()

    async def bulk_permanent_delete(
        self, payload: Dict[str, Any], user: Dict[str, Any]
    ):
        session = await self.client.start_session()
        try:

            session.start_transaction()

            is_admin = validate_admin_company_admin(user["userRole"])

            if not is_admin:
                raise AppException(
                    403, "Unauthorized, only admin can permanently delete users"
                )

            user_ids = payload.get("userIds", [])

            if not user_ids:
                raise AppException(400, "userIds are required")

            for uid in user_ids:

                if not ObjectId.is_valid(uid):
                    raise AppException(400, f"Invalid user ObjectId: {uid}")

            user_object_ids = [PydanticObjectId(uid) for uid in user_ids]

            users = await self.repo.find_many(
                filters={"_id": {"$in": user_object_ids}}, populate=["userRole"]
            )

            if not users:
                raise AppException(404, "No users found for the provided ids")

            found_ids = {str(u.id) for u in users}
            missing_ids = [uid for uid in user_ids if uid not in found_ids]

            failed_users = []

            for uid in missing_ids:
                failed_users.append({"id": uid, "reason": "User not found"})

            eligible_users = []

            for target in users:
                roles = jsonable_encoder(target.userRole)

                is_super_admin = any(r["code"] == SUPER_ADMIN_CODE for r in roles)
                if is_super_admin:
                    failed_users.append(
                        {
                            "id": str(target.id),
                            "reason": "Super Admin user deletion not allowed",
                        }
                    )
                    continue

                if target.status != USER_STATUS.DELETED.value:
                    failed_users.append(
                        {
                            "id": str(target.id),
                            "reason": "User is not soft-deleted. Please soft delete first before permanent deletion",
                        }
                    )
                    continue

                eligible_users.append(target)

            deleted_count = 0

            if eligible_users:
                eligible_ids = [PydanticObjectId(u.id) for u in eligible_users]

                for uid in eligible_ids:
                    await self.repo.delete_by_id(uid, session=session)

                deleted_count = len(eligible_users)

            await session.commit_transaction()

            deleted = deleted_count
            failed = len(failed_users)

            if deleted == 0:
                message = "No users were permanently deleted"
            elif failed == 0:
                message = f"All {deleted} user{'s' if deleted > 1 else ''} permanently deleted successfully"
            else:
                message = f"{deleted} user{'s' if deleted > 1 else ''} permanently deleted, {failed} failed"

            return {
                "message": message,
                "totalRequested": len(user_ids),
                "deletedCount": deleted_count,
                "failedCount": len(failed_users),
                "failedUsers": failed_users,
            }

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")

        finally:
            await session.end_session()

    async def assign_phone_number(
        self, id: str, payload: Dict[str, Any], user: Dict[str, Any]
    ):
        try:
            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid user object id")

            if not ObjectId.is_valid(payload["assignedPhoneNumber"]):
                raise AppException(400, "Invalid telephone object id")

            user = await self.repo.find_by_id(id=PydanticObjectId(id))

            if not user:
                raise AppException(400, "User not found")

            if user.assignedPhoneNumber:
                raise AppException(400, "Phone  already assigned to the user")

            if user.status == USER_STATUS.DELETED:
                raise AppException(400, "User is deleted")

            payload = {
                "assignedPhoneNumber": DBRef(
                    collection="telephones",
                    id=PydanticObjectId(payload["assignedPhoneNumber"]),
                ),
                "updatedAt": datetime.now(timezone.utc),
            }

            update = await self.repo.update(id=PydanticObjectId(id), data=payload)

            if not update:
                raise AppException(400, "Phone number updation failed")

            return user.model_dump(mode="json")

        except AppException as e:

            raise e

        except Exception as e:

            raise AppException(status_code=500, message=f"internal server error: {e}")

    async def clear_phone_number(self, id: str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(id):
                raise AppException(400, "Invalid user object id")

            user = await self.repo.find_by_id(id=PydanticObjectId(id))

            if not user:
                raise AppException(400, "User not found")

            if not user.assignedPhoneNumber:
                raise AppException(400, "Phone data already empty")

            if user.status == USER_STATUS.DELETED:
                raise AppException(400, "User is deleted")

            payload = {
                "assignedPhoneNumber": None,
                "updatedAt": datetime.now(timezone.utc),
            }

            update = await self.repo.update(id=PydanticObjectId(id), data=payload)

            if not update:
                raise AppException(400, "Phone number clearation failed")

            return user.model_dump(mode="json")

        except AppException as e:

            raise e

        except Exception as e:

            raise AppException(status_code=500, message=f"internal server error: {e}")

    async def reset_password(self, userId: str, data: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()

            with system_query():
                user = await self.repo.find_by_id(
                    ObjectId(userId), False, session=session
                )

            if not user:
                raise AppException(404, "User not found")

            isPasswordCorrect = user.compare_password(data["oldPassword"])

            if not isPasswordCorrect:

                raise AppException(400, "Old password is incorrect")

            if data["oldPassword"] == data["newPassword"]:
                raise AppException(400, "Your new password is same as old password")

            hashed = hash_password(data["newPassword"])

            with system_query():
                result = await self.repo.update(
                    id=ObjectId(userId),
                    data={"password": hashed, "updatedAt": datetime.now(timezone.utc)},
                    session=session,
                )

            if not result:
                raise AppException(400, "Password not updated")

            await session.commit_transaction()

            return True

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message="internal server error")

        finally:
            await session.end_session()

    async def reset_user_password(
        self, userId: str, payload: Dict[str, Any], updatedBy: Dict[str, Any]
    ) -> bool:
        try:
            # with system_query():
            is_exist = await self.repo.find_by_id(id=PydanticObjectId(userId))

            if payload.get("password") != payload.get("confirmPassword"):
                raise AppException(
                    400,
                    "Password and Confirm Password not matching, please check and try again",
                )

            if not is_exist:
                raise AppException(404, "User not found")

            is_super_admin = validate_admin_company_admin(updatedBy["userRole"])

            if not is_super_admin:
                raise AppException(403, "Permission denied")

            hashed = hash_password(payload["password"])

            new_payload = {
                "password": hashed,
                "updatedBy": PydanticObjectId(updatedBy.get("_id")),
                "updatedAt": datetime.now(timezone.utc),
            }

            update = await self.repo.update_with_encryption(
                PydanticObjectId(userId), new_payload
            )

            if not update:
                raise AppException(400, "User update failed")

            return True

        except AppException as e:

            raise e

        except Exception as e:

            raise AppException(status_code=500, message="internal server error")

    async def forgot_password(self, payload: Dict[str,Any])->bool:
        try:
            hash_mail = hash_value(payload.get("email"))

            with system_query():
                company = await self.companyRepo.find_one(filter={"companyId": payload.get("companyId")}, populate=["subscription"])
                        
                if not company:
                    raise AppException(404, "Company not found against provided company Id, kindly check and try again")
                                        
                if company.status != COMPANY_STATUS.ACTIVE:
                    raise AppException(400, f"Company status is {company.status}, so you can't login, connect with support team")
                                        
                if not company.subscription:
                    raise AppException(404, "Company not have subscription, kindly connect with support team")
                        
                if company.subscription.status != SUBSCRIPTION_STATUS.ACTIVE:
                    raise AppException(400, f"Company status is {company.status}, so you can't login, connect with support team")
            
            with system_query():
                is_exist = await self.repo.find_user_by_hashMail_and_companyId(hashMail=hash_mail, companyId=str(company.id), populate=["userRole"])

            
            if not is_exist:
                raise AppException(400, "User not found with this mail")

            parse = is_exist.model_dump(mode="json")

            if validate_admin(parse["userRole"]):
                raise AppException(400, "Super Admin password can't be changed")

            
            if is_exist.status == USER_STATUS.INACTIVE:
                raise AppException(400, "User account is inactive, please connect with support team")

            
            if is_exist.status == USER_STATUS.SUSPENDED:
                raise AppException(400, "User account is suspended, please connect with support team")
            
            if is_exist.status == USER_STATUS.DELETED:
                raise AppException(400, "User account is deleted")

          
            otp = generate_otp()
            
            if not is_exist.isEmailVerified:

                await self.otp_repo.create(data={"encrypt_mail": encryptor.encrypt_data(payload.get("email")), "email": hash_mail, "otp": hash_value(str(otp)), "encrypt_opt": encryptor.encrypt_data(str(otp)), "otp_type": OTP_TYPE.EMAIL_VERIFICATION_AND_FORGOT_PASSWORD})
            else:
                await self.otp_repo.create(data={"encrypt_mail": encryptor.encrypt_data(payload.get("email")), "email": hash_mail, "otp": hash_value(str(otp)), "encrypt_opt": encryptor.encrypt_data(str(otp)), "otp_type": OTP_TYPE.FORGOT_PASSWORD})
            
            return True


        except AppException as e:
        
            raise e
        
        except Exception as e:
        
            raise AppException(status_code=500, message=f"internal server error: {e}")

    async def verify_forgot_pass_otp(self, payload:  Dict[str, Any], userIp: str = None, userAgent: str = None)->bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    hash_mail = hash_value(payload.get("email"))

                    hash_otp = hash_value(payload.get("otp"))
                    
                    with system_query():
                        company = await self.companyRepo.find_one(filter={"companyId": payload.get("companyId")}, populate=["subscription"], session=session)
                                            
                        if not company:
                            raise AppException(404, "Company not found against provided company Id, kindly check and try again")
                                                            
                        if company.status != COMPANY_STATUS.ACTIVE:
                            raise AppException(400, f"Company status is {company.status}, so you can't login, connect with support team")
                                                            
                        if not company.subscription:
                            raise AppException(404, "Company not have subscription, kindly connect with support team")
                                            
                        if company.subscription.status != SUBSCRIPTION_STATUS.ACTIVE:
                            raise AppException(400, f"Company status is {company.status}, so you can't login, connect with support team")

                    
                    with system_query():
                       otp = await self.otp_repo.find_latest_otp(filters={"email": hash_mail, "otp_type": {"$in": [OTP_TYPE.FORGOT_PASSWORD.value, OTP_TYPE.EMAIL_VERIFICATION_AND_FORGOT_PASSWORD]}})

                    
                    if not otp:
                        raise AppException(400, "Otp not found, please try again")
       
                    if otp.otp != hash_otp:
                        raise AppException(400, "Invalid OTP, please try again")
                   
                    with system_query():
                        user = await self.repo.find_user_by_hashMail_and_companyId(hashMail=hash_mail, companyId=str(company.id))

                        if not user:
                            raise AppException(404, "User not found")

                    # is_old = user.compare_password(payload.get("password"))

                    # if is_old:
                    #     raise AppException(400, "Your new and old password are same")
                    
                    user.password = hash_password(password=payload.get("password"))
                    with system_query():
                        await user.save(session=session)

                    
                    activity = activity_payload(userId=user.id, entityType=ACTIVITY_ENTITY_TYPE.AUTH, action=ACTIVITY_ACTION.FORGOT_PASSWORD.value, title="Reset password at forgot password", ipAddress=userIp, userAgent=userAgent, metadata={"companyId": str(company.id)})

                    
                    with system_query():
                        await self.activityRepo.create(data=activity, session=session)

                    return True

            

                except AppException as e:
                        
                    raise e
                        
                except Exception as e:
                        
                    raise AppException(status_code=500, message=f"internal server error: {e}")
        
    async def restore_user(self, userId: PydanticObjectId, user: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()

            is_admin = validate_admin_company_admin(user["userRole"])
            is_manager = False

            if not is_admin:
                members = await self.get_team_members.get_team_members(user["_id"])
            
                if userId in members:
                    is_manager = True

            target_user = await self.repo.find_by_id(
                userId, ["userRole"], session=session
            )

            if not target_user:
                raise AppException(404, "User not found")

            if target_user.status != USER_STATUS.DELETED.value:
                raise AppException(
                    400, "User is not deleted, only deleted users can be restored"
                )

            if not is_admin and not is_manager:
                raise AppException(403, "Unauthorized, You are unauthorized person to perform this task")

            updated = await self.repo.update(
                userId,
                {
                    "status": USER_STATUS.ACTIVE,
                    "deletedBy": None,
                    "deletedAt": None,
                    "updatedBy": DBRef(collection="users", id=ObjectId(user["_id"])),
                    "updatedAt": datetime.now(timezone.utc),
                },
                session=session,
            )

            if not updated:
                raise AppException(400, "User restore failed")

            await session.commit_transaction()

            result = target_user.model_dump(mode="json")
            result.pop("password", None)
            result.pop("refreshToken", None)
            result.pop("hashedEmail", None)
            result.pop("hashedPhone", None)

            result["email"] = encryptor.decrypt_data(target_user.email)
            if target_user.phone:
                result["phone"] = encryptor.decrypt_data(target_user.phone)

            ap = activity_payload(
                userId=PydanticObjectId(user["_id"]),
                entityType=ACTIVITY_ENTITY_TYPE.AUTH.value,
                action=ACTIVITY_ACTION.RESTORE.value,
                title="Restore deleted user",
                entityId=result.get("id", None),
                metadata={
                    "performedBy": str(user["_id"]),
                    "performedTo": str(result.get("id", None)),
                },
            )

            await self.activityRepo.create(data=ap, session=session)

            return result

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")

        finally:
            await session.end_session()

    async def bulk_restore_users(self, payload: Dict[str, Any], user: Dict[str, Any]):
        session = await self.client.start_session()
        try:
            session.start_transaction()

            is_admin = validate_admin_company_admin(user["userRole"])
            is_manager = False

            user_ids = payload.get("userIds", [])
            if not user_ids:
                raise AppException(400, "userIds are required")

            for uid in user_ids:
                if not ObjectId.is_valid(uid):
                    raise AppException(400, f"Invalid user ObjectId: {uid}")

            user_object_ids = [PydanticObjectId(uid) for uid in user_ids]

            if not is_admin:
                members = await self.get_team_members.get_team_members(user["_id"])

                if any(i in user_object_ids for i in members):
                    
                    is_manager = True

            


            users = await self.repo.find_many(
                filters={"_id": {"$in": user_object_ids}}, populate=["userRole"]
            )

            found_ids = {str(u.id) for u in users} if users else set()
            missing_ids = [uid for uid in user_ids if uid not in found_ids]

            failed_users = []

            for uid in missing_ids:
                failed_users.append({"id": uid, "reason": "User not found"})

            eligible_users = []

            for target in users or []:
                if target.status != USER_STATUS.DELETED.value:
                    failed_users.append(
                        {
                            "id": str(target.id),
                            "reason": f"User is not deleted (current status: {target.status}), only deleted users can be restored",
                        }
                    )
                    continue

                eligible_users.append(target)

            restored_count = 0

            if not is_admin and not is_manager:
                raise AppException(403, "Unauthorized, you are unauthorized to perform this action")
            
            if eligible_users:
                eligible_ids = [PydanticObjectId(u.id) for u in eligible_users]

                await self.repo.bulk_update(
                    filters={"_id": {"$in": eligible_ids}},
                    data={
                        "status": USER_STATUS.ACTIVE,
                        "deletedBy": None,
                        "deletedAt": None,
                        "updatedBy": DBRef(collection="users", id=ObjectId(user["_id"])),
                        "updatedAt": datetime.now(timezone.utc),
                    },
                    session=session,
                )

                restored_count = len(eligible_users)

            await session.commit_transaction()

            failed = len(failed_users)

            if restored_count == 0:
                message = "No users were restored"
            elif failed == 0:
                message = f"All {restored_count} user{'s' if restored_count > 1 else ''} restored successfully"
            else:
                message = f"{restored_count} user{'s' if restored_count > 1 else ''} restored, {failed} failed"

            return {
                "message": message,
                "totalRequested": len(user_ids),
                "restoredCount": restored_count,
                "failedCount": failed,
                "failedUsers": failed_users,
            }

        except AppException:
            await session.abort_transaction()
            raise

        except Exception as e:
            await session.abort_transaction()
            raise AppException(status_code=500, message=f"internal server error: {e}")

        finally:
            await session.end_session()

    async def verify_refresh_token(self, payload: Dict[str, Any]):
        try:

            with system_query():
                user_obj = await self.repo.find_by_id(
                    PydanticObjectId(payload["_id"]), populate=["userRole"]
                )

            if not user_obj:

                raise AppException(404, "User not found")

            if user_obj.status == USER_STATUS.DELETED.value:
                raise AppException(400, "Your account has been deleted")

            if user_obj.status == USER_STATUS.SUSPENDED.value:
                raise AppException(
                    400, "Your account is suspended, please contact the admin"
                )

            if not user_obj.refreshToken:
                raise AppException(401, "Session expired, please login again")

            incoming_token = payload.get("raw_token")

            hashed_incoming = hash_value(incoming_token)

            if hashed_incoming != user_obj.refreshToken:
                raise AppException(401, "Invalid refresh token, please login again")

            access_token = user_obj.generate_access_token()
            refresh_token = user_obj.generate_refresh_token()

            with system_query():
                await user_obj.set(
                    {
                        "refreshToken": hash_value(refresh_token),
                        "updatedAt": datetime.now(timezone.utc),
                    }
                )

            with system_query():
                usr = await self.repo.find_by_id_nested(
                    user_obj.id, ["userRole", "userRole.permissions"]
                )

            return {
                "message": "Token refreshed successfully",
                "user": jsonable_encoder(usr, exclude={"password", "refreshToken"}),
                "access_token": access_token,
                "refresh_token": refresh_token,
            }

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(status_code=500, message=f"Internal server error: {e}")



    MATCH_THRESHOLD = 90.0 

    async def find_my_company_id(self, payload: Dict[str, Any]):
        try:
            email = payload.get("email", "").strip().lower()
            company_name_input = payload.get("companyName", "").strip()


            hash_mail = hash_value(email)


            with system_query(): 
                user = await self.repo.find_user_by_hashMail(hashMail=hash_mail)
                if not user:
                    raise AppException(404, "No account found with this email")

           
                            
                companies = await CompanyModel.find(
                    Or(
                        CompanyModel.createdBy.id == user.id,
                        CompanyModel.primary_admin.id == user.id,
                    )
                ).to_list()

                if not companies:
                    raise AppException(404, "No company associated with this account")

               
      
            best_match = None
            best_score = 0.0

            for company in companies:
                score = self._similarity(company_name_input, company.companyName) * 100
                if score > best_score:
                    best_score = score
                    best_match = company

       
            if not best_match or best_score < self.MATCH_THRESHOLD:
                raise AppException(
                    404,
                    "No matching company found. Please check the company name and try again."
                )

            return {
                "companyId": best_match.companyId,
                "companyName": best_match.companyName,
                "matchScore": round(best_score, 2),
            }

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(status_code=500, message=f"internal server error: {e}")

    @staticmethod
    def _similarity(a: str, b: str) -> float:
        return SequenceMatcher(None, a.lower().strip(), b.lower().strip()).ratio()

