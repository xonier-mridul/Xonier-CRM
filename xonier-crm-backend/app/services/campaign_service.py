from app.utils.lead_assignment_access import require_lead_assigner, require_lower_assignee
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
from app.utils.pipeline_stats import matches_pipeline_filter, summarize_lead_groups
from app.utils.validate_admin import validate_admin_company_admin


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

    async def _get_campaign_or_404(self, campaign_id: str, user: Dict[str, Any] | None = None) -> CampaignModel:
        """Fetch campaign by string ObjectId; raise 404 if not found or deleted."""
        campaign = await self.repo.find_by_id(PydanticObjectId(campaign_id))
        if not campaign or campaign.deletedAt is not None:
            raise AppException(404, "Campaign not found")
        if user and not validate_admin_company_admin(user.get("userRole", [])):
            visible_campaigns, _, _ = await self._get_user_campaign_scope(user)
            if not any(str(item.get("_id")) == str(campaign.id) for item in visible_campaigns):
                raise AppException(404, "Campaign not found")
        return campaign

    def _collection(self):
        return CampaignModel.get_pymongo_collection()

    def _lead_collection(self):
        return CampaignLeadModel.get_pymongo_collection()

    def _global_leads_collection(self):
        return LeadsModel.get_pymongo_collection()

    @staticmethod
    def _reference_id(value):
        if isinstance(value, dict) and "$id" in value:
            return value["$id"]
        if hasattr(value, "ref"):
            return value.ref.id
        if hasattr(value, "id"):
            return value.id
        return value

    async def _get_user_campaign_scope(self, user: Dict[str, Any], campaigns=None):
        """Return campaigns and campaign-lead IDs visible to this user."""
        company_oid = PydanticObjectId(user["companyId"])
        if campaigns is None:
            campaigns = await self._collection().find(
                {"companyId": company_oid, "deletedAt": None, "status": {"$ne": "deleted"}}
            ).to_list(length=None)
        if validate_admin_company_admin(user.get("userRole", [])):
            return campaigns, None, None

        user_oid = PydanticObjectId(user["_id"])
        all_campaign_ids = [campaign["_id"] for campaign in campaigns]
        own_leads = await self._global_leads_collection().find(
            {
                "companyId": company_oid,
                "deletedAt": None,
                "$or": [
                    {"createdBy.$id": user_oid},
                    {"assignedTo.$id": user_oid},
                ],
            },
            {"_id": 1},
        ).to_list(length=None)
        own_lead_ids = [lead["_id"] for lead in own_leads]

        campaign_links = []
        if all_campaign_ids:
            campaign_links = await self._lead_collection().find(
                {
                    "companyId": company_oid,
                    "$or": [
                        {"campaignId.$id": {"$in": all_campaign_ids}},
                        {"campaignId": {"$in": all_campaign_ids}},
                    ],
                    "$and": [{
                        "$or": [
                            {"assignedTo.$id": user_oid},
                            {"leadId.$id": {"$in": own_lead_ids}},
                            {"leadId": {"$in": own_lead_ids}},
                        ]
                    }],
                },
                {"campaignId": 1, "leadId": 1, "assignedTo": 1, "campaignStatus": 1},
            ).to_list(length=None)

        personal_campaign_ids = set()
        personal_lead_ids = set()
        personal_links_by_campaign = {}
        for link in campaign_links:
            campaign_id = self._reference_id(link.get("campaignId"))
            lead_id = self._reference_id(link.get("leadId"))
            if campaign_id and lead_id:
                personal_campaign_ids.add(str(campaign_id))
                personal_lead_ids.add(lead_id)
                personal_links_by_campaign.setdefault(str(campaign_id), []).append(link)

        visible_campaigns = []
        membership_campaign_ids = set()
        for campaign in campaigns:
            manager_ids = {self._reference_id(ref) for ref in campaign.get("managers", []) or []}
            agent_ids = {self._reference_id(ref) for ref in campaign.get("agents", []) or []}
            creator_id = self._reference_id(campaign.get("createdBy"))
            is_member = user_oid in manager_ids or user_oid in agent_ids or creator_id == user_oid
            if is_member or str(campaign["_id"]) in personal_campaign_ids:
                visible_campaigns.append(campaign)
                if is_member:
                    membership_campaign_ids.add(campaign["_id"])

        return visible_campaigns, personal_lead_ids, {
            "userId": user_oid,
            "ownLeadIds": set(own_lead_ids),
            "linksByCampaign": personal_links_by_campaign,
            "membershipCampaignIds": membership_campaign_ids,
        }

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
                        "status": payload.get("status", CAMPAIGN_STATUS.ACTIVE),
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

            sort_field = filters.get("sortField", "createdAt")
            sort_order_str = filters.get("sortOrder", "desc")
            sort_order = -1 if sort_order_str == "desc" else 1

            user_scope = None
            if not validate_admin_company_admin(user.get("userRole", [])):
                visible_campaigns, _, user_scope = await self._get_user_campaign_scope(user)
                visible_campaign_ids = [campaign["_id"] for campaign in visible_campaigns]
                if not visible_campaign_ids:
                    return {"data": [], "page": page, "totalPages": 0, "limit": limit}
                query["_id"] = {"$in": visible_campaign_ids}
            
            result = await self.repo.get_all(
                page=page,
                limit=limit,
                filters=query,
                populate=["managers", "agents", "createdBy"],
                sort=[(sort_field, sort_order)],
            )

            if user_scope:
                user_id = user_scope["userId"]
                for campaign in result.get("data", []):
                    campaign_id = PydanticObjectId(campaign.get("id") or campaign.get("_id"))
                    personal_links = user_scope["linksByCampaign"].get(str(campaign_id), [])
                    campaign["totalLeads"] = len(personal_links)
                    campaign["assignedLeads"] = sum(
                        self._reference_id(link.get("assignedTo")) == user_id
                        for link in personal_links
                    )
                    campaign["completedLeads"] = sum(
                        self._reference_id(link.get("campaignStatus"))
                        in {CAMPAIGN_LEAD_STATUS.COMPLETED, CAMPAIGN_LEAD_STATUS.COMPLETED.value}
                        for link in personal_links
                    )
                    campaign["agents"] = [
                        agent for agent in campaign.get("agents", [])
                        if str(self._reference_id(agent.get("id") or agent.get("_id"))) == str(user_id)
                    ]
                    campaign["managers"] = [
                        manager for manager in campaign.get("managers", [])
                        if str(self._reference_id(manager.get("id") or manager.get("_id"))) == str(user_id)
                    ]
                    if campaign.get("createdBy") and PydanticObjectId(
                        campaign["createdBy"].get("id") or campaign["createdBy"].get("_id")
                    ) != user_id:
                        campaign["createdBy"] = None

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

            if not validate_admin_company_admin(user.get("userRole", [])):
                visible_campaigns, _, _ = await self._get_user_campaign_scope(user)
                if not any(str(item.get("_id")) == str(campaign.id) for item in visible_campaigns):
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
                    campaign = await self._get_campaign_or_404(campaign_id, user)
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
                    campaign = await self._get_campaign_or_404(campaign_id, user)
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
                    campaign = await self._get_campaign_or_404(campaign_id, user)
                    user_oid = PydanticObjectId(user["_id"])
                    now = datetime.now(timezone.utc)

                    collection = self._collection()
                    # ⚠️  SOFT DELETE ONLY — never delete LeadsModel or CampaignLeadModel records.
                    # Leads are independent entities; campaign deletion only marks the campaign
                    # as deleted. CampaignLeadModel junction records are intentionally retained
                    # for audit/history purposes.
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
        campaign = None
        inserted_count = 0
        result_payload: Dict[str, Any] = {}
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    campaign = await self._get_campaign_or_404(campaign_id, user)
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

                            dup_key = (hashed_email, hashed_phone, project_type or None)
                            if dup_key in existing_set:
                                skipped.append({
                                    "email": lead.get("email"),
                                    "phone": phone or "N/A",
                                    "reason": "Duplicate lead (same email, phone, project type)",
                                })
                                continue
                            # Also guard against duplicates inside the same upload
                            existing_set.add(dup_key)

                            # Normalize fields that are Enums so they match backend expectations.
                            # CSV may provide "Medium", "Cold Call", etc. which causes Pydantic validation to fail.
                            raw_priority = str(lead.get("priority") or "medium").strip().lower()
                            raw_source = str(lead.get("source") or "other").strip().lower().replace(" ", "_")
                            raw_status = str(lead.get("status") or "new").strip().lower().replace(" ", "_")
                            raw_project_type = lead.get("projectType")
                            if raw_project_type:
                                raw_project_type = str(raw_project_type).strip().lower().replace(" ", "_")

                            # Normalize language: CSV may send full names like "English", "Hindi"
                            # instead of ISO codes like "en", "hi". Map them here.
                            LANGUAGE_NAME_TO_CODE = {
                                "english": "en", "spanish": "es", "french": "fr", "german": "de",
                                "italian": "it", "portuguese": "pt", "dutch": "nl", "russian": "ru",
                                "ukrainian": "uk", "polish": "pl", "czech": "cs", "slovak": "sk",
                                "hungarian": "hu", "romanian": "ro", "bulgarian": "bg", "greek": "el",
                                "turkish": "tr", "arabic": "ar", "hebrew": "he", "persian": "fa",
                                "urdu": "ur", "hindi": "hi", "bengali": "bn", "tamil": "ta",
                                "telugu": "te", "marathi": "mr", "gujarati": "gu", "kannada": "kn",
                                "malayalam": "ml", "punjabi": "pa", "chinese": "zh", "japanese": "ja",
                                "korean": "ko", "thai": "th", "vietnamese": "vi", "indonesian": "id",
                                "malay": "ms", "filipino": "tl", "tagalog": "tl", "swedish": "sv",
                                "norwegian": "no", "danish": "da", "finnish": "fi", "icelandic": "is",
                                "afrikaans": "af", "swahili": "sw", "zulu": "zu", "latin": "la",
                            }
                            raw_language = lead.get("language")
                            if raw_language:
                                lang_lower = str(raw_language).strip().lower()
                                raw_language = LANGUAGE_NAME_TO_CODE.get(lang_lower, lang_lower)

                            # Normalize postalCode: CSV sends strings, schema expects int
                            raw_postal_code = lead.get("postalCode")
                            if raw_postal_code is not None and raw_postal_code != "":
                                try:
                                    raw_postal_code = int(str(raw_postal_code).strip())
                                except (ValueError, TypeError):
                                    raw_postal_code = None

                            # Normalize employeeSeniority: CSV may send "Senior Level" instead of "senior_level"
                            raw_seniority = lead.get("employeeSeniority")
                            if raw_seniority:
                                raw_seniority = str(raw_seniority).strip().lower().replace(" ", "_")

                            # Restore LeadsCreateSchema validation to ensure we respect manual lead creation rules.
                            try:
                                lead_for_validation = {
                                    **lead,
                                    "priority": raw_priority,
                                    "source": raw_source,
                                    "status": raw_status,
                                    "projectType": raw_project_type,
                                    "meetingScheduled": lead.get("meetingScheduled") or "no",
                                    "language": raw_language,
                                    "postalCode": raw_postal_code,
                                    "employeeSeniority": raw_seniority,
                                }
                                LeadsCreateSchema(**lead_for_validation)
                            except Exception as ve:
                                with open("import_errors.log", "a") as f:
                                    f.write(f"Failed lead: {lead.get('email')} - Error: {ve}\n")
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
                                "priority": raw_priority,
                                "source": raw_source,
                                "status": raw_status,
                                "createdBy": user_oid,
                                "leadSource": LEAD_SOURCE_TYPE.BULK_IMPORTED,
                                
                            }
                            if encrypted_phone:
                                lead_doc_data["phone"] = encrypted_phone
                            if hashed_phone:
                                lead_doc_data["hashedPhone"] = hashed_phone
                            if raw_project_type:
                                lead_doc_data["projectType"] = raw_project_type

                            optional_fields = {
                                "companyName": lead.get("companyName"),
                                "city": lead.get("city"),
                                "country": lead.get("country"),
                                "postalCode": raw_postal_code,
                                "language": raw_language,
                                "industry": lead.get("industry"),
                                "employeeRole": lead.get("employeeRole"),
                                "employeeSeniority": raw_seniority,
                                "message": lead.get("message"),
                                "membershipNotes": lead.get("membershipNotes"),
                                # Per-lead dataTag from CSV takes priority, fallback to batch-level
                                "dataTag": lead.get("dataTag") or data_tag,
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
                            insert_result = await LeadsModel.insert_many(documents=leads_to_insert, session=session)
                            inserted_ids = insert_result.inserted_ids
                            # Assign the inserted IDs back to the model instances
                            for i, _id in enumerate(inserted_ids):
                                leads_to_insert[i].id = _id
                            
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

                    with open("skipped_reasons.log", "w") as f:
                        import json
                        f.write(json.dumps(skipped, indent=2))
                    
                    result_payload = {
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

        # Execute auto-distribution OUTSIDE the transaction if campaign has agents
        if (
            campaign
            and inserted_count > 0
            and campaign.distributionMode != CAMPAIGN_DISTRIBUTION_MODE.ON_DEMAND
        ):
            try:
                camp_raw = await self._collection().find_one({"_id": campaign.id})
                has_agents = bool((camp_raw or {}).get("agents"))
                if has_agents:
                    dist_res = await self._distribute_to_agents(campaign, user)
                    result_payload["distributed"] = dist_res.get("distributed", 0)
                    print(f"[import_leads] Auto-distributed {result_payload.get('distributed', 0)} leads")
            except Exception as e:
                traceback.print_exc()
                print(f"[import_leads] Auto-distribution failed: {e}")

        return result_payload

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
            await self._get_campaign_or_404(campaign_id, user)
            campaign_oid = PydanticObjectId(campaign_id)

            page = int(filters.get("page", 1))
            limit = int(filters.get("limit", 20))
            status_filter = filters.get("campaignStatus")
            skip = (page - 1) * limit

            match: Dict[str, Any] = {
                "$or": [{"campaignId.$id": campaign_oid}, {"campaignId": campaign_oid}],
            }

            is_admin = validate_admin_company_admin(user.get("userRole", []))
            user_scope = None
            if not is_admin:
                visible_campaigns, _, user_scope = await self._get_user_campaign_scope(user)
                if not any(str(item.get("_id")) == str(campaign_oid) for item in visible_campaigns):
                    raise AppException(404, "Campaign not found")

            # Campaign ownership is independent of global lead ownership.
            # All regular members see only their own assignment and the pool.
            match["companyId"] = PydanticObjectId(user["companyId"])
            uid = PydanticObjectId(user["_id"])
            if not is_admin:
                match = {"$and": [match, {"$or": [
                    {"assignedTo.$id": uid},
                    {"assignedTo": uid},
                    {"assignedTo": None},
                ]}]}
            if status_filter:
                try:
                    match["campaignStatus"] = CAMPAIGN_LEAD_STATUS(status_filter)
                except ValueError:
                    raise AppException(400, f"Invalid campaignStatus filter: {status_filter}")

            collection = self._lead_collection()

            pipeline = [
                {"$match": match},
                {"$sort": {"importedAt": -1}},
                # Extract raw ObjectId from Beanie DBRef before $lookup
                {
                    "$addFields": {
                        "leadOid": {"$ifNull": ["$leadId.$id", "$leadId"]},
                        "assignedOid": {"$ifNull": ["$assignedTo.$id", "$assignedTo"]},
                    }
                },
                {
                    "$lookup": {
                        "from": "leads",
                        "localField": "leadOid",
                        "foreignField": "_id",
                        "as": "lead",
                    }
                },
                {"$unwind": {"path": "$lead", "preserveNullAndEmptyArrays": True}},
                *([{"$match": {
                    "lead.companyId": PydanticObjectId(user["companyId"]),
                    "lead.deletedAt": None,
                    "lead.status": {"$nin": ["delete", "deleted"]},
                }}] if not is_admin else []),
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "assignedOid",
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
                            "connectStatus": "$lead.connectStatus",
                            "followUpAt": "$lead.followUpAt",
                            "phone": "$lead.phone",
                        },
                        "assignedTo": {
                            "_id": {"$toString": "$assignedUser._id"},
                            "firstName": "$assignedUser.firstName",
                            "lastName": "$assignedUser.lastName",
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
            # A campaign phone number is only sent in readable form to the agent
            # who owns that campaign lead. The call endpoint repeats this check.
            for item in data:
                lead_data = item.get("lead") or {}
                is_assigned_to_requester = str((item.get("assignedTo") or {}).get("_id") or "") == str(user["_id"])
                if is_assigned_to_requester and lead_data.get("phone"):
                    try:
                        lead_data["phone"] = self.encryption.decrypt_data(lead_data["phone"])
                    except Exception:
                        # Keep the value unavailable rather than exposing encrypted data.
                        lead_data["phone"] = None
                else:
                    lead_data.pop("phone", None)
            total_count_list = result[0].get("totalCount", [])
            total = total_count_list[0].get("count", 0) if total_count_list else 0
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
                    await self._get_campaign_or_404(campaign_id, user)
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
        require_lead_assigner(user)
        target = await self.userRepo.find_one(
            {"_id": PydanticObjectId(payload["agentId"]), "deletedAt": None,
             "companyId": PydanticObjectId(user["companyId"])}, populate=["userRole"])
        if not target:
            raise AppException(404, "Agent not found")
        require_lower_assignee(user, jsonable_encoder(target))
        async with await self.client.start_session() as session:
            async with session.start_transaction():
                try:
                    campaign = await self._get_campaign_or_404(campaign_id, user)
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
                    
                    prev_doc = await cl_collection.find_one({"_id": cl_oid, "campaignId.$id": campaign_oid})
                    if not prev_doc:
                        raise AppException(404, "Campaign lead not found")
                        
                    lead_ref = prev_doc.get("leadId")
                    lead_oid = None
                    if hasattr(lead_ref, "id"):
                        lead_oid = lead_ref.id
                    elif isinstance(lead_ref, dict) and "$id" in lead_ref:
                        lead_oid = lead_ref["$id"]
                        
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

                    # Track first assignment: increment campaign.assignedLeads
                    # Only count if previously unassigned
                    if not prev_doc.get("assignedTo"):
                        camp_collection = self._collection()
                        await camp_collection.update_one(
                            {"_id": campaign_oid},
                            {"$inc": {"assignedLeads": 1}, "$set": {"updatedAt": now}},
                            session=session,
                        )

                    # Sync global LeadsModel
                    if lead_oid:
                        global_leads_collection = self._global_leads_collection()
                        await global_leads_collection.update_one(
                            {"_id": lead_oid},
                            {
                                "$addToSet": {
                                    "assignedTo": {"$ref": "users", "$id": agent_oid}
                                },
                                "$set": {
                                    "isAssigned": True,
                                    "assignedAt": now,
                                    "assignedBy": {"$ref": "users", "$id": user_oid},
                                    "updatedAt": now,
                                }
                            },
                            session=session
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

    async def _distribute_to_agents(
        self,
        campaign: Any,
        user: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Internal helper: Distribute UNASSIGNED campaign leads across the campaign's agents
        using round-robin. Works for any distribution mode.
        """
        campaign_oid = campaign.id

        camp_raw = await self._collection().find_one({"_id": campaign_oid})
        agent_ids: List[PydanticObjectId] = []
        for ref in (camp_raw.get("agents") or []):
            # Motor returns bson.DBRef objects; handle both DBRef and dict formats
            if hasattr(ref, "id"):
                agent_ids.append(PydanticObjectId(ref.id))
            elif isinstance(ref, dict) and "$id" in ref:
                agent_ids.append(PydanticObjectId(ref["$id"]))
        if not agent_ids:
            return {"distributed": 0, "message": "No agents found"}

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

        # Track which lead -> agent mapping for syncing global LeadsModel
        from pymongo import UpdateOne
        lead_agent_map: Dict[Any, PydanticObjectId] = {}
        bulk_ops = []
        for idx, cl_doc in enumerate(unassigned):
            agent_oid = agent_ids[idx % num_agents]
            # Get the leadId from the campaign_lead doc
            lead_ref = cl_doc.get("leadId")
            lead_oid = None
            if hasattr(lead_ref, "id"):
                lead_oid = lead_ref.id
            elif isinstance(lead_ref, dict) and "$id" in lead_ref:
                lead_oid = lead_ref["$id"]
            
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
            if lead_oid:
                lead_agent_map[lead_oid] = agent_oid
            distributed += 1

        if bulk_ops:
            await cl_collection.bulk_write(bulk_ops)
            await self._collection().update_one(
                {"_id": campaign_oid},
                {"$inc": {"assignedLeads": distributed}, "$set": {"updatedAt": now}},
            )

            # ── Sync global LeadsModel.assignedTo ─────────────────────────
            # Each lead's global assignedTo list gets the agent added (no duplicates)
            if lead_agent_map:
                leads_collection = self._global_leads_collection()
                lead_bulk_ops = [
                    UpdateOne(
                        {"_id": lead_oid},
                        {
                            "$addToSet": {
                                "assignedTo": {"$ref": "users", "$id": agent_oid}
                            },
                            "$set": {
                                "isAssigned": True,
                                "assignedAt": now,
                                "assignedBy": {"$ref": "users", "$id": user_oid},
                                "updatedAt": now,
                            }
                        },
                    )
                    for lead_oid, agent_oid in lead_agent_map.items()
                ]
                await leads_collection.bulk_write(lead_bulk_ops)

        return {"distributed": distributed, "agents": num_agents}

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
                    campaign = await self._get_campaign_or_404(campaign_id, user)
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
                    agent_ids: List[PydanticObjectId] = []
                    for ref in (camp_raw.get("agents") or []):
                        if hasattr(ref, "id"):
                            agent_ids.append(PydanticObjectId(ref.id))
                        elif isinstance(ref, dict) and "$id" in ref:
                            agent_ids.append(PydanticObjectId(ref["$id"]))
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

                        # Sync global LeadsModel
                        leads_collection = self._global_leads_collection()
                        lead_bulk_ops = []
                        for idx, cl_doc in enumerate(unassigned):
                            agent_oid = agent_ids[idx % num_agents]
                            lead_ref = cl_doc.get("leadId")
                            lead_oid = None
                            if hasattr(lead_ref, "id"):
                                lead_oid = lead_ref.id
                            elif isinstance(lead_ref, dict) and "$id" in lead_ref:
                                lead_oid = lead_ref["$id"]
                                
                            if lead_oid:
                                lead_bulk_ops.append(
                                    UpdateOne(
                                        {"_id": lead_oid},
                                        {
                                            "$addToSet": {
                                                "assignedTo": {"$ref": "users", "$id": agent_oid}
                                            },
                                            "$set": {
                                                "isAssigned": True,
                                                "assignedAt": now,
                                                "assignedBy": {"$ref": "users", "$id": user_oid},
                                                "updatedAt": now,
                                            }
                                        }
                                    )
                                )
                        if lead_bulk_ops:
                            await leads_collection.bulk_write(lead_bulk_ops, session=session)

                    return {"distributed": distributed, "agents": num_agents}

                except AppException:
                    raise
                except Exception as e:
                    traceback.print_exc()
                    raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # CLAIM NEXT LEAD — ON DEMAND MODE
    # ─────────────────────────────────────────────────────────────────────────

    def _require_claim_member(self, campaign, user):
        uid = PydanticObjectId(user["_id"])
        if str(campaign.companyId) != str(user["companyId"]):
            raise AppException(404, "Campaign not found")
        if validate_admin_company_admin(user.get("userRole", [])):
            return
        members = [*(campaign.agents or []), *(campaign.managers or []), campaign.createdBy]
        if uid not in {self._reference_id(ref) for ref in members}:
            raise AppException(403, "Only campaign members can claim its leads")

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
            campaign = await self._get_campaign_or_404(campaign_id, user)
            self._require_claim_member(campaign, user)

            if campaign.status == CAMPAIGN_STATUS.PAUSED:
                raise AppException(400, "This campaign is paused. Calling is disabled until it is resumed")

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
                {"companyId": PydanticObjectId(user["companyId"]),
                 "$or": [{"campaignId.$id": campaign_oid}, {"campaignId": campaign_oid}],
                 "assignedTo": None},
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

    async def claim_lead(
        self,
        campaign_id: str,
        campaign_lead_id: str,
        user: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Atomically claim a specific unassigned campaign lead. If someone else
        already took it, the filter fails and a 409 is returned.
        """
        try:
            campaign = await self._get_campaign_or_404(campaign_id, user)
            self._require_claim_member(campaign, user)
            if campaign.status == CAMPAIGN_STATUS.PAUSED:
                raise AppException(400, "This campaign is paused. Calling is disabled until it is resumed")

            try:
                cl_oid = PydanticObjectId(campaign_lead_id)
            except Exception:
                raise AppException(400, "Invalid campaign lead id")

            agent_oid = PydanticObjectId(user["_id"])
            now = datetime.now(timezone.utc)
            cl_collection = self._lead_collection()

            claimed = await cl_collection.find_one_and_update(
                {
                    "_id": cl_oid,
                    "companyId": PydanticObjectId(user["companyId"]),
                    "$or": [{"campaignId.$id": campaign.id}, {"campaignId": campaign.id}],
                    "assignedTo": None,
                },
                {"$set": {
                    "assignedTo": {"$ref": "users", "$id": agent_oid},
                    "assignedAt": now,
                    "claimedAt": now,
                    "campaignStatus": CAMPAIGN_LEAD_STATUS.ASSIGNED,
                    "updatedAt": now,
                }},
                return_document=True,
            )
            newly_claimed = claimed is not None
            if not claimed:
                claimed = await cl_collection.find_one({
                    "_id": cl_oid,
                    "companyId": PydanticObjectId(user["companyId"]),
                    "$or": [{"campaignId.$id": campaign.id}, {"campaignId": campaign.id}],
                })
                if not claimed:
                    raise AppException(404, "Campaign lead not found")
                if self._reference_id(claimed.get("assignedTo")) != agent_oid:
                    raise AppException(409, "This lead has already been taken by someone else")

            # Retries can repair global assignment without counting a second claim.
            if newly_claimed:
                await self._collection().update_one(
                    {"_id": campaign.id, "companyId": PydanticObjectId(user["companyId"])},
                    {"$inc": {"assignedLeads": 1}, "$set": {"updatedAt": now}},
                )

            lead_oid = self._reference_id(claimed.get("leadId"))
            if lead_oid:
                await self._global_leads_collection().update_one(
                    {"_id": lead_oid, "companyId": PydanticObjectId(user["companyId"])},
                    {
                        "$addToSet": {"assignedTo": {"$ref": "users", "$id": agent_oid}},
                        "$set": {
                            "isAssigned": True,
                            "assignedAt": now,
                            "assignedBy": {"$ref": "users", "$id": agent_oid},
                            "updatedAt": now,
                        },
                    },
                )

            return {
                "claimed": True,
                "leadId": str(lead_oid) if lead_oid else None,
                "campaignLeadId": str(cl_oid),
            }
        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # ENGAGEMENT STATS — connectStatus counts across all campaign leads
    # ─────────────────────────────────────────────────────────────────────────

    async def get_pipeline_leads(self, filters: Dict[str, Any], user: Dict[str, Any]) -> Dict[str, Any]:
        """Return paginated campaign leads for a clickable pipeline metric."""
        try:
            company_oid = PydanticObjectId(user["companyId"])
            page = max(int(filters.get("page") or 1), 1)
            limit = min(max(int(filters.get("limit") or 10), 1), 100)
            filter_name = str(filters.get("filter") or "all").strip().lower()
            search = str(filters.get("search") or "").strip().lower()

            campaigns = await self._collection().find(
                {"companyId": company_oid, "deletedAt": None, "status": {"$ne": "deleted"}},
                {"_id": 1, "managers": 1, "agents": 1, "createdBy": 1},
            ).to_list(length=None)
            is_admin = validate_admin_company_admin(user.get("userRole", []))
            user_scope = None
            if not is_admin:
                campaigns, _, user_scope = await self._get_user_campaign_scope(user, campaigns)
            campaign_ids = [campaign["_id"] for campaign in campaigns]
            if not campaign_ids:
                return {"data": [], "page": page, "limit": limit, "total": 0, "totalPages": 1}

            # A lead can be in more than one campaign. Keep the same unique-lead
            # scope used by get_engagement_stats before applying the metric.
            link_match = {
                "$or": [
                    {"campaignId.$id": {"$in": campaign_ids}},
                    {"campaignId": {"$in": campaign_ids}},
                ],
            }
            if user_scope:
                own_lead_ids = list(user_scope["ownLeadIds"])
                link_match = {"$and": [link_match, {"$or": [
                    {"assignedTo.$id": user_scope["userId"]},
                    {"leadId.$id": {"$in": own_lead_ids}},
                    {"leadId": {"$in": own_lead_ids}},
                ]}]}

            lead_groups = await self._lead_collection().aggregate([
                {"$match": link_match},
                {"$group": {"_id": {"$ifNull": ["$leadId.$id", "$leadId"]}}},
            ]).to_list(length=None)
            lead_ids = [group["_id"] for group in lead_groups if group.get("_id")]
            if not lead_ids:
                return {"data": [], "page": page, "limit": limit, "total": 0, "totalPages": 1}

            leads = await LeadsModel.find({
                "_id": {"$in": lead_ids},
                "companyId": company_oid,
                "deletedAt": None,
                "status": {"$nin": ["delete", "deleted"]},
            }).sort("-createdAt").to_list(length=None)

            matching_leads = []
            for lead in leads:
                lead_data = lead.model_dump(mode="json", exclude={"hashedEmail", "hashedPhone"})
                lead_data["customStatuses"] = [
                    {"k": key, "v": value}
                    for key, value in (lead_data.get("extraFields") or {}).items()
                ]
                if not matches_pipeline_filter(lead_data, filter_name):
                    continue

                if search:
                    searchable = " ".join(
                        str(lead_data.get(field) or "")
                        for field in (
                            "lead_id", "fullName", "companyName", "city", "source",
                            "projectType", "dataTag", "status", "connectStatus",
                        )
                    ).lower()
                    if search not in searchable:
                        continue
                matching_leads.append(lead)

            total = len(matching_leads)
            start = (page - 1) * limit
            page_leads = matching_leads[start:start + limit]

            serialized = []
            for lead in page_leads:
                # Fetch only the people needed by the table and strip credentials
                # from the response.
                for field in ("createdBy", "assignedTo", "assignedBy"):
                    value = getattr(lead, field, None)
                    if hasattr(value, "fetch"):
                        setattr(lead, field, await value.fetch())
                    elif isinstance(value, list):
                        setattr(lead, field, [
                            await item.fetch() if hasattr(item, "fetch") else item
                            for item in value
                        ])

                item = lead.model_dump(mode="json", exclude={"hashedEmail", "hashedPhone"})
                for field in ("email", "phone"):
                    if item.get(field):
                        item[field] = self.encryption.decrypt_data(item[field])

                def safe_user(value):
                    if not value:
                        return None
                    return {
                        "id": str(value.get("id") or value.get("_id")) if isinstance(value, dict) else str(value.id),
                        "firstName": value.get("firstName") if isinstance(value, dict) else value.firstName,
                        "lastName": value.get("lastName") if isinstance(value, dict) else value.lastName,
                    }

                item["createdBy"] = safe_user(item.get("createdBy"))
                item["assignedBy"] = safe_user(item.get("assignedBy"))
                item["assignedTo"] = [safe_user(value) for value in item.get("assignedTo") or []]
                serialized.append(item)

            return {
                "data": serialized,
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": max((total + limit - 1) // limit, 1),
            }
        except AppException:
            raise
        except (TypeError, ValueError) as e:
            raise AppException(400, f"Invalid pipeline lead filter: {e}")
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    async def get_engagement_stats(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Aggregates lead lifecycle, engagement, and custom sales-status counts for
        the unique leads that appear in any non-deleted campaign of this company.
        """
        try:
            camp_collection = self._collection()
            company_oid = PydanticObjectId(user["companyId"])
            campaigns = await camp_collection.find(
                {"companyId": company_oid, "deletedAt": None, "status": {"$ne": "deleted"}},
                {"_id": 1, "status": 1, "managers": 1, "agents": 1, "createdBy": 1},
            ).to_list(length=None)
            is_admin = validate_admin_company_admin(user.get("userRole", []))
            user_scope = None
            if not is_admin:
                campaigns, _, user_scope = await self._get_user_campaign_scope(user, campaigns)
            campaign_ids = [c["_id"] for c in campaigns]
            campaign_summary = {
                "total": len(campaigns),
                "active": sum(c.get("status") == "active" for c in campaigns),
                "paused": sum(c.get("status") == "paused" for c in campaigns),
            }
            if not campaign_ids:
                return {**summarize_lead_groups([]), "campaigns": campaign_summary}

            # Deduplicate before joining so multi-campaign leads count only once.
            # The join also enforces company scope and removes deleted leads.
            link_match = {
                "$or": [
                    {"campaignId.$id": {"$in": campaign_ids}},
                    {"campaignId": {"$in": campaign_ids}},
                ],
            }
            if user_scope:
                own_lead_ids = list(user_scope["ownLeadIds"])
                link_match = {"$and": [link_match, {"$or": [
                    {"assignedTo.$id": user_scope["userId"]},
                    {"leadId.$id": {"$in": own_lead_ids}},
                    {"leadId": {"$in": own_lead_ids}},
                ]}]}

            pipeline = [
                {"$match": link_match},
                {"$group": {"_id": {"$ifNull": ["$leadId.$id", "$leadId"]}}},
                {"$lookup": {"from": "leads", "localField": "_id", "foreignField": "_id", "as": "lead"}},
                {"$unwind": "$lead"},
                {"$match": {
                    "lead.companyId": company_oid,
                    "lead.deletedAt": None,
                    "lead.status": {"$nin": ["delete", "deleted"]},
                }},
                {"$group": {
                    "_id": {
                        "status": "$lead.status",
                        "connectStatus": "$lead.connectStatus",
                        "meetingScheduled": "$lead.meetingScheduled",
                        "dataTag": "$lead.dataTag",
                        "projectType": "$lead.projectType",
                        "customStatuses": {"$filter": {
                            "input": {"$objectToArray": {"$ifNull": ["$lead.extraFields", {}]}},
                            "as": "field",
                            "cond": {"$regexMatch": {
                                "input": "$$field.k",
                                "regex": r"^(status|(?:lead|connect|engagement|sales|follow[\s_-]*up|demo|meeting)[\s_-]*status|(?:lead[\s_-]*)?stage|disposition)$",
                                "options": "i",
                            }},
                        }},
                    },
                    "count": {"$sum": 1},
                }},
            ]
            groups = await self._lead_collection().aggregate(pipeline).to_list(length=None)
            return {**summarize_lead_groups(groups), "campaigns": campaign_summary}

        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")
