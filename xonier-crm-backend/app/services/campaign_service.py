from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
import traceback

from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder
from pymongo.errors import DuplicateKeyError
from fastapi_cache import FastAPICache

from app.db.db import Client
from app.db.models.campaign_model import CampaignModel
from app.db.models.campaign_lead_model import CampaignLeadModel
from app.db.models.lead_model import LeadsModel
from app.repositories.campaign_repository import CampaignRepository
from app.repositories.campaign_lead_repository import CampaignLeadRepository
from app.repositories.activity_repository import ActivityRepository
from app.repositories.user_repository import UserRepository

from app.schemas.lead_schema import LeadsCreateSchema
from app.core.enums import (
    CAMPAIGN_STATUS,
    CAMPAIGN_DISTRIBUTION_MODE,
    CAMPAIGN_LEAD_STATUS,
    ACTIVITY_ENTITY_TYPE,
    ACTIVITY_ACTION,
    LEAD_SOURCE_TYPE,
)
from app.core.constants import CAMPAIGN_CACHE_NAMESPACE
from app.core.crypto import Encryption
from app.core.security import hash_value
from app.utils.custom_exception import AppException
from app.utils.enquiry_id_generator import generate_enquiry_id
from app.utils.activity_payload import activity_payload


class CampaignService:
    def __init__(self):
        self.repo = CampaignRepository()
        self.leadRepo = CampaignLeadRepository()
        self.activityRepo = ActivityRepository()
        self.userRepo = UserRepository()
        self.encryption = Encryption()
        self.client = Client

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _campaign_id(self) -> str:
        """Generate a unique campaign ID similar to the existing LEAD-xxx pattern."""
        return generate_enquiry_id("CAMP")

    async def _resolve_user_ids(self, id_strings: List[str]) -> List[PydanticObjectId]:
        """Convert a list of string IDs to PydanticObjectIds, raising on invalid values."""
        try:
            return [PydanticObjectId(uid) for uid in id_strings]
        except Exception:
            raise AppException(400, "One or more user IDs are invalid ObjectIds")

    async def _get_campaign_or_404(self, campaign_id: str) -> CampaignModel:
        """Fetch campaign by string ObjectId; raise 404 if not found or deleted."""
        campaign = await self.repo.find_by_id(PydanticObjectId(campaign_id))
        if not campaign or campaign.deletedAt is not None:
            raise AppException(404, "Campaign not found")
        return campaign

    def _collection(self):
        return CampaignModel.get_pymongo_collection()

    def _lead_collection(self):
        return CampaignLeadModel.get_pymongo_collection()

    async def _clear_cache(self) -> None:
        """Safely clear campaign cache; gracefully handles Redis downtime."""
        try:
            backend = FastAPICache.get_backend()
            if backend:
                await backend.clear(namespace=CAMPAIGN_CACHE_NAMESPACE)
        except Exception as e:
            print(f"[Warning] Failed to clear campaign cache: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # CREATE
    # ─────────────────────────────────────────────────────────────────────────

    async def create(self, payload: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    user_oid = PydanticObjectId(user["_id"])

                    manager_oids = await self._resolve_user_ids(payload.get("managers", []))
                    agent_oids = await self._resolve_user_ids(payload.get("agents", []))

                    campaign_data = {
                        "campaign_id": self._campaign_id(),
                        "name": payload["name"].strip(),
                        "description": payload.get("description"),
                        "managers": manager_oids,
                        "agents": agent_oids,
                        "distributionMode": payload.get("distributionMode", CAMPAIGN_DISTRIBUTION_MODE.ON_DEMAND),
                        "distributionConfig": payload.get("distributionConfig"),
                        "status": payload.get("status", CAMPAIGN_STATUS.DRAFT),
                        "createdBy": user_oid,
                    }

                    new_campaign = await self.repo.create(data=campaign_data, session=session)
                    if not new_campaign:
                        raise AppException(400, "Campaign creation failed")

                    act = activity_payload(
                        userId=user_oid,
                        entityType=ACTIVITY_ENTITY_TYPE.CAMPAIGN,
                        entityId=new_campaign.id,
                        action=ACTIVITY_ACTION.CREATED,
                        title="create campaign",
                        metadata={"campaignId": new_campaign.campaign_id, "name": new_campaign.name},
                    )
                    is_activity = await self.activityRepo.create(data=act, session=session)
                    if not is_activity:
                        raise AppException(400, "Activity creation failed")

                    await self._clear_cache()

                    return jsonable_encoder(new_campaign)

                except AppException:
                    raise
                except DuplicateKeyError:
                    raise AppException(409, "Campaign ID conflict — please retry")
                except Exception as e:
                    traceback.print_exc()
                    raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # GET ALL (paginated, filterable)
    # ─────────────────────────────────────────────────────────────────────────

    async def get_all(self, filters, user: Dict[str, Any]) -> Dict[str, Any]:
        try:
            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 20))
            status = filters.get("status")
            search = filters.get("search", "").strip()

            query: Dict[str, Any] = {"deletedAt": None}

            if status:
                try:
                    query["status"] = CAMPAIGN_STATUS(status)
                except ValueError:
                    raise AppException(400, f"Invalid status filter: {status}")

            if search:
                query["name"] = {"$regex": search, "$options": "i"}

            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["managers", "agents", "createdBy"],
                sort=[("createdAt", -1)],
            )

            return result

        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # GET BY ID
    # ─────────────────────────────────────────────────────────────────────────

    async def get_by_id(self, campaign_id: str, user: Dict[str, Any]) -> Dict[str, Any]:
        try:
            campaign = await self.repo.find_by_id(
                PydanticObjectId(campaign_id),
                populate=["managers", "agents", "createdBy", "updatedBy"],
            )
            if not campaign or campaign.deletedAt is not None:
                raise AppException(404, "Campaign not found")

            return jsonable_encoder(campaign)

        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # UPDATE
    # ─────────────────────────────────────────────────────────────────────────

    async def update(self, campaign_id: str, payload: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    campaign = await self._get_campaign_or_404(campaign_id)
                    user_oid = PydanticObjectId(user["_id"])

                    updates: Dict[str, Any] = {"updatedBy": user_oid}

                    if payload.get("name") is not None:
                        updates["name"] = payload["name"].strip()
                    if "description" in payload:
                        updates["description"] = payload["description"]
                    if payload.get("managers") is not None:
                        updates["managers"] = await self._resolve_user_ids(payload["managers"])
                    if payload.get("agents") is not None:
                        updates["agents"] = await self._resolve_user_ids(payload["agents"])
                    if payload.get("distributionMode") is not None:
                        updates["distributionMode"] = CAMPAIGN_DISTRIBUTION_MODE(payload["distributionMode"])
                    if "distributionConfig" in payload:
                        updates["distributionConfig"] = payload["distributionConfig"]

                    collection = self._collection()
                    await collection.update_one(
                        {"_id": campaign.id},
                        {"$set": {**updates, "updatedAt": datetime.now(timezone.utc)}},
                        session=session,
                    )

                    act = activity_payload(
                        userId=user_oid,
                        entityType=ACTIVITY_ENTITY_TYPE.CAMPAIGN,
                        entityId=campaign.id,
                        action=ACTIVITY_ACTION.UPDATED,
                        title="update campaign",
                        metadata={"campaignId": campaign.campaign_id},
                    )
                    await self.activityRepo.create(data=act, session=session)

                    await self._clear_cache()

                    updated = await self.repo.find_by_id(
                        campaign.id,
                        populate=["managers", "agents", "createdBy"],
                    )
                    return jsonable_encoder(updated)

                except AppException:
                    raise
                except Exception as e:
                    traceback.print_exc()
                    raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # UPDATE STATUS
    # ─────────────────────────────────────────────────────────────────────────

    async def update_status(self, campaign_id: str, payload: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    campaign = await self._get_campaign_or_404(campaign_id)
                    user_oid = PydanticObjectId(user["_id"])
                    new_status = CAMPAIGN_STATUS(payload["status"])

                    # Prevent re-activating a deleted campaign
                    if campaign.status == CAMPAIGN_STATUS.DELETED:
                        raise AppException(400, "Cannot change status of a deleted campaign")

                    collection = self._collection()
                    await collection.update_one(
                        {"_id": campaign.id},
                        {"$set": {
                            "status": new_status,
                            "updatedBy": user_oid,
                            "updatedAt": datetime.now(timezone.utc),
                        }},
                        session=session,
                    )

                    act = activity_payload(
                        userId=user_oid,
                        entityType=ACTIVITY_ENTITY_TYPE.CAMPAIGN,
                        entityId=campaign.id,
                        action=ACTIVITY_ACTION.UPDATED,
                        title=f"campaign status changed to {new_status.value}",
                        metadata={"campaignId": campaign.campaign_id, "status": new_status.value},
                    )
                    await self.activityRepo.create(data=act, session=session)

                    await self._clear_cache()
                    return {"status": new_status.value}

                except AppException:
                    raise
                except Exception as e:
                    traceback.print_exc()
                    raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # SOFT DELETE
    # ─────────────────────────────────────────────────────────────────────────

    async def delete(self, campaign_id: str, user: Dict[str, Any]) -> None:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    campaign = await self._get_campaign_or_404(campaign_id)
                    user_oid = PydanticObjectId(user["_id"])
                    now = datetime.now(timezone.utc)

                    collection = self._collection()
                    await collection.update_one(
                        {"_id": campaign.id},
                        {"$set": {
                            "deletedAt": now,
                            "deletedBy": user_oid,
                            "status": CAMPAIGN_STATUS.DELETED,
                            "updatedAt": now,
                        }},
                        session=session,
                    )

                    act = activity_payload(
                        userId=user_oid,
                        entityType=ACTIVITY_ENTITY_TYPE.CAMPAIGN,
                        entityId=campaign.id,
                        action=ACTIVITY_ACTION.DELETE,
                        title="delete campaign",
                        metadata={"campaignId": campaign.campaign_id},
                    )
                    await self.activityRepo.create(data=act, session=session)
                    await self._clear_cache()

                except AppException:
                    raise
                except Exception as e:
                    traceback.print_exc()
                    raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # IMPORT LEADS INTO CAMPAIGN
    # ─────────────────────────────────────────────────────────────────────────

    async def import_leads(
        self,
        campaign_id: str,
        payload: Dict[str, Any],
        user: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Imports leads into a campaign.

        Flow:
        1. Validate campaign exists and is not deleted.
        2. Use the same duplicate-detection logic as existing bulk_create
           (hash-based deduplication on email + phone + projectType).
        3. Insert new leads into LeadsModel inside the same transaction.
        4. Create CampaignLeadModel junction records for every successfully
           inserted lead (and for any explicitly re-added existing leads
           if the client uses 'addExisting' mode — not in V1 payload yet).
        5. $inc campaign.totalLeads atomically.
        6. Log activity.
        """
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    campaign = await self._get_campaign_or_404(campaign_id)
                    campaign_oid = campaign.id
                    user_oid = PydanticObjectId(user["_id"])

                    leads_data: List[Dict[str, Any]] = payload.get("leads", [])
                    data_tag: Optional[str] = payload.get("dataTag")
                    import_batch = str(uuid.uuid4())

                    if not leads_data:
                        raise AppException(400, "leads array cannot be empty")

                    # ── Step 1: Duplicate detection (same as existing bulk_create) ──
                    hash_filters = []
                    pre_skipped: List[Dict[str, Any]] = []

                    for lead in leads_data:
                        email = (lead.get("email") or "").lower().strip()
                        if not email:
                            pre_skipped.append({
                                "email": lead.get("email", "N/A"),
                                "reason": "Missing required field: email",
                            })
                            continue

                        filter_entry: Dict[str, Any] = {"hashedEmail": hash_value(email)}
                        phone = lead.get("phone", "")
                        project_type = lead.get("projectType", "")
                        if phone:
                            filter_entry["hashedPhone"] = hash_value(phone)
                        if project_type:
                            filter_entry["projectType"] = project_type
                        hash_filters.append(filter_entry)

                    existing_set = set()
                    if hash_filters:
                        existing_leads = await LeadsModel.find({"$or": hash_filters}).to_list()
                        existing_set = {
                            (l.hashedEmail, getattr(l, "hashedPhone", None), getattr(l, "projectType", None))
                            for l in existing_leads
                        }

                    # ── Step 2: Build leads to insert ─────────────────────────────
                    leads_to_insert: List[LeadsModel] = []
                    skipped: List[Dict[str, Any]] = [*pre_skipped]

                    for lead in leads_data:
                        try:
                            email = (lead.get("email") or "").lower().strip()
                            phone = lead.get("phone", "") or ""
                            project_type = lead.get("projectType", "") or ""

                            if any(s.get("email") == lead.get("email") for s in skipped):
                                continue

                            hashed_email = hash_value(email)
                            hashed_phone = hash_value(phone) if phone else None
                            encrypted_email = self.encryption.encrypt_data(email)
                            encrypted_phone = self.encryption.encrypt_data(phone) if phone else None

                            if (hashed_email, hashed_phone, project_type or None) in existing_set:
                                skipped.append({
                                    "email": lead.get("email"),
                                    "phone": phone or "N/A",
                                    "reason": "Duplicate lead (same email, phone, project type)",
                                })
                                continue

                            # Validate individual lead using existing schema
                            try:
                                LeadsCreateSchema(**lead)
                            except Exception as ve:
                                skipped.append({
                                    "email": lead.get("email", "N/A"),
                                    "reason": f"Validation error: {ve}",
                                })
                                continue

                            lead_doc_data: Dict[str, Any] = {
                                "lead_id": generate_enquiry_id("LEAD"),
                                "fullName": lead.get("fullName"),
                                "email": encrypted_email,
                                "hashedEmail": hashed_email,
                                "priority": lead.get("priority"),
                                "source": lead.get("source"),
                                "status": lead.get("status", "new"),
                                "createdBy": user_oid,
                                "leadSource": LEAD_SOURCE_TYPE.BULK_IMPORTED,
                            }
                            if encrypted_phone:
                                lead_doc_data["phone"] = encrypted_phone
                            if hashed_phone:
                                lead_doc_data["hashedPhone"] = hashed_phone
                            if project_type:
                                lead_doc_data["projectType"] = project_type

                            optional_fields = {
                                "companyName": lead.get("companyName"),
                                "city": lead.get("city"),
                                "country": lead.get("country"),
                                "postalCode": lead.get("postalCode"),
                                "language": lead.get("language"),
                                "industry": lead.get("industry"),
                                "employeeRole": lead.get("employeeRole"),
                                "employeeSeniority": lead.get("employeeSeniority"),
                                "message": lead.get("message"),
                                "membershipNotes": lead.get("membershipNotes"),
                                "dataTag": data_tag,
                            }
                            for k, v in optional_fields.items():
                                if v is not None and v != "":
                                    lead_doc_data[k] = v

                            extra = lead.get("extraFields")
                            if extra and isinstance(extra, dict):
                                lead_doc_data["extraFields"] = extra

                            leads_to_insert.append(LeadsModel(**lead_doc_data))

                        except Exception as e:
                            traceback.print_exc()
                            skipped.append({
                                "email": lead.get("email", "N/A"),
                                "reason": f"Processing error: {e}",
                            })

                    # ── Step 3: Bulk insert leads ─────────────────────────────────
                    inserted_count = 0
                    if leads_to_insert:
                        try:
                            await LeadsModel.insert_many(documents=leads_to_insert, session=session)
                            inserted_count = len(leads_to_insert)
                        except DuplicateKeyError as dke:
                            raise AppException(409, f"Duplicate key during lead insertion: {dke}")
                        except Exception as e:
                            traceback.print_exc()
                            raise AppException(500, f"Lead insertion failed: {e}")

                    # ── Step 4: Create CampaignLead junction records ───────────────
                    campaign_leads_to_insert: List[CampaignLeadModel] = []
                    now = datetime.now(timezone.utc)

                    for lead_doc in leads_to_insert:
                        campaign_leads_to_insert.append(
                            CampaignLeadModel(
                                campaignId=campaign_oid,
                                leadId=lead_doc.id,
                                campaignStatus=CAMPAIGN_LEAD_STATUS.UNASSIGNED,
                                importBatch=import_batch,
                                importedAt=now,
                                importedBy=user_oid,
                            )
                        )

                    if campaign_leads_to_insert:
                        try:
                            await CampaignLeadModel.insert_many(
                                documents=campaign_leads_to_insert,
                                session=session,
                            )
                        except Exception as e:
                            traceback.print_exc()
                            raise AppException(500, f"CampaignLead junction creation failed: {e}")

                    # ── Step 5: $inc campaign.totalLeads atomically ────────────────
                    if inserted_count > 0:
                        camp_collection = self._collection()
                        await camp_collection.update_one(
                            {"_id": campaign_oid},
                            {"$inc": {"totalLeads": inserted_count},
                             "$set": {"updatedAt": now}},
                            session=session,
                        )

                    # ── Step 6: Activity log ──────────────────────────────────────
                    act = activity_payload(
                        userId=user_oid,
                        entityType=ACTIVITY_ENTITY_TYPE.CAMPAIGN,
                        entityId=campaign_oid,
                        action=ACTIVITY_ACTION.UPDATED,
                        title="import leads into campaign",
                        perform=inserted_count,
                        metadata={
                            "campaignId": campaign.campaign_id,
                            "importBatch": import_batch,
                            "inserted": inserted_count,
                            "skipped": len(skipped),
                        },
                    )
                    await self.activityRepo.create(data=act, session=session)
                    await self._clear_cache()

                    return {
                        "inserted": inserted_count,
                        "skipped": len(skipped),
                        "skippedRecords": skipped,
                        "importBatch": import_batch,
                    }

                except AppException:
                    raise
                except Exception as e:
                    traceback.print_exc()
                    raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # GET CAMPAIGN LEADS (paginated)
    # ─────────────────────────────────────────────────────────────────────────

    async def get_campaign_leads(
        self,
        campaign_id: str,
        filters,
        user: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Returns paginated campaign leads with lead details joined via aggregation.
        """
        try:
            await self._get_campaign_or_404(campaign_id)
            campaign_oid = PydanticObjectId(campaign_id)

            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 20))
            status_filter = filters.get("campaignStatus")
            skip = (page - 1) * limit

            match: Dict[str, Any] = {
                "campaignId.$id": campaign_oid,
            }
            if status_filter:
                try:
                    match["campaignStatus"] = CAMPAIGN_LEAD_STATUS(status_filter)
                except ValueError:
                    raise AppException(400, f"Invalid campaignStatus filter: {status_filter}")

            collection = self._lead_collection()

            pipeline = [
                {"$match": match},
                {"$sort": {"importedAt": -1}},
                {
                    "$lookup": {
                        "from": "leads",
                        "localField": "leadId.$id",
                        "foreignField": "_id",
                        "as": "lead",
                    }
                },
                {"$unwind": {"path": "$lead", "preserveNullAndEmptyArrays": True}},
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "assignedTo.$id",
                        "foreignField": "_id",
                        "as": "assignedUser",
                    }
                },
                {
                    "$unwind": {
                        "path": "$assignedUser",
                        "preserveNullAndEmptyArrays": True,
                    }
                },
                {
                    "$project": {
                        "_id": {"$toString": "$_id"},
                        "campaignStatus": 1,
                        "assignedAt": 1,
                        "claimedAt": 1,
                        "completedAt": 1,
                        "lastContactedAt": 1,
                        "importedAt": 1,
                        "importBatch": 1,
                        "notes": 1,
                        "lead": {
                            "_id": {"$toString": "$lead._id"},
                            "lead_id": "$lead.lead_id",
                            "fullName": "$lead.fullName",
                            "status": "$lead.status",
                            "priority": "$lead.priority",
                            "source": "$lead.source",
                            "companyName": "$lead.companyName",
                            "projectType": "$lead.projectType",
                            "createdAt": "$lead.createdAt",
                        },
                        "assignedTo": {
                            "_id": {"$toString": "$assignedUser._id"},
                            "name": "$assignedUser.name",
                            "email": "$assignedUser.email",
                        },
                    }
                },
                {
                    "$facet": {
                        "data": [{"$skip": skip}, {"$limit": limit}],
                        "totalCount": [{"$count": "count"}],
                    }
                },
            ]

            result = await collection.aggregate(pipeline).to_list(length=1)
            if not result:
                return {"data": [], "page": page, "limit": limit, "totalPages": 0, "total": 0}

            data = result[0].get("data", [])
            total = result[0].get("totalCount", [{}])[0].get("count", 0)
            total_pages = (total + limit - 1) // limit if total else 0

            return {
                "data": data,
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages,
            }

        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # UPDATE CAMPAIGN LEAD STATUS
    # ─────────────────────────────────────────────────────────────────────────

    async def update_lead_status(
        self,
        campaign_id: str,
        campaign_lead_id: str,
        payload: Dict[str, Any],
        user: Dict[str, Any],
    ) -> Dict[str, Any]:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    await self._get_campaign_or_404(campaign_id)
                    campaign_oid = PydanticObjectId(campaign_id)
                    cl_oid = PydanticObjectId(campaign_lead_id)
                    new_status = CAMPAIGN_LEAD_STATUS(payload["campaignStatus"])
                    now = datetime.now(timezone.utc)

                    updates: Dict[str, Any] = {
                        "campaignStatus": new_status,
                        "updatedAt": now,
                    }
                    if new_status == CAMPAIGN_LEAD_STATUS.COMPLETED:
                        updates["completedAt"] = now

                    cl_collection = self._lead_collection()
                    result = await cl_collection.update_one(
                        {"_id": cl_oid, "campaignId.$id": campaign_oid},
                        {"$set": updates},
                        session=session,
                    )

                    if result.matched_count == 0:
                        raise AppException(404, "Campaign lead not found")

                    # If completed, increment campaign.completedLeads
                    if new_status == CAMPAIGN_LEAD_STATUS.COMPLETED:
                        camp_collection = self._collection()
                        await camp_collection.update_one(
                            {"_id": campaign_oid},
                            {"$inc": {"completedLeads": 1}, "$set": {"updatedAt": now}},
                            session=session,
                        )

                    return {"campaignStatus": new_status.value}

                except AppException:
                    raise
                except Exception as e:
                    traceback.print_exc()
                    raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # ASSIGN CAMPAIGN LEAD TO AGENT
    # ─────────────────────────────────────────────────────────────────────────

    async def assign_lead(
        self,
        campaign_id: str,
        campaign_lead_id: str,
        payload: Dict[str, Any],
        user: Dict[str, Any],
    ) -> Dict[str, Any]:
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    campaign = await self._get_campaign_or_404(campaign_id)
                    campaign_oid = campaign.id
                    cl_oid = PydanticObjectId(campaign_lead_id)
                    agent_oid = PydanticObjectId(payload["agentId"])
                    user_oid = PydanticObjectId(user["_id"])
                    now = datetime.now(timezone.utc)

                    # Verify agent is in campaign's agents list using raw document
                    # (avoids need to fetch/resolve Beanie Link objects)
                    camp_raw = await self._collection().find_one({"_id": campaign_oid})
                    agent_ids_raw = [
                        ref.get("$id") for ref in (camp_raw.get("agents") or [])
                        if isinstance(ref, dict) and "$id" in ref
                    ]
                    if agent_oid not in agent_ids_raw:
                        raise AppException(400, "Agent is not part of this campaign")

                    cl_collection = self._lead_collection()
                    result = await cl_collection.update_one(
                        {"_id": cl_oid, "campaignId.$id": campaign_oid},
                        {"$set": {
                            "assignedTo": {"$ref": "users", "$id": agent_oid},
                            "assignedAt": now,
                            "assignedBy": {"$ref": "users", "$id": user_oid},
                            "campaignStatus": CAMPAIGN_LEAD_STATUS.ASSIGNED,
                            "updatedAt": now,
                        }},
                        session=session,
                    )

                    if result.matched_count == 0:
                        raise AppException(404, "Campaign lead not found")

                    # Track first assignment: increment campaign.assignedLeads
                    # Only count if previously unassigned
                    prev_doc = await cl_collection.find_one({"_id": cl_oid})
                    if prev_doc and not prev_doc.get("assignedTo"):
                        camp_collection = self._collection()
                        await camp_collection.update_one(
                            {"_id": campaign_oid},
                            {"$inc": {"assignedLeads": 1}, "$set": {"updatedAt": now}},
                            session=session,
                        )

                    return {"assigned": True, "agentId": str(agent_oid)}

                except AppException:
                    raise
                except Exception as e:
                    traceback.print_exc()
                    raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # DISTRIBUTE — EQUAL MODE
    # ─────────────────────────────────────────────────────────────────────────

    async def distribute_equal(
        self,
        campaign_id: str,
        user: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Evenly distributes all UNASSIGNED campaign leads across the campaign's agents.
        Uses round-robin for the remainder.
        """
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    campaign = await self._get_campaign_or_404(campaign_id)
                    campaign_oid = campaign.id

                    if campaign.distributionMode != CAMPAIGN_DISTRIBUTION_MODE.EQUAL:
                        raise AppException(
                            400,
                            "This campaign is not configured for EQUAL distribution"
                        )

                    agents_raw = campaign.agents or []
                    if not agents_raw:
                        raise AppException(400, "Campaign has no agents assigned")

                    # Read agents from raw document to avoid Beanie Link resolution
                    camp_raw = await self._collection().find_one({"_id": campaign_oid})
                    agent_ids: List[PydanticObjectId] = [
                        ref["$id"]
                        for ref in (camp_raw.get("agents") or [])
                        if isinstance(ref, dict) and "$id" in ref
                    ]
                    if not agent_ids:
                        raise AppException(400, "Campaign has no valid agents assigned")

                    cl_collection = self._lead_collection()
                    unassigned = await cl_collection.find(
                        {"campaignId.$id": campaign_oid, "campaignStatus": "unassigned"}
                    ).sort("importedAt", 1).to_list(length=None)

                    if not unassigned:
                        return {"distributed": 0, "message": "No unassigned leads found"}

                    now = datetime.now(timezone.utc)
                    user_oid = PydanticObjectId(user["_id"])
                    num_agents = len(agent_ids)
                    distributed = 0

                    from pymongo import UpdateOne
                    bulk_ops = []

                    for idx, cl_doc in enumerate(unassigned):
                        agent_oid = agent_ids[idx % num_agents]
                        bulk_ops.append(
                            UpdateOne(
                                {"_id": cl_doc["_id"]},
                                {"$set": {
                                    "assignedTo": {"$ref": "users", "$id": agent_oid},
                                    "assignedAt": now,
                                    "assignedBy": {"$ref": "users", "$id": user_oid},
                                    "campaignStatus": CAMPAIGN_LEAD_STATUS.ASSIGNED,
                                    "updatedAt": now,
                                }},
                            )
                        )
                        distributed += 1

                    if bulk_ops:
                        await cl_collection.bulk_write(bulk_ops, session=session)
                        camp_collection = self._collection()
                        await camp_collection.update_one(
                            {"_id": campaign_oid},
                            {"$inc": {"assignedLeads": distributed}, "$set": {"updatedAt": now}},
                            session=session,
                        )

                    return {"distributed": distributed, "agents": num_agents}

                except AppException:
                    raise
                except Exception as e:
                    traceback.print_exc()
                    raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # CLAIM NEXT LEAD — ON DEMAND MODE
    # ─────────────────────────────────────────────────────────────────────────

    async def claim_next_lead(
        self,
        campaign_id: str,
        user: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Atomically claims the next available (unassigned) campaign lead
        for the requesting agent. Race-condition-safe via findOneAndUpdate.
        """
        try:
            campaign = await self._get_campaign_or_404(campaign_id)

            if campaign.distributionMode != CAMPAIGN_DISTRIBUTION_MODE.ON_DEMAND:
                raise AppException(
                    400,
                    "This campaign is not configured for ON DEMAND distribution"
                )

            campaign_oid = campaign.id
            agent_oid = PydanticObjectId(user["_id"])
            now = datetime.now(timezone.utc)

            cl_collection = self._lead_collection()
            claimed = await cl_collection.find_one_and_update(
                {"campaignId.$id": campaign_oid, "campaignStatus": "unassigned"},
                {"$set": {
                    "assignedTo": {"$ref": "users", "$id": agent_oid},
                    "assignedAt": now,
                    "claimedAt": now,
                    "campaignStatus": CAMPAIGN_LEAD_STATUS.ASSIGNED,
                    "updatedAt": now,
                }},
                sort=[("importedAt", 1)],
                return_document=True,
            )

            if not claimed:
                return {"claimed": False, "message": "No unassigned leads available"}

            # $inc assignedLeads on campaign
            camp_collection = self._collection()
            await camp_collection.update_one(
                {"_id": campaign_oid},
                {"$inc": {"assignedLeads": 1}, "$set": {"updatedAt": now}},
            )

            # Fetch joined lead details
            pipeline = [
                {"$match": {"_id": claimed["_id"]}},
                {
                    "$lookup": {
                        "from": "leads",
                        "localField": "leadId.$id",
                        "foreignField": "_id",
                        "as": "lead",
                    }
                },
                {"$unwind": {"path": "$lead", "preserveNullAndEmptyArrays": True}},
                {
                    "$project": {
                        "_id": {"$toString": "$_id"},
                        "campaignStatus": 1,
                        "claimedAt": 1,
                        "lead.lead_id": 1,
                        "lead.fullName": 1,
                        "lead.status": 1,
                        "lead.priority": 1,
                        "lead.companyName": 1,
                    }
                },
            ]
            enriched = await cl_collection.aggregate(pipeline).to_list(length=1)

            return {
                "claimed": True,
                "campaignLead": enriched[0] if enriched else {"_id": str(claimed["_id"])},
            }

        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")
