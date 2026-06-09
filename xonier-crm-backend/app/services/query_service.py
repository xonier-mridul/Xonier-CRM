# app/services/query_service.py

from app.utils.custom_exception import AppException
from typing import Dict, Any, List
from app.repositories.query_repository import QueryRepository
from beanie import PydanticObjectId
from datetime import datetime, timezone


class QueryService:
    def __init__(self):
        self.repo = QueryRepository()

    # ─── Create ───────────────────────────────────────────────────────────────
    async def create(
        self,
        payload: Dict[str, Any],
        user: Dict[str, Any]
    ):
        try:
            data = {
                "name":          payload.get("name"),
                "email":         payload.get("email"),
                "phone":         payload.get("phone"),
                "address":       payload.get("address"),
                "industry_type": payload.get("industryType"),
                "company_name":  payload.get("companyName"),
                "team_size":     payload.get("teamSize"),
                "message":       payload.get("message"),
            }

            result = await self.repo.create(data=data)

            if not result:
                raise AppException(400, "Query registration failed, please try again")

            return result.model_dump(mode="json")

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    # ─── Get All ──────────────────────────────────────────────────────────────
    async def get_all(
        self,
        filters: Dict[str, Any],
        user: Dict[str, Any]
    ):
        try:
            query = {
                "deleted_at": None   # Exclude soft deleted
            }

            page  = int(filters.get("page")  or 1)
            limit = int(filters.get("limit") or 10)

            # ─── Search Filter ────────────────────────────────────────────────
            if filters.get("search") and filters["search"].strip():
                regex = {
                    "$regex":   filters["search"].strip(),
                    "$options": "i"
                }
                query["$or"] = [
                    {"name":         regex},
                    {"email":        regex},
                    {"phone":        regex},
                    {"company_name": regex},
                    {"address":      regex},
                    {"industry_type":regex},
                ]

            # ─── Name Filter ──────────────────────────────────────────────────
            if filters.get("name"):
                query["name"] = {
                    "$regex":   filters["name"],
                    "$options": "i"
                }

            # ─── Email Filter ─────────────────────────────────────────────────
            if filters.get("email"):
                query["email"] = {
                    "$regex":   filters["email"],
                    "$options": "i"
                }

            # ─── Company Filter ───────────────────────────────────────────────
            if filters.get("companyName"):
                query["company_name"] = {
                    "$regex":   filters["companyName"],
                    "$options": "i"
                }

            # ─── Industry Filter ──────────────────────────────────────────────
            if filters.get("industryType"):
                query["industry_type"] = {
                    "$regex":   filters["industryType"],
                    "$options": "i"
                }

            # ─── Team Size Filter ─────────────────────────────────────────────
            if filters.get("teamSize"):
                query["team_size"] = filters["teamSize"]

            # ─── Status Filter ────────────────────────────────────────────────
            if filters.get("status"):
                query["status"] = filters["status"]

            # ─── Date Range Filter ────────────────────────────────────────────
            if filters.get("fromDate") or filters.get("toDate"):
                date_filter = {}

                if filters.get("fromDate"):
                    try:
                        from_dt = datetime.fromisoformat(str(filters["fromDate"]))
                        from_dt = from_dt.replace(
                            hour=0, minute=0, second=0,
                            microsecond=0, tzinfo=timezone.utc
                        )
                        date_filter["$gte"] = from_dt
                    except (ValueError, TypeError):
                        raise AppException(
                            400,
                            "Invalid fromDate format. Use ISO format: YYYY-MM-DD"
                        )

                if filters.get("toDate"):
                    try:
                        to_dt = datetime.fromisoformat(str(filters["toDate"]))
                        to_dt = to_dt.replace(
                            hour=23, minute=59, second=59,
                            microsecond=999999, tzinfo=timezone.utc
                        )
                        date_filter["$lte"] = to_dt
                    except (ValueError, TypeError):
                        raise AppException(
                            400,
                            "Invalid toDate format. Use ISO format: YYYY-MM-DD"
                        )

                if date_filter:
                    query["created_at"] = date_filter

            # ─── Fetch From DB ─────────────────────────────────────────────────
            result = await self.repo.get_all_queries(
                page=page,
                limit=limit,
                filters=query,
            )

            if not result:
                raise AppException(404, "No queries found")

            return result

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    # ─── Delete ───────────────────────────────────────────────────────────────
    async def delete(
        self,
        query_id: str,
        user: Dict[str, Any]
    ):
        try:
            if not PydanticObjectId.is_valid(query_id):
                raise AppException(400, "Invalid query id")

            object_id = PydanticObjectId(query_id)

            # ─── Check If Exists ──────────────────────────────────────────────
            existing = await self.repo.find_one({
                "_id":        object_id,
                "deleted_at": None
            })

            if not existing:
                raise AppException(404, "Query not found")

            result = await self.repo.soft_delete(query_id=object_id)

            if not result:
                raise AppException(400, "Query deletion failed, please try again")

            return {"id": query_id}

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")

    # ─── Bulk Delete ──────────────────────────────────────────────────────────
    async def bulk_delete(
        self,
        ids: List[str],
        user: Dict[str, Any]
    ):
        try:
            # ─── Validate All IDs ─────────────────────────────────────────────
            invalid_ids = [
                id for id in ids
                if not PydanticObjectId.is_valid(id)
            ]

            if invalid_ids:
                raise AppException(
                    400,
                    f"Invalid query ids: {', '.join(invalid_ids)}"
                )

            object_ids = [PydanticObjectId(id) for id in ids]

            # ─── Check All Exist ──────────────────────────────────────────────
            existing_count = await self.repo.count(
                filter={
                    "_id":        {"$in": object_ids},
                    "deleted_at": None
                }
            )

            if existing_count == 0:
                raise AppException(404, "No queries found for given ids")

            if existing_count != len(ids):
                raise AppException(
                    400,
                    f"Some queries not found. Found {existing_count} of {len(ids)}"
                )

            deleted_count = await self.repo.bulk_soft_delete(ids=object_ids)

            return {
                "deletedCount": deleted_count,
                "requestedCount": len(ids)
            }

        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")