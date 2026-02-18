from typing import Dict, Any
from datetime import datetime, timezone
from beanie import PydanticObjectId
from app.utils.custom_exception import AppException
from app.utils.validate_admin import validate_admin
from app.repositories.activity_repository import ActivityRepository
from app.core.enums import ACTIVITY_ENTITY_TYPE, ACTIVITY_ACTION
from app.repositories.lead_repository import LeadRepository
from app.repositories.deal_repository import DealRepository
from app.repositories.quotation_repository import QuotationRepository
from app.repositories.invoice_repository import InvoiceRepository
from app.core.enums import SALES_STATUS, DEAL_PIPELINE, QuotationStatus


class ActivityService:
    def __init__(self):
        self.repo = ActivityRepository()
        self.leadRepo = LeadRepository()
        self.dealRepo = DealRepository()
        self.quoteRepo = QuotationRepository()
        self.invoiceRepo = InvoiceRepository()

    async def get_user_activity(
        self,
        user_id: str,
        current_user: Dict[str, Any],
        filters: Dict[str, Any]
    ):
        try:

            if not PydanticObjectId.is_valid(user_id):
                raise AppException(400, "Invalid user id")

            target_user_id = PydanticObjectId(user_id)
            requester_user_id = PydanticObjectId(current_user["_id"])


            is_admin = validate_admin(current_user["userRole"])
            if not is_admin and requester_user_id != target_user_id:
                raise AppException(
                    403,
                    "You are not allowed to access another user's activity"
                )

            
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 20))
            skip = (page - 1) * limit

           
            query: Dict[str, Any] = {
                "userId.$id": PydanticObjectId(target_user_id)
            }


            now = datetime.now(timezone.utc)
            from_date = filters.get("from")
            to_date = filters.get("to")

            if from_date or to_date:
                query["createdAt"] = {}

                if from_date:
                    query["createdAt"]["$gte"] = datetime.fromisoformat(from_date)

                if to_date:
                    query["createdAt"]["$lte"] = datetime.fromisoformat(to_date)
            else:
                start_of_month = now.replace(
                    day=1, hour=0, minute=0, second=0, microsecond=0
                )
                query["createdAt"] = {
                    "$gte": start_of_month,
                    "$lte": now
                }


            entity_type = filters.get("entityType")
            action = filters.get("action")

            if entity_type:
                query["entityType"] = ACTIVITY_ENTITY_TYPE(entity_type)

            if action:
                query["action"] = ACTIVITY_ACTION(action)


            activities = await self.repo.find(
                filter=query,
                skip=skip,
                limit=limit,
                sort=[("createdAt", -1)]
            )

            total = await self.repo.model.find(query).count()

            return {
                "data": [doc.model_dump(mode="json") for doc in activities],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total
                },
                "dateRange": {
                    "from": query["createdAt"]["$gte"],
                    "to": query["createdAt"]["$lte"]
                }
            }

        except AppException as e:
            raise e

        except ValueError:
            raise AppException(400, "Invalid date format. Use ISO 8601 format.")

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")


    
    async def get_user_activity_summary(
        self,
        user_id: str,
        current_user: dict,
        filters: dict
    ):
        try:
            
            if not PydanticObjectId.is_valid(user_id):
                raise AppException(400, "Invalid user id")

            target_user_id = PydanticObjectId(user_id)
            requester_user_id = PydanticObjectId(current_user["_id"])

            is_admin = validate_admin(current_user["userRole"])

            if not is_admin and requester_user_id != target_user_id:
                raise AppException(403, "Access denied")

            
            now = datetime.now(timezone.utc)

            from_date = (
                datetime.fromisoformat(filters.get("from"))
                if filters.get("from")
                else now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            )

            to_date = (
                datetime.fromisoformat(filters.get("to"))
                if filters.get("to")
                else now
            )

            
            group_by = filters.get("groupBy", "month")

            if group_by == "day":
                date_group = {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}
                }
            elif group_by == "week":
                date_group = {"$isoWeek": "$createdAt"}
            else:
                date_group = {
                    "$dateToString": {"format": "%Y-%m", "date": "$createdAt"}
                }

            
            lead_col = self.leadRepo.model.get_pymongo_collection()
            deal_col = self.dealRepo.model.get_pymongo_collection()
            quote_col = self.quoteRepo.model.get_pymongo_collection()
            invoice_col = self.invoiceRepo.model.get_pymongo_collection()

            
            leads_pipeline = [
                {
                    "$match": {
                        "createdBy.$id": target_user_id,
                        "createdAt": {"$gte": from_date, "$lte": to_date}
                    }
                },
                {
                    "$group": {
                        "_id": date_group,
                        "count": {"$sum": 1}
                    }
                },
                {"$sort": {"_id": 1}}
            ]

            leads_cursor = lead_col.aggregate(leads_pipeline)
            leads_created = await leads_cursor.to_list(length=None)

            
            leads_lost = await lead_col.count_documents({
                "createdBy.$id": target_user_id,
                "status": SALES_STATUS.LOST,
                "createdAt": {"$gte": from_date, "$lte": to_date}
            })

            
            deals_pipeline = [
                {
                    "$match": {
                        "createdBy.$id": target_user_id,
                        "createdAt": {"$gte": from_date, "$lte": to_date}
                    }
                },
                {
                    "$group": {
                        "_id": date_group,
                        "count": {"$sum": 1}
                    }
                },
                {"$sort": {"_id": 1}}
            ]

            deals_cursor = deal_col.aggregate(deals_pipeline)
            deals_created = await deals_cursor.to_list(length=None)

            
            deals_won = await deal_col.count_documents({
                "createdBy.$id": target_user_id,
                "dealPipeline": DEAL_PIPELINE.WON,
                "createdAt": {"$gte": from_date, "$lte": to_date}
            })

            deals_lost = await deal_col.count_documents({
                "createdBy.$id": target_user_id,
                "dealPipeline": DEAL_PIPELINE.LOST,
                "createdAt": {"$gte": from_date, "$lte": to_date}
            })

            
            quotations_sent = await quote_col.count_documents({
                "createdBy.$id": target_user_id,
                "quotationStatus": QuotationStatus.SENT,
                "createdAt": {"$gte": from_date, "$lte": to_date}
            })

            quotations_accepted = await quote_col.count_documents({
                "createdBy.$id": target_user_id,
                "quotationStatus": QuotationStatus.ACCEPTED,
                "createdAt": {"$gte": from_date, "$lte": to_date}
            })

            
            invoices_created = await invoice_col.count_documents({
                "createdBy.$id": target_user_id,
                "createdAt": {"$gte": from_date, "$lte": to_date}
            })

            
            return {
                "range": {
                    "from": from_date,
                    "to": to_date,
                    "groupBy": group_by
                },
                "leads": {
                    "created": leads_created,
                    "lost": leads_lost
                },
                "deals": {
                    "created": deals_created,
                    "won": deals_won,
                    "lost": deals_lost
                },
                "quotations": {
                    "sent": quotations_sent,
                    "accepted": quotations_accepted
                },
                "invoices": {
                    "created": invoices_created
                }
            }

        except AppException as e:
            raise e

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")