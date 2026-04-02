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
from app.core.crypto import Encryption
from app.db.db import Client
from app.utils.activity_payload import activity_payload
from bson import ObjectId
from datetime import datetime, timedelta, timezone
from fastapi_cache import FastAPICache
from app.db import db as database_module
from app.db.models.activity_model import ActivityModel
from app.core.constants import (
    SUPER_ADMIN_CODE,
    LEAD_CACHE_NAMESPACE,
    USER_LEAD_CACHE_NAMESPACE,
    
)

class ActivityService:
    def __init__(self):
        self.repo = ActivityRepository()
        self.leadRepo = LeadRepository()
        self.dealRepo = DealRepository()
        self.quoteRepo = QuotationRepository()
        self.invoiceRepo = InvoiceRepository()
        self.crypto = Encryption()
        self.client = Client

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
                raise AppException(403, "You are not allowed to access another user's activity")

            query: Dict[str, Any] = {
                "userId.$id": PydanticObjectId(target_user_id)
            }

            now = datetime.now(timezone.utc)
            from_date = filters.get("from")
            to_date = filters.get("to")

            if from_date or to_date:
                query["createdAt"] = {}
                if from_date:
                    query["createdAt"]["$gte"] = datetime.fromisoformat(from_date).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                if to_date:
                    query["createdAt"]["$lte"] = datetime.fromisoformat(to_date).replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
            else:
                start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                query["createdAt"] = {
                    "$gte": start_of_month,
                    "$lte": now.replace(hour=23, minute=59, second=59, microsecond=999999)
                }

            entity_type = filters.get("entityType")
            action = filters.get("action")

            if entity_type:
                query["entityType"] = ACTIVITY_ENTITY_TYPE(entity_type)

            if action:
                query["action"] = ACTIVITY_ACTION(action)

            activities = await self.repo.find(
                filter=query,
                sort=[("createdAt", -1)]
            )

            total = await self.repo.model.find(query).count()

            activities = [doc.model_dump(mode="json") for doc in activities]

            for dict in activities:
                email = dict["metadata"].get("email")
                phone = dict["metadata"].get("phone")
                if email and email.startswith("gAAAA"):
                    dict["metadata"]["email"] = self.crypto.decrypt_data(dict["metadata"]["email"])
                if phone and phone.startswith("gAAAA"):
                    dict["metadata"]["phone"] = self.crypto.decrypt_data(dict["metadata"]["phone"])

            graph_filter = filters.get("graphFilter", "monthly")

            if graph_filter == "day":
                group_id = {
                    "year": {"$year": "$createdAt"},
                    "month": {"$month": "$createdAt"},
                    "day": {"$dayOfMonth": "$createdAt"}
                }
            elif graph_filter == "week":
                group_id = {
                    "year": {"$year": "$createdAt"},
                    "week": {"$week": "$createdAt"}
                }
            else:
                group_id = {
                    "year": {"$year": "$createdAt"},
                    "month": {"$month": "$createdAt"}
                }

            graph_date_range = query["createdAt"]

            connection_pipeline = [
                {
                    "$match": {
                        "userId.$id": PydanticObjectId(target_user_id),
                        "action": ACTIVITY_ACTION("update_lead_connection_status"),
                        "createdAt": graph_date_range
                    }
                },
                {
                    "$group": {
                        "_id": group_id,
                        "count": {"$sum": "$perform"}
                    }
                },
                {"$sort": {"_id": 1}},
                {
                    "$project": {
                        "_id": 0,
                        "period": "$_id",
                        "count": 1
                    }
                }
            ]

            collection = database_module.db[ActivityModel.Settings.name]
            cursor = collection.aggregate(connection_pipeline)
            connection_graph = await cursor.to_list(length=None)

            return {
                "data": activities,
                "total": total,
                "dateRange": {
                    "from": query["createdAt"]["$gte"],
                    "to": query["createdAt"]["$lte"]
                },
                "leadConnectionGraph": {
                    "graphFilter": graph_filter,
                    "total": sum(item["count"] for item in connection_graph),
                    "data": connection_graph
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
        

    async def call_activity(self, payload: Dict[str, Any], ip:str, agent: str, user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:

                    payload = activity_payload(userId=user["_id"], entityType=payload["entityType"], action=payload["action"], entityId= payload["entityId"] if payload.get("entityId") else None, title="Made call", description=f"made call to {payload["number"]} by {user["firstName"]} {user["lastName"]} and userId is {user["_id"]}", ipAddress=ip, userAgent=agent, metadata={"number": payload["number"], "call_by": user["_id"]})


                    result = await self.repo.create(data=payload, session=session)

                    if not result:
                        raise AppException(400, "Call activity creation failed")
                    
                    return result.model_dump(mode="json")



                except AppException as e:
                    raise e

                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                

    async def update_call_activity(self, id:str,  payload: Dict[str, Any], user: Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(id):
                        raise AppException(400, "Invalid activity Object Id ")
                    
                    call_act = await self.repo.find_by_id(PydanticObjectId(id))

                    if not call_act:
                        raise AppException(404, "Call activity not found")
                    
                    created_at = call_act.createdAt


                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    
                    if datetime.now(timezone.utc) > (created_at + timedelta(hours=1)):
                        raise AppException(400, "The update call activity time goes expire, Operation denied")
                    
                    print("ee: ", call_act.entityType)

                    if call_act.entityType == ACTIVITY_ENTITY_TYPE.LEAD:
                        leadId = PydanticObjectId(call_act.entityId)
                        
                        connect_status = payload.get("connectStatus")
                        print("con: ", connect_status)
                        if connect_status:

                            update_lead = await self.leadRepo.update(id=leadId, data={"connectStatus": connect_status}, session=session)

                            

                    payload = {
                        "metadata": {**call_act.metadata, **payload}
                    }  

                    update = await self.repo.update(id=PydanticObjectId(id), data=payload, session=session)

                    

                    if not update:
                        raise AppException(400, "Call activity updation failed")

                    await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
                    await FastAPICache.get_backend().clear(namespace=USER_LEAD_CACHE_NAMESPACE) 
                    
                    return True



                except AppException as e:
                    raise e

                except Exception as e:
                    raise AppException(500, f"Internal server error: {e}")
                
                        