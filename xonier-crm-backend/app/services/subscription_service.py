from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.repositories.subscription_repository import SubscriptionRepository
from fastapi.encoders import jsonable_encoder
from datetime import datetime, time
from bson import ObjectId
from app.core.tenant import system_query

class SubscriptionService:
    def __init__(self):
        self.repo = SubscriptionRepository()

    def _parse_datetime(
        self,
        value: str,
        is_end: bool = False
    ) -> datetime:
        

        try:
            parsed_date = datetime.fromisoformat(value)

            
            if len(value) == 10:
                if is_end:
                    parsed_date = datetime.combine(
                        parsed_date.date(),
                        time(23, 59, 59)
                    )
                else:
                    parsed_date = datetime.combine(
                        parsed_date.date(),
                        time(0, 0, 0)
                    )

            return parsed_date

        except ValueError:
            raise AppException(
                400,
                f"Invalid datetime format: {value}"
            )

    def _apply_date_range_filter(
        self,
        query: Dict[str, Any],
        filters: Dict[str, Any],
        field_name: str,
    ):
        from_key = f"{field_name}From"
        to_key = f"{field_name}To"

        date_filter = {}

        if filters.get(from_key):
            date_filter["$gte"] = self._parse_datetime(
                filters[from_key]
            )

        if filters.get(to_key):
            date_filter["$lte"] = self._parse_datetime(
                filters[to_key],
                is_end=True
            )

        if date_filter:
            query[field_name] = date_filter

    async def getAll(
        self,
        filters: Dict[str, Any],
        user: Dict[str, Any]
    ):
        try:
            print("aaya")
            page = max(int(filters.get("page", 1)), 1)
            limit = max(int(filters.get("limit", 10)), 1)

            query: Dict[str, Any] = {
                "deletedAt": None
            }


            if filters.get("search") and filters["search"].strip():

                regex_data = {
                    "$regex": filters["search"].strip(),
                    "$options": "i"
                }

                query["$or"] = [
                    {"subscriptionId": regex_data},
                ]


            if filters.get("status"):
                query["status"] = filters["status"]


            if filters.get("billing"):
                query["billingCycle"] = filters["billing"]


            date_fields = [
                "startSubscriptionDate",
                "endSubscriptionDate",
                "trialStartDate",
                "trialEndDate",
                "cancelledAt",
                "createdAt",
            ]

            for field in date_fields:
                self._apply_date_range_filter(
                    query=query,
                    filters=filters,
                    field_name=field
                )
            with system_query(): 
                result = await self.repo.get_all(
                    page=page,
                    limit=limit,
                    filters=query,
                    populate=["planId", "companyId"]
                )

            if not result:
                raise AppException(
                    404,
                    "Subscription data not found"
                )

            return jsonable_encoder(result)

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(
                500,
                f"Internal server error: {str(e)}"
            )
        

    async def getById(
    self,
    id: str,
    user: Dict[str, Any]
):
        try:

           
            if not ObjectId.is_valid(id):
                raise AppException(
                    400,
                    "Invalid subscription id"
                )

            with system_query():
                subscription = await self.repo.find_by_id(
                    id=id,
                    # filters={
                    #     "deletedAt": None
                    # },
                    populate=["planId", "companyId"]
                )

            
            if not subscription:
                raise AppException(
                    404,
                    "Subscription not found"
                )

            

            return jsonable_encoder(subscription)

        except AppException:
            raise

        except Exception as e:
            raise AppException(
                500,
                f"Internal server error: {str(e)}"
            )