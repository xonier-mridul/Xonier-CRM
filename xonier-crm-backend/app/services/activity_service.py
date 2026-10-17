from typing import Dict, Any
from datetime import datetime, timezone
from beanie import PydanticObjectId
from app.utils.custom_exception import AppException
from app.utils.validate_admin import validate_admin, validate_admin_company_admin
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
from app.db.models.user_model import UserModel
from app.db.models.lead_model import LeadsModel
from app.core.constants import (
    SUPER_ADMIN_CODE,
    LEAD_CACHE_NAMESPACE,
    USER_LEAD_CACHE_NAMESPACE,
    
)
from app.utils.get_team_members import GetTeamMembers

class ActivityService:
    def __init__(self):
        self.repo = ActivityRepository()
        self.leadRepo = LeadRepository()
        self.dealRepo = DealRepository()
        self.quoteRepo = QuotationRepository()
        self.invoiceRepo = InvoiceRepository()
        self.crypto = Encryption()
        self.client = Client
        self.verifyManager = GetTeamMembers()

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

            is_admin = validate_admin_company_admin(current_user["userRole"])

            is_manager = False

            if not is_admin: 
                
                members = await self.verifyManager.get_team_members(userId=current_user["_id"])

                if ObjectId(user_id) in members:
                    is_manager = True



            if not is_admin and not is_manager and requester_user_id != target_user_id:
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
                if dict.get("metadata"):
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

            is_admin = validate_admin_company_admin(current_user["userRole"])

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

    async def get_lead_call_history(self, lead_id: str, user: Dict[str, Any]):
        """Return call outcomes recorded by the mobile activity-update API.

        These records are authoritative: mobile writes the duration and final
        engagement result here after a call, while a browser call-request can be
        cancelled when its modal closes even if the phone call later completed.
        """
        try:
            if not PydanticObjectId.is_valid(lead_id):
                raise AppException(400, "Invalid lead id")
            lead_oid = PydanticObjectId(lead_id)
            company_id = PydanticObjectId(user["companyId"])

            lead = await self.leadRepo.model.get_pymongo_collection().find_one(
                {"_id": lead_oid, "companyId": company_id, "deletedAt": None}, {"_id": 1}
            )
            if not lead:
                raise AppException(404, "Lead not found")

            activities = await ActivityModel.get_pymongo_collection().find(
                {
                    "companyId": company_id,
                    "entityType": ACTIVITY_ENTITY_TYPE.LEAD.value,
                    "entityId": lead_oid,
                    "action": ACTIVITY_ACTION.CALL_MADE.value,
                },
                sort=[("createdAt", -1)],
            ).to_list(length=100)

            def ref_id(value):
                if isinstance(value, dict):
                    return value.get("$id") or value.get("id") or value.get("_id")
                return getattr(value, "id", value)

            agent_ids = {ref_id(item.get("userId")) for item in activities if item.get("userId")}
            agents = await UserModel.get_pymongo_collection().find(
                {"_id": {"$in": list(agent_ids)}}, {"firstName": 1, "lastName": 1, "email": 1}
            ).to_list(length=len(agent_ids)) if agent_ids else []
            agent_names = {
                agent["_id"]: " ".join(part for part in [agent.get("firstName"), agent.get("lastName")] if part)
                or agent.get("email") or "Agent"
                for agent in agents
            }

            result = []
            for activity in activities:
                metadata = activity.get("metadata") or {}
                try:
                    duration = max(int(metadata.get("callDuration") or 0), 0)
                except (TypeError, ValueError):
                    duration = 0
                connect_status = str(metadata.get("connectStatus") or "").lower() or None
                is_not_connected = connect_status in {"not_connected", "not_reached", "wrong_number"}
                is_connected = duration > 0 or bool(connect_status and not is_not_connected)
                agent_id = ref_id(activity.get("userId"))
                created_at = activity.get("createdAt")
                # Historical activities were written with date-only createdAt.
                # Mongo ObjectId retains the original creation second, making it
                # the best available timestamp for those already-saved records.
                if (
                    not metadata.get("callCompletedAt")
                    and isinstance(created_at, datetime)
                    and created_at.hour == created_at.minute == created_at.second == 0
                ):
                    created_at = activity["_id"].generation_time
                result.append({
                    "id": str(activity["_id"]),
                    "status": connect_status or ("connected" if is_connected else "not_connected"),
                    "connectStatus": connect_status,
                    "disposition": "connected" if is_connected else "not_connected",
                    "durationSec": duration if is_connected else None,
                    "feedback": metadata.get("feedback"),
                    "followUpAt": metadata.get("followUpAt"),
                    # Mobile sends the final call detail through activity-update.
                    # Prefer that exact completion time; older records fall back
                    # to the activity's creation timestamp.
                    "requestedAt": metadata.get("callCompletedAt") or created_at,
                    "agentName": agent_names.get(agent_id, "Agent"),
                })
            return result
        except AppException:
            raise
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
                    
                    if datetime.now(timezone.utc) > (created_at + timedelta(hours=24)):
                        raise AppException(400, "The update call activity time goes expire, Operation denied")

                    # ── Initialize variables here so they are always in scope ──────
                    from zoneinfo import ZoneInfo
                    IST = ZoneInfo("Asia/Kolkata")

                    follow_up_at: None = None
                    connect_status = payload.get("connectStatus")
                    follow_up_in   = payload.get("followUpIn")  # "1h" | "6h" | "1d" | ISO string

                    # ── Calculate exact follow-up datetime in IST ─────────────────
                    if follow_up_in:
                        now_ist = datetime.now(IST)   # current moment in India time
                        preset_map = {
                            "1h": timedelta(hours=1),
                            "6h": timedelta(hours=6),
                            "1d": timedelta(days=1),
                        }
                        if follow_up_in in preset_map:
                            # "1d" at 6:23 PM IST → tomorrow 6:23 PM IST
                            follow_up_at = now_ist + preset_map[follow_up_in]
                        else:
                            # Custom ISO string from "Pick date & time"
                            try:
                                parsed = datetime.fromisoformat(follow_up_in)
                                if parsed.tzinfo is None:
                                    # Mobile sent IST local time without offset → treat as IST
                                    parsed = parsed.replace(tzinfo=IST)
                                follow_up_at = parsed
                            except ValueError:
                                raise AppException(
                                    400,
                                    f"Invalid followUpIn: '{follow_up_in}'. "
                                    "Use '1h', '6h', '1d', or ISO with offset e.g. '2026-10-16T17:00:00+05:30'."
                                )

                    # If status is follow_up but no time provided, default to tomorrow
                    if connect_status == "follow_up" and follow_up_at is None:
                        follow_up_at = datetime.now(IST) + timedelta(days=1)

                    if call_act.entityType == ACTIVITY_ENTITY_TYPE.LEAD:
                        leadId = PydanticObjectId(call_act.entityId)
                        lead_update_data: dict = {}

                        if connect_status:
                            lead_update_data["connectStatus"] = connect_status
                        if follow_up_at:
                            lead_update_data["followUpAt"] = follow_up_at
                        elif connect_status and connect_status != "follow_up":
                            # A later non-follow-up outcome must not leave an old
                            # reminder visible in the leads table.
                            lead_update_data["followUpAt"] = None

                        if lead_update_data:
                            lead_update_data["updatedAt"] = datetime.now(timezone.utc)
                            # Write the exact same IST-derived datetime that is
                            # stored in activity metadata. Using the raw tenant
                            # scoped collection avoids any repository/session
                            # scope ambiguity between the mobile and web flows.
                            write_result = await LeadsModel.get_pymongo_collection().update_one(
                                {"_id": leadId, "companyId": PydanticObjectId(user["companyId"])},
                                {"$set": lead_update_data},
                                session=session,
                            )
                            if write_result.matched_count != 1:
                                raise AppException(404, "Lead linked to call activity was not found")

                    # ── Build activity metadata ───────────────────────────────────
                    meta_update = {**call_act.metadata, **{k: v for k, v in payload.items() if k != "followUpIn"}}
                    # Preserve the actual completion moment in IST. This is also
                    # used by the lead timeline for older activities created when
                    # ActivityModel mistakenly stored only the calendar date.
                    meta_update["callCompletedAt"] = datetime.now(IST).isoformat()
                    if follow_up_at:
                        meta_update["followUpAt"] = follow_up_at.isoformat()

                    payload = {"metadata": meta_update}

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
