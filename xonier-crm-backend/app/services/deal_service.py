from app.utils.record_visibility import DELETED_STATUSES, live_deal_filter, live_lead_filter
from app.utils.transaction_retry import retry_transaction
from app.services.lead_status_service import LeadStatusService
from typing import Dict, Any
from app.utils.custom_exception import AppException
from app.services.deal_stage_service import DealStageService, stage_key
from app.services.deal_attention import get_attention_queue
from app.repositories.deal_repository import DealRepository
from app.utils.enquiry_id_generator import generate_enquiry_id
from beanie import PydanticObjectId
from pymongo.errors import DuplicateKeyError
from fastapi.encoders import jsonable_encoder
from bson import ObjectId, DBRef
from app.core.constants import SUPER_ADMIN_CODE, DEAL_CACHE_NAMESPACE, DEAL_CACHE_NAMESPACE_BY_ID, LEAD_CACHE_NAMESPACE, USER_LEAD_CACHE_NAMESPACE
from app.db.db import Client
from app.repositories.lead_repository import LeadRepository
from app.core.crypto import Encryption
from app.utils.cache_key_generator import cache_key_generator, cache_key_generator_by_id, cache_key_generator_with_id
from fastapi_cache import FastAPICache
import json
from app.core.enums import SALES_STATUS, DEAL_STATUS, DEAL_STAGES, ACTIVITY_ACTION, ACTIVITY_ENTITY_TYPE, DEAL_PIPELINE, FORECAST_CATEGORY

from app.utils.get_team_members import GetTeamMembers
from app.utils.validate_admin import validate_admin, validate_admin_company_admin
from datetime import datetime, timezone
from app.repositories.activity_repository import ActivityRepository

from app.utils.activity_payload import activity_payload
from app.services.commercial_relationship_service import (
    CommercialRelationshipService,
    serialize_organization,
    serialize_person,
)
from app.db.models.organization_model import OrganizationModel
from app.db.models.person_model import PersonModel


class DealService:
    def __init__(self):
        self.repo = DealRepository()
        self.client= Client
        self.leadRepo = LeadRepository()
        self.encryption = Encryption()
        self.getTeamMem = GetTeamMembers()
        self.activityRepo = ActivityRepository()

    @retry_transaction
    async def create(self, payload: Dict[str, Any], createdBy: str):
        async with await self.client.start_session() as session:
          async with session.start_transaction():
            try:
                lead_id = payload.get("lead_id")
                lead = None
                if lead_id:
                    is_exist = await self.repo.find_by_lead(
                        leadId=PydanticObjectId(lead_id), session=session,
                    )
                    if is_exist:
                        raise AppException(
                            400, "Deal already exist for this lead, process stopped"
                        )
                    lead = await self.leadRepo.find_one(
                        live_lead_filter({"_id": PydanticObjectId(lead_id)}), session=session,
                    )
                    if not lead:
                        raise AppException(404, "Lead not found against lead id")
                    organization, person = await CommercialRelationshipService().ensure_for_lead(
                        lead, createdBy, session=session
                    )
                    if organization or person:
                        await self.leadRepo.update(
                            id=PydanticObjectId(lead_id),
                            data={
                                "organizationId": organization.id if organization else None,
                                "personId": person.id if person else None,
                            },
                            session=session,
                        )
                        lead.organizationId = organization.id if organization else None
                        lead.personId = person.id if person else None

                stage_service = DealStageService()
                await stage_service.validate_key(payload["dealStage"], session)
                stage_probs = await stage_service.probability_map(session=session)
                deal_id = generate_enquiry_id("DEAL")

                org_id = (
                    PydanticObjectId(str(payload["organizationId"]))
                    if payload.get("organizationId") and ObjectId.is_valid(str(payload["organizationId"]))
                    else (lead.organizationId if lead else None)
                )
                pers_id = (
                    PydanticObjectId(str(payload["personId"]))
                    if payload.get("personId") and ObjectId.is_valid(str(payload["personId"]))
                    else (lead.personId if lead else None)
                )
                if pers_id and not org_id:
                    person_doc = await PersonModel.find_one(
                        {"_id": pers_id, "deletedAt": None}, session=session
                    )
                    if person_doc and person_doc.organizationId:
                        org_id = person_doc.organizationId

                extra_deal_fields: Dict[str, Any] = {}
                if payload.get("dealProbability") is None:
                    default_prob = stage_probs.get(stage_key(payload["dealStage"]))
                    if default_prob is not None:
                        extra_deal_fields["dealProbability"] = default_prob
                if lead:
                    if not payload.get("originalTrafficSource") and getattr(lead, "source", None):
                        extra_deal_fields["originalTrafficSource"] = lead.source
                    if not payload.get("assignedTo") and getattr(lead, "assignedTo", None):
                        first_assignee = lead.assignedTo[0]
                        assignee_oid = getattr(getattr(first_assignee, "ref", None), "id", None) or getattr(
                            first_assignee, "id", first_assignee
                        )
                        if assignee_oid and ObjectId.is_valid(str(assignee_oid)):
                            extra_deal_fields["assignedTo"] = PydanticObjectId(str(assignee_oid))

                new_payload = {
                    **payload,
                    **extra_deal_fields,
                    "deal_id": deal_id,
                    "stageEnteredAt": datetime.now(timezone.utc),
                    "dealPipeline": payload.get("dealStage", DEAL_PIPELINE.QUALIFICATION.value),
                    "createdBy": PydanticObjectId(createdBy),
                    "organizationId": org_id,
                    "personId": pers_id,
                }

                deal = await self.repo.create(data=new_payload, session=session)

                if not deal:
                    raise AppException(400, "Deal creation failed")
                
                if lead_id:
                    final_status = await LeadStatusService().resolve(session=session, final=True)
                    await self.leadRepo.update(
                        id=PydanticObjectId(lead_id),
                        data={
                            "inDeal": True,
                            "status": final_status,
                            "updatedAt": datetime.now(timezone.utc),
                        },
                        session=session,
                    )

                activity = activity_payload(userId=PydanticObjectId(createdBy), entityType=ACTIVITY_ENTITY_TYPE.DEAL, entityId=PydanticObjectId(deal.id), action=ACTIVITY_ACTION.CREATED, title="create deal", metadata={"dealId": deal.deal_id, "leadName": deal.dealName})

                is_activity = await self.activityRepo.create(data=activity, session=session)

                if not is_activity:
                    raise AppException(400, "Activity not created")

                await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE)
                await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE_BY_ID)
                await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
                await FastAPICache.get_backend().clear(namespace=USER_LEAD_CACHE_NAMESPACE)

                return deal.model_dump(mode="json")

            except AppException as e:
                raise

            except DuplicateKeyError:
                raise AppException(409, "Lead id already exist")

            except Exception as e:
                
                raise AppException(500, "Internal server error")
            
            

    async def get_all(self, filters: Dict[str, Any], user: Dict[str, Any]):
        try:
            page = filters.get("page") or 1
            limit = filters.get("limit") or 10
 
            is_admin = validate_admin_company_admin(user["userRole"])
 
            
 
            query = {"status": DEAL_STATUS.ACTIVE.value}
 
            if not is_admin:
                members = await self.getTeamMem.get_team_members(user["_id"])
 
                if members:
                    query.update({"createdBy.$id": {"$in": members}})
 
                if not members:
                    query.update({"createdBy.$id": PydanticObjectId(user["_id"])})
 
            if "dealId" in filters:
                query.update({"deal_id": {"$regex": filters["dealId"], "$options": "i"}})
 
            if "name" in filters:
                query.update({"dealName": {"$regex": filters["name"], "$options": "i"}})
 
            if "pipeline" in filters:
                query.update({"dealPipeline": filters["pipeline"]})
 
            # Sales pipeline: skip closed deals (the board only shows open stages).
            if filters.get("pipeline_open") and "stage" not in filters:
                query.update({"dealStage": {"$nin": [
                    DEAL_STAGES.WON.value,
                    DEAL_STAGES.CLOSED_WON.value,
                    DEAL_STAGES.LOST.value,
                    "closed_lost",
                ]}})

            if "stage" in filters:
                stage = filters["stage"]
                query.update({"dealStage": {"$in": [DEAL_STAGES.WON.value, DEAL_STAGES.CLOSED_WON.value]} if stage == DEAL_STAGES.WON.value else stage})
 
            # createdBy filter (admin-only, filter by user who created the deal)
            if is_admin and "createdBy" in filters:
                if not ObjectId.is_valid(filters["createdBy"]):
                    raise AppException(400, "Invalid createdBy userId")
                query.update({"createdBy.$id": PydanticObjectId(filters["createdBy"])})

            # assignedTo filter — filter deals assigned to a specific user
            if "assignedTo" in filters:
                if not ObjectId.is_valid(filters["assignedTo"]):
                    raise AppException(400, "Invalid assignedTo userId")
                query.update({"assignedTo.$id": PydanticObjectId(filters["assignedTo"])})

            if is_admin:
                if "userid" in filters:
                    if not ObjectId.is_valid(filters["userid"]):
                        raise AppException(400, "Invalid userId")
                    query.update({"createdBy.$id": PydanticObjectId(filters["userid"])})
 
            if "fromDate" in filters or "toDate" in filters:
                date_filter = {}
                if "fromDate" in filters:
                    try:
                        from_dt = datetime.fromisoformat(str(filters["fromDate"]))
                        from_dt = from_dt.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                        date_filter["$gte"] = from_dt
                    except (ValueError, TypeError):
                        raise AppException(400, "Invalid fromDate format. Use ISO format: YYYY-MM-DD")
 
                if "toDate" in filters:
                    try:
                        to_dt = datetime.fromisoformat(str(filters["toDate"]))
                        to_dt = to_dt.replace(hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc)
                        date_filter["$lte"] = to_dt
                    except (ValueError, TypeError):
                        raise AppException(400, "Invalid toDate format. Use ISO format: YYYY-MM-DD")
 
                if date_filter:
                    query.update({"createdAt": date_filter})
 
            query = live_deal_filter(query)

            if filters.get("attention"):
                return await get_attention_queue(query, filters["attention"], page, limit)

            def serialize_for_cache(v):
                if isinstance(v, PydanticObjectId):
                    return str(v)
                elif isinstance(v, datetime):
                    return v.isoformat()
                elif isinstance(v, list):
                    return [serialize_for_cache(i) for i in v]
                elif isinstance(v, dict):
                    return {nk: serialize_for_cache(nv) for nk, nv in v.items()}
                return v
 
            cache_query = {k: serialize_for_cache(v) for k, v in query.items()}
            cache_query["listOrderVersion"] = 2
 
            cache_key = cache_key_generator_with_id(prefix=DEAL_CACHE_NAMESPACE, filters=cache_query, page=int(page), limit=int(limit), userId=user["_id"])
 
            cache = await FastAPICache.get_backend().get(cache_key)
 
            if cache:
                return json.loads(cache)
           
            result = await self.repo.get_all_nested(
                page=int(page),
                limit=int(limit),
                filters=query,
                populate=["createdBy", "lead_id", "lead_id.assignedTo", "updatedBy", "assignedTo"],
                sort=["-updatedAt", "-createdAt", "-_id"]
            )
 
            if not result:
                raise AppException(404, "Deal data not found")
 
            for deal in result["data"]:
                linked_lead = deal.get("lead_id")
                if linked_lead and (
                    not linked_lead.get("lead_id") or linked_lead.get("deletedAt") is not None
                    or linked_lead.get("status") in DELETED_STATUSES
                ):
                    deal["lead_id"] = None

            result = jsonable_encoder(
                result,
                exclude={
                    "createdBy": {"password"},
                    "updatedBy": {"password"},
                    "assignedTo": {"password"},
                    "lead_id": {"assignedTo": {"password"}},
                },
            )
 
            await FastAPICache.get_backend().set(key=cache_key, value=json.dumps(result), expire=300)
 
            return result
 
        except AppException as e:
            raise e
 
        except Exception as e:
            
            raise AppException(500, f"Internal server error: {e}")
 

    async def get_by_id(self, dealId: str, user:Dict[str, Any]):
        try:

            if not ObjectId.is_valid(dealId):
                raise AppException(400, "Invalid deal object id")
            
            isAdmin = validate_admin_company_admin(user["userRole"])
            isCreator = False
            isManager = False
           
            userRole = user["userRole"]

            

            if not isAdmin:
                members = await self.getTeamMem.get_team_members(user["_id"])
                if members:
                    isManager = True

            
            result = await self.repo.find_one(
                live_deal_filter({"_id": PydanticObjectId(dealId)}),
                populate=["createdBy", "lead_id", "updatedBy", "assignedTo"],
            )
            if not result:
                raise AppException(404, "Deal not found against this id")
            

            result = result.model_dump(mode="json")

            
            if str(user["_id"]) == str(result["createdBy"]["id"]):
                isCreator = True


            if not isAdmin and not isCreator and not isManager:
                raise AppException(403, "Unauthorized, only admin, manager or creator access deal")
            
            lead = result.get("lead_id") or {}
            if not lead.get("lead_id") or lead.get("deletedAt") is not None or lead.get("status") in DELETED_STATUSES:
                result["lead_id"] = None
                lead = {}
            email = lead.get("email")
            phone = lead.get("phone")

            userEmail = result["createdBy"].get("email")
            userPhone = result["createdBy"].get("phone")
            if email:
                lead["email"] = self.encryption.decrypt_data(email)
            if phone:
                lead["phone"] = self.encryption.decrypt_data(phone)
            if userEmail: 
                result["createdBy"]["email"] = self.encryption.decrypt_data(userEmail)
            if userPhone:
                result["createdBy"]["phone"] = self.encryption.decrypt_data(userPhone)

            organization_id = result.get("organizationId")
            person_id = result.get("personId")
            organization = (
                await OrganizationModel.find_one({"_id": PydanticObjectId(organization_id), "deletedAt": None})
                if organization_id and ObjectId.is_valid(str(organization_id))
                else None
            )
            person = (
                await PersonModel.find_one({"_id": PydanticObjectId(person_id), "deletedAt": None})
                if person_id and ObjectId.is_valid(str(person_id))
                else None
            )
            result["organization"] = serialize_organization(organization)
            result["person"] = serialize_person(person, organization)
     
            return result

        except AppException as e:
            raise

        except Exception as e:
            
            raise AppException(500, "Internal server error")
        




    async def update(self, id:str, user: Dict[str, Any], payload: Dict[str, Any])->bool:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(id):
                        raise ValueError(400, "Invalid deal id")
                    

                    isAdmin:bool = validate_admin_company_admin(user["userRole"])
                    isCreator:bool = False
                    isManager:bool = False

                    deal = await self.repo.find_one(
                        live_deal_filter({"_id": PydanticObjectId(id)}),
                        populate=["createdBy"], session=session,
                    )
                    if not deal:
                        raise AppException(404, "deal not found against this id")
                    
                    deal = deal.model_dump(mode="json")
                    
                    

                    if not isAdmin:

                        if user["_id"] == deal["createdBy"]["id"]:
                            isCreator = True
                        
                    
                        members = await self.getTeamMem.get_team_members(user["_id"])
                        if members:
                            isManager = True
                    
                    if not isAdmin and not isCreator and not isManager:
                        raise AppException(403, "Unauthorized, only admin, manager or creator update deal")
                    
                    stage_service = DealStageService()
                    await stage_service.validate_key(payload["dealStage"], session)
                    stage_probs = await stage_service.probability_map(session=session)
                    stage = payload["dealStage"]
                    previous_stage = deal.get("dealStage")
                    is_won_stage = stage in {"won", "closed_won"}
                    is_lost_stage = stage == "lost"
                    reason_key = "closedLostReason" if is_lost_stage else "closedWonReason"
                    resolved_close_date = payload.get("closeDate", deal.get("closeDate"))
                    resolved_reason = (payload.get(reason_key, deal.get(reason_key)) or "").strip()
                    if (is_won_stage or is_lost_stage) and (not resolved_close_date or not resolved_reason):
                        raise AppException(422, "Set the close date and outcome reason in Edit Deal first")

                    new_payload: Dict[str, Any] = {
                        **payload,
                        "dealPipeline": stage,
                        "updatedBy": DBRef(collection="users", id=PydanticObjectId(user["_id"])),
                        "updatedAt": datetime.now(timezone.utc),
                    }
                    if "forecastCategory" in new_payload and hasattr(new_payload["forecastCategory"], "value"):
                        new_payload["forecastCategory"] = new_payload["forecastCategory"].value

                    if is_won_stage:
                        if "dealProbability" not in payload or payload.get("dealProbability") is None:
                            new_payload["dealProbability"] = 100
                        if "forecastProbability" not in payload or payload.get("forecastProbability") is None:
                            new_payload["forecastProbability"] = 100
                        if "forecastCategory" not in payload or payload.get("forecastCategory") is None:
                            new_payload["forecastCategory"] = FORECAST_CATEGORY.CLOSED.value
                    elif is_lost_stage:
                        if "dealProbability" not in payload or payload.get("dealProbability") is None:
                            new_payload["dealProbability"] = 0
                        if "forecastProbability" not in payload or payload.get("forecastProbability") is None:
                            new_payload["forecastProbability"] = 0
                        if "forecastCategory" not in payload or payload.get("forecastCategory") is None:
                            new_payload["forecastCategory"] = FORECAST_CATEGORY.CLOSED.value
                    elif previous_stage != stage:
                        new_stage_prob = stage_probs.get(stage_key(stage))
                        prev_stage_prob = stage_probs.get(stage_key(previous_stage))
                        if new_stage_prob is not None and (
                            payload.get("dealProbability") is None
                            or (
                                payload.get("dealProbability") == deal.get("dealProbability")
                                and deal.get("dealProbability") == prev_stage_prob
                            )
                        ):
                            new_payload["dealProbability"] = new_stage_prob
                        if (
                            previous_stage in {"won", "closed_won", "lost"}
                            and ("forecastCategory" not in payload or payload.get("forecastCategory") is None)
                            and deal.get("forecastCategory") == FORECAST_CATEGORY.CLOSED.value
                        ):
                            new_payload["forecastCategory"] = FORECAST_CATEGORY.PIPELINE.value

                    for rel_key in ("organizationId", "personId"):
                        if rel_key in new_payload:
                            raw_rel = new_payload[rel_key]
                            if raw_rel and ObjectId.is_valid(str(raw_rel)):
                                new_payload[rel_key] = PydanticObjectId(str(raw_rel))
                            else:
                                new_payload[rel_key] = None
                    
                    update = await self.repo.update(id=PydanticObjectId(id), data=new_payload, session=session)

                    if not update:
                        raise AppException(400, "Deal data not updated")
                    
                    if is_won_stage and previous_stage != stage:
                        activity = activity_payload(
                            userId=PydanticObjectId(user["_id"]),
                            entityType=ACTIVITY_ENTITY_TYPE.DEAL,
                            entityId=PydanticObjectId(deal["id"]),
                            action=ACTIVITY_ACTION.CLOSED_WON,
                            title="deal closed won",
                            description=f"Won reason: {resolved_reason}",
                            metadata={
                                "dealId": deal["deal_id"],
                                "leadName": deal["dealName"],
                                "dealStage": stage,
                                "reason": resolved_reason,
                            },
                        )
                    elif is_lost_stage and previous_stage != stage:
                        activity = activity_payload(
                            userId=PydanticObjectId(user["_id"]),
                            entityType=ACTIVITY_ENTITY_TYPE.DEAL,
                            entityId=PydanticObjectId(deal["id"]),
                            action=ACTIVITY_ACTION.CLOSED_LOST,
                            title="deal closed lost",
                            description=f"Lost reason: {resolved_reason}",
                            metadata={
                                "dealId": deal["deal_id"],
                                "leadName": deal["dealName"],
                                "dealStage": stage,
                                "reason": resolved_reason,
                            },
                        )
                    elif previous_stage != stage:
                        activity = activity_payload(
                            userId=PydanticObjectId(user["_id"]),
                            entityType=ACTIVITY_ENTITY_TYPE.DEAL,
                            entityId=PydanticObjectId(deal["id"]),
                            action=ACTIVITY_ACTION.UPDATED,
                            title=f"deal stage moved to {stage}",
                            description=f"Stage changed from {previous_stage} to {stage}",
                            metadata={
                                "dealId": deal["deal_id"],
                                "leadName": deal["dealName"],
                                "fromStage": previous_stage,
                                "toStage": stage,
                            },
                        )
                    else:
                        activity = activity_payload(
                            userId=PydanticObjectId(user["_id"]),
                            entityType=ACTIVITY_ENTITY_TYPE.DEAL,
                            entityId=PydanticObjectId(deal["id"]),
                            action=ACTIVITY_ACTION.UPDATED,
                            title="update deal",
                            metadata={"dealId": deal["deal_id"], "leadName": deal["dealName"]},
                        )

                    is_activity = await self.activityRepo.create(data=activity, session=session)

                    if not is_activity:
                        raise AppException(400, "Activity not created")

                except AppException as e:
                    raise
                except Exception as e:
                    print("Deal update error:", e)
                    raise AppException(500, f"Internal server error: {e}")

        await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE)
        await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE_BY_ID)
        await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
        await FastAPICache.get_backend().clear(namespace=USER_LEAD_CACHE_NAMESPACE)
        return True
                

    @retry_transaction
    async def delete(self, id: str, user:Dict[str, Any]):
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    if not ObjectId.is_valid(id):
                        raise AppException(400, "Invalid Deal object id")
                    
                    is_admin = validate_admin_company_admin(user["userRole"])
                    is_creator = False

                    result = await self.repo.find_one(
                        live_deal_filter({"_id": PydanticObjectId(id)}),
                        populate=["createdBy"], session=session,
                    )

                    if not result:
                        raise AppException(404, "No deal data found again deal Id")
                    
                    if result.dealStage == DEAL_STAGES.WON.value:
                        raise AppException(400, "Deal is won, deletion failed")

                    if result.inQuotation:
                        raise AppException(400, "Deletion failed, Deal in under quotation")
                    
                    if str(result.createdBy.id) == str(user["_id"]):
                        is_creator = True

                    if not is_admin and not is_creator:
                        raise AppException(403, "Permission denied, only admin or creator can perform this operation")
                    
                    
                    payload = {
                        "status": DEAL_STATUS.DELETE.value,
                        "dealStage": DEAL_STAGES.DELETE.value,
                        "deletedAt": datetime.now(timezone.utc)
                    }

                    deleted = await self.repo.update(id=PydanticObjectId(id), data=payload, session=session)

                    linked_lead = (
                        await self.leadRepo.find_one(
                            live_lead_filter({"_id": result.lead_id.ref.id}), session=session,
                        ) if result.lead_id else None
                    )
                    if linked_lead:
                        lead_payload = {
                            "inDeal": False,
                            "status": await LeadStatusService().resolve(session=session)
                        }
                        lead_update = await self.leadRepo.update(id=linked_lead.id, data=lead_payload, session=session)
                        if not lead_update:
                            raise AppException(400, "Lead fields are not updated")

                    if not deleted:
                        raise AppException(400, "Deal not deleted")
                    
                    activity = activity_payload(userId=PydanticObjectId(user["_id"]), entityType=ACTIVITY_ENTITY_TYPE.DEAL, entityId=PydanticObjectId(result.id), action=ACTIVITY_ACTION.DELETE, title="delete deal", metadata={"dealId": result.deal_id, "leadName": result.dealName})

                    is_activity = await self.activityRepo.create(data=activity, session=session)

                    if not is_activity:
                        raise AppException(400, "Activity not created")
                    
                except AppException as e:
                    raise
                except Exception as e:
                    
                    raise AppException(500, f"Internal server error {e}")

        await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE)
        await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE_BY_ID)
        await FastAPICache.get_backend().clear(namespace=LEAD_CACHE_NAMESPACE)
        return result.model_dump(mode="json")

    async def bulk_assign(self, deal_ids: list, assigned_to_id: str, user: Dict[str, Any]) -> Dict[str, Any]:
        """Bulk assign multiple deals to a specific user. Uses batch update for efficiency."""
        try:
            if not ObjectId.is_valid(assigned_to_id):
                raise AppException(400, "Invalid assignedTo user id")

            is_admin = validate_admin_company_admin(user["userRole"])
            if not is_admin:
                raise AppException(403, "Only admins can bulk-assign deals")

            if not deal_ids:
                raise AppException(400, "No deal IDs provided")

            # Validate all IDs first
            valid_object_ids = []
            failed_ids = []
            for deal_id in deal_ids:
                if not ObjectId.is_valid(deal_id):
                    failed_ids.append(deal_id)
                else:
                    valid_object_ids.append(PydanticObjectId(deal_id))

            if not valid_object_ids:
                raise AppException(400, "No valid deal IDs provided")

            from bson import DBRef
            assigned_to_obj = DBRef(collection="users", id=PydanticObjectId(assigned_to_id))
            update_payload = {
                "assignedTo": assigned_to_obj,
                "updatedBy": DBRef(collection="users", id=PydanticObjectId(user["_id"])),
            }

            # Use bulk update for efficiency
            updated_count = await self.repo.bulk_update(
                filters=live_deal_filter({"_id": {"$in": valid_object_ids}}),
                data=update_payload,
            )

            await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE)
            await FastAPICache.get_backend().clear(namespace=DEAL_CACHE_NAMESPACE_BY_ID)

            return {
                "updated_count": updated_count,
                "failed_ids": failed_ids,
            }

        except AppException as e:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")
