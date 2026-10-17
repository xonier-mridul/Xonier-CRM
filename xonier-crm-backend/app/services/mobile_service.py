"""
Mobile (agent / user) APIs.

Everything here is scoped to the logged-in user:
  * "my leads"      -> leads whose assignedTo contains the user
  * "my campaigns"  -> campaigns where the user is an agent (or manager)
Within a campaign an agent can VIEW every lead (read-only for other agents' leads)
but can only change the status of / claim leads for themselves.

Business rules this relies on:
  * one lead belongs to one campaign and is assigned to one agent
  * EQUAL mode      -> leads are split between agents at import time
  * ON_DEMAND mode  -> leads stay `unassigned` until an agent claims one
"""
import re
import traceback
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from beanie import PydanticObjectId
from bson import ObjectId

from app.core.crypto import Encryption
from app.core.enums import CONTACT_STATUS
from app.core.security import hash_value
from app.db.models.campaign_lead_model import CampaignLeadModel
from app.db.models.campaign_model import CampaignModel
from app.db.models.lead_model import LeadsModel
from app.db.models.user_model import UserModel
from app.services.campaign_service import CampaignService
from app.services.lead_service import LeadService
from app.utils.custom_exception import AppException

DELETED_LEAD_STATUSES = ["delete", "deleted"]
CLOSED_LEAD_STATUSES = ["won", "lost", "delete", "deleted"]
HIDDEN_CAMPAIGN_STATUSES = ["deleted"]
PERIODS = ["today", "week", "month", "quarter"]


# ─── small helpers ────────────────────────────────────────────────────────────

def _oid(value: str, label: str) -> PydanticObjectId:
    try:
        return PydanticObjectId(value)
    except Exception:
        raise AppException(400, f"Invalid {label}")


def _ref_id(ref) -> Optional[ObjectId]:
    """Extract the ObjectId from a stored Beanie link (DBRef / dict / ObjectId)."""
    if ref is None:
        return None
    if isinstance(ref, ObjectId):
        return ref
    if isinstance(ref, dict):
        return ref.get("$id") or ref.get("id") or ref.get("_id")
    return getattr(ref, "id", None)


def _iso(value) -> Optional[str]:
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def _str(value) -> Optional[str]:
    return str(value) if value is not None else None


def _page_args(filters, default_limit: int = 20):
    try:
        page = max(int(filters.get("page") or 1), 1)
        limit = min(max(int(filters.get("limit") or default_limit), 1), 100)
    except (TypeError, ValueError):
        raise AppException(400, "page and limit must be numbers")
    return page, limit


def _own_expr(var: str, uid: ObjectId) -> Dict[str, Any]:
    """Aggregation expression -> 'mine' | 'unassigned' | 'other' for an assignee value."""
    return {
        "$cond": [
            {"$eq": [var, uid]},
            "mine",
            {"$cond": [{"$eq": [{"$ifNull": [var, None]}, None]}, "unassigned", "other"]},
        ]
    }


class MobileService:
    def __init__(self):
        self.encryption = Encryption()

    # ─── collections ──────────────────────────────────────────────────────────

    def _campaigns(self):
        return CampaignModel.get_pymongo_collection()

    def _campaign_leads(self):
        return CampaignLeadModel.get_pymongo_collection()

    def _leads(self):
        return LeadsModel.get_pymongo_collection()

    def _users(self):
        return UserModel.get_pymongo_collection()

    # ─── shared builders ──────────────────────────────────────────────────────

    @staticmethod
    def _ids(user: Dict[str, Any]):
        return PydanticObjectId(user["_id"]), PydanticObjectId(user["companyId"])

    def _decrypt(self, value):
        if not value:
            return value
        try:
            return self.encryption.decrypt_data(value)
        except Exception:
            return value

    @staticmethod
    def _user_name(doc: Optional[Dict[str, Any]]) -> Optional[str]:
        if not doc:
            return None
        return f"{doc.get('firstName') or ''} {doc.get('lastName') or ''}".strip() or None

    async def _user_map(self, ids) -> Dict[Any, Dict[str, Any]]:
        ids = [i for i in set(ids) if i]
        if not ids:
            return {}
        docs = await self._users().find(
            {"_id": {"$in": ids}}, {"firstName": 1, "lastName": 1}
        ).to_list(length=None)
        return {d["_id"]: {"id": str(d["_id"]), "name": self._user_name(d)} for d in docs}

    def _lead_fields(self, lead: Dict[str, Any]) -> Dict[str, Any]:
        """Lead details the mobile cards need (phone/email decrypted)."""
        return {
            "id": str(lead["_id"]),
            "leadId": lead.get("lead_id"),
            "fullName": lead.get("fullName"),
            "companyName": lead.get("companyName"),
            "phone": self._decrypt(lead.get("phone")),
            "email": self._decrypt(lead.get("email")),
            "priority": lead.get("priority"),
            "source": lead.get("source"),
            "projectType": lead.get("projectType"),
            "city": lead.get("city"),
            "country": lead.get("country"),
            "industry": lead.get("industry"),
            "salesStatus": lead.get("status"),
            "connectStatus": lead.get("connectStatus"),
            "meetingScheduled": lead.get("meetingScheduled"),
            "meetingStart": _iso(lead.get("meetingStart")),
            "inDeal": bool(lead.get("inDeal")),
            "message": lead.get("message"),
            "createdAt": _iso(lead.get("createdAt")),
        }

    @staticmethod
    def _campaign_mini(camp: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not camp or camp.get("deletedAt"):
            return None
        return {
            "id": str(camp["_id"]),
            "campaignId": camp.get("campaign_id"),
            "name": camp.get("name"),
            "status": camp.get("status"),
            "distributionMode": camp.get("distributionMode"),
        }

    def _search_clause(self, search: str, prefix: str = "") -> Dict[str, Any]:
        rx = {"$regex": re.escape(search), "$options": "i"}
        ors: List[Dict[str, Any]] = [
            {f"{prefix}fullName": rx},
            {f"{prefix}companyName": rx},
            {f"{prefix}lead_id": rx},
        ]
        digits = re.sub(r"[\s\-()]", "", search)
        if len(re.sub(r"\D", "", digits)) >= 6:
            # phone is stored encrypted -> match on its hash
            ors.append({f"{prefix}hashedPhone": hash_value(digits)})
        return {"$or": ors}

    @staticmethod
    def _validate_connect_status(value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        try:
            return CONTACT_STATUS(value).value
        except ValueError:
            raise AppException(400, f"Invalid status filter: {value}")

    async def _get_accessible_campaign(self, user, campaign_id: str) -> Dict[str, Any]:
        """Campaign doc if the user is an agent/manager of it or has assigned leads in it; 404 / 403 otherwise."""
        uid, company = self._ids(user)
        oid = ObjectId(str(uid))
        camp = await self._campaigns().find_one(
            {"_id": _oid(campaign_id, "campaign id"), "companyId": company, "deletedAt": None}
        )
        if not camp or camp.get("status") == "deleted":
            raise AppException(404, "Campaign not found")
        member_ids = {str(_ref_id(r)) for r in (camp.get("agents") or []) if r}
        member_ids |= {str(_ref_id(r)) for r in (camp.get("managers") or []) if r}
        if str(uid) not in member_ids:
            # Also check if agent has assigned leads in this campaign
            has_assigned = await self._campaign_leads().find_one({
                "$or": [
                    {"campaignId.$id": camp["_id"], "assignedTo.$id": oid},
                    {"campaignId.$id": camp["_id"], "assignedTo": oid},
                    {"campaignId": camp["_id"], "assignedTo.$id": oid},
                    {"campaignId": camp["_id"], "assignedTo": oid},
                ]
            })
            if not has_assigned:
                raise AppException(403, "You are not part of this campaign")
        return camp

    # ─────────────────────────────────────────────────────────────────────────
    # MY LEADS  (Total Leads card)
    # ─────────────────────────────────────────────────────────────────────────

    async def my_leads(self, user: Dict[str, Any], filters) -> Dict[str, Any]:
        try:
            uid, company = self._ids(user)
            page, limit = _page_args(filters)

            query: Dict[str, Any] = {
                "companyId": company,
                "deletedAt": None,
                "status": {"$nin": DELETED_LEAD_STATUSES},
                "assignedTo.$id": uid,
            }
            ands: List[Dict[str, Any]] = []

            search = (filters.get("search") or "").strip()
            if search:
                ands.append(self._search_clause(search))
            if filters.get("priority"):
                query["priority"] = filters.get("priority")
            if filters.get("source"):
                query["source"] = {
                    "$regex": f"^{re.escape(filters.get('source'))}$", "$options": "i"
                }
            if filters.get("salesStatus"):
                query["status"] = {"$in": [filters.get("salesStatus")]}
            if filters.get("campaignId"):
                camp_oid = _oid(filters.get("campaignId"), "campaignId")
                cls = await self._campaign_leads().find(
                    {"$or": [{"campaignId.$id": camp_oid}, {"campaignId": camp_oid}]},
                    {"leadId": 1},
                ).to_list(length=None)
                query["_id"] = {"$in": [_ref_id(c.get("leadId")) for c in cls]}
            if ands:
                query["$and"] = ands

            status_filter = self._validate_connect_status(filters.get("status"))
            count_query = dict(query)  # chip counts ignore the status filter itself
            if status_filter:
                query["connectStatus"] = status_filter

            leads_col = self._leads()
            total = await leads_col.count_documents(query)
            docs = await leads_col.find(query).sort(
                [("assignedAt", -1), ("createdAt", -1)]
            ).skip((page - 1) * limit).limit(limit).to_list(length=limit)

            status_rows = await leads_col.aggregate([
                {"$match": count_query},
                {"$group": {"_id": "$connectStatus", "count": {"$sum": 1}}},
            ]).to_list(length=None)
            by_status = {r["_id"] or "not_reached": r["count"] for r in status_rows}

            # attach campaign (a lead belongs to at most one campaign)
            lead_ids = [d["_id"] for d in docs]
            cl_by_lead: Dict[Any, Dict[str, Any]] = {}
            camp_by_id: Dict[Any, Dict[str, Any]] = {}
            if lead_ids:
                cls = await self._campaign_leads().find(
                    {"$or": [{"leadId.$id": {"$in": lead_ids}}, {"leadId": {"$in": lead_ids}}]}
                ).to_list(length=None)
                for c in cls:
                    cl_by_lead.setdefault(_ref_id(c.get("leadId")), c)
                camp_ids = {_ref_id(c.get("campaignId")) for c in cls}
                camps = await self._campaigns().find(
                    {"_id": {"$in": [i for i in camp_ids if i]}}
                ).to_list(length=None)
                camp_by_id = {c["_id"]: c for c in camps}

            data = []
            for lead in docs:
                item = self._lead_fields(lead)
                cl = cl_by_lead.get(lead["_id"])
                item["assignedAt"] = _iso(lead.get("assignedAt"))
                item["campaign"] = (
                    self._campaign_mini(camp_by_id.get(_ref_id(cl.get("campaignId")))) if cl else None
                )
                item["campaignLeadId"] = _str(cl["_id"]) if cl else None
                item["lastContactedAt"] = _iso(cl.get("lastContactedAt")) if cl else None
                item["notes"] = cl.get("notes") if cl else None
                data.append(item)

            return {
                "data": data,
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit if total else 0,
                "statusCounts": by_status,
            }
        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # MY CAMPAIGNS
    # ─────────────────────────────────────────────────────────────────────────

    async def _get_campaign_ids_from_leads(self, uid: ObjectId) -> List[ObjectId]:
        docs = await self._campaign_leads().find(
            {"$or": [{"assignedTo.$id": uid}, {"assignedTo": uid}]},
            {"campaignId": 1}
        ).to_list(length=None)
        cids = set()
        for d in docs:
            cid = d.get("campaignId")
            if hasattr(cid, "id"):
                cids.add(cid.id)
            elif isinstance(cid, dict) and "$id" in cid:
                cids.add(cid["$id"])
            elif isinstance(cid, ObjectId):
                cids.add(cid)
        return list(cids)

    async def _my_campaign_query(self, uid, company, status: Optional[str] = None, search: str = ""):
        # uid as plain ObjectId for raw PyMongo queries
        oid = ObjectId(str(uid))
        lead_camp_ids = await self._get_campaign_ids_from_leads(oid)

        or_clauses: List[Dict[str, Any]] = [
            {"agents.$id": oid},
            {"agents": oid},
            {"managers.$id": oid},
            {"managers": oid},
        ]
        if lead_camp_ids:
            or_clauses.append({"_id": {"$in": lead_camp_ids}})

        query: Dict[str, Any] = {
            "companyId": company,
            "deletedAt": None,
            "status": {"$nin": HIDDEN_CAMPAIGN_STATUSES},
            # Match both DBRef format (Beanie Link), plain ObjectId storage, and assigned leads
            "$or": or_clauses,
        }
        if status:
            query["status"] = status
        if search:
            query["name"] = {"$regex": re.escape(search), "$options": "i"}
        return query

    async def _campaign_stats(self, camp_ids: List[Any], uid) -> Dict[Any, Dict[str, int]]:
        if not camp_ids:
            return {}
        rows = await self._campaign_leads().aggregate([
            {"$match": {"$or": [{"campaignId.$id": {"$in": camp_ids}},
                                {"campaignId": {"$in": camp_ids}}]}},
            {"$group": {
                "_id": {
                    "c": {"$ifNull": ["$campaignId.$id", "$campaignId"]},
                    "o": {"$let": {
                        "vars": {"a": {"$ifNull": ["$assignedTo.$id", "$assignedTo"]}},
                        "in": _own_expr("$$a", uid),
                    }},
                },
                "count": {"$sum": 1},
            }},
        ]).to_list(length=None)

        stats = {cid: {"totalLeads": 0, "myLeads": 0, "otherLeads": 0, "unassignedLeads": 0}
                 for cid in camp_ids}
        key = {"mine": "myLeads", "other": "otherLeads", "unassigned": "unassignedLeads"}
        for r in rows:
            bucket = stats.get(r["_id"]["c"])
            if bucket is None:
                continue
            bucket[key[r["_id"]["o"]]] += r["count"]
            bucket["totalLeads"] += r["count"]
        return stats

    async def _campaign_card(self, camp, stats, users) -> Dict[str, Any]:
        def people(refs):
            return [users[i] for i in (_ref_id(r) for r in (refs or [])) if i in users]

        return {
            "id": str(camp["_id"]),
            "campaignId": camp.get("campaign_id"),
            "name": camp.get("name"),
            "description": camp.get("description"),
            "status": camp.get("status"),
            "distributionMode": camp.get("distributionMode"),
            "managers": people(camp.get("managers")),
            "agents": people(camp.get("agents")),
            "createdBy": users.get(_ref_id(camp.get("createdBy"))),
            "createdAt": _iso(camp.get("createdAt")),
            "stats": stats,
        }

    def _camp_user_ids(self, camps) -> List[Any]:
        ids = []
        for c in camps:
            ids += [_ref_id(r) for r in (c.get("agents") or [])]
            ids += [_ref_id(r) for r in (c.get("managers") or [])]
            ids.append(_ref_id(c.get("createdBy")))
        return ids

    async def my_campaigns(self, user: Dict[str, Any], filters) -> Dict[str, Any]:
        try:
            uid, company = self._ids(user)
            page, limit = _page_args(filters)
            query = await self._my_campaign_query(
                uid, company, filters.get("status"), (filters.get("search") or "").strip()
            )
            total = await self._campaigns().count_documents(query)
            camps = await self._campaigns().find(query).sort("createdAt", -1) \
                .skip((page - 1) * limit).limit(limit).to_list(length=limit)

            stats = await self._campaign_stats([c["_id"] for c in camps], uid)
            users = await self._user_map(self._camp_user_ids(camps))
            data = [await self._campaign_card(c, stats.get(c["_id"], {"totalLeads": 0, "myLeads": 0, "otherLeads": 0, "unassignedLeads": 0}), users) for c in camps]

            # summary strip on top of the My Campaigns screen
            all_camps_query = await self._my_campaign_query(uid, company)
            all_camps = await self._campaigns().find(
                all_camps_query, {"status": 1}
            ).to_list(length=None)
            summary = {
                "totalCampaigns": len(all_camps),
                "activeCampaigns": sum(c.get("status") == "active" for c in all_camps),
                "myLeads": await self._leads().count_documents({
                    "companyId": company, "deletedAt": None,
                    "status": {"$nin": DELETED_LEAD_STATUSES}, "assignedTo.$id": uid,
                }),
            }
            return {
                "data": data, "summary": summary, "page": page, "limit": limit,
                "total": total, "totalPages": (total + limit - 1) // limit if total else 0,
            }
        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    async def campaign_detail(self, user: Dict[str, Any], campaign_id: str) -> Dict[str, Any]:
        try:
            uid, _ = self._ids(user)
            camp = await self._get_accessible_campaign(user, campaign_id)
            stats = (await self._campaign_stats([camp["_id"]], uid))[camp["_id"]]
            users = await self._user_map(self._camp_user_ids([camp]))
            card = await self._campaign_card(camp, stats, users)

            rows = await self._campaign_leads().aggregate([
                {"$match": {"$or": [{"campaignId.$id": camp["_id"]}, {"campaignId": camp["_id"]}]}},
                {"$addFields": {
                    "leadOid": {"$ifNull": ["$leadId.$id", "$leadId"]},
                    "assignedOid": {"$ifNull": ["$assignedTo.$id", "$assignedTo"]},
                }},
                {"$match": {"assignedOid": uid}},
                {"$lookup": {"from": "leads", "localField": "leadOid",
                             "foreignField": "_id", "as": "lead"}},
                {"$unwind": "$lead"},
                {"$group": {"_id": "$lead.connectStatus", "count": {"$sum": 1}}},
            ]).to_list(length=None)
            card["myLeadsByStatus"] = {r["_id"] or "not_reached": r["count"] for r in rows}
            card["isPaused"] = camp.get("status") == "paused"
            return card
        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # CAMPAIGN LEADS  (all leads visible; only own leads are editable)
    # ─────────────────────────────────────────────────────────────────────────

    async def campaign_leads(self, user: Dict[str, Any], campaign_id: str, filters) -> Dict[str, Any]:
        try:
            uid, _ = self._ids(user)
            page, limit = _page_args(filters)
            camp = await self._get_accessible_campaign(user, campaign_id)

            ownership = (filters.get("ownership") or "all").lower()
            if ownership not in ("all", "mine", "other", "unassigned"):
                raise AppException(400, "ownership must be one of: all, mine, other, unassigned")
            own_match: Dict[str, Any] = {
                "all": {},
                "mine": {"assignedOid": uid},
                "unassigned": {"assignedOid": None},
                "other": {"assignedOid": {"$nin": [uid, None]}},
            }[ownership]

            lead_match: Dict[str, Any] = {
                "lead.deletedAt": None,
                "lead.status": {"$nin": DELETED_LEAD_STATUSES},
            }
            status_filter = self._validate_connect_status(filters.get("status"))
            if status_filter:
                lead_match["lead.connectStatus"] = status_filter
            if filters.get("priority"):
                lead_match["lead.priority"] = filters.get("priority")
            if filters.get("source"):
                lead_match["lead.source"] = {
                    "$regex": f"^{re.escape(filters.get('source'))}$", "$options": "i"
                }
            search = (filters.get("search") or "").strip()
            if search:
                lead_match.update(self._search_clause(search, prefix="lead."))

            pipeline = [
                {"$match": {"$or": [{"campaignId.$id": camp["_id"]}, {"campaignId": camp["_id"]}]}},
                {"$addFields": {
                    "leadOid": {"$ifNull": ["$leadId.$id", "$leadId"]},
                    "assignedOid": {"$ifNull": ["$assignedTo.$id", "$assignedTo"]},
                }},
                {"$lookup": {"from": "leads", "localField": "leadOid",
                             "foreignField": "_id", "as": "lead"}},
                {"$unwind": "$lead"},
                {"$match": lead_match},
                {"$facet": {
                    "data": [
                        {"$match": own_match},
                        {"$sort": {"importedAt": -1, "_id": -1}},
                        {"$skip": (page - 1) * limit},
                        {"$limit": limit},
                    ],
                    "total": [{"$match": own_match}, {"$count": "count"}],
                    "summary": [
                        {"$group": {"_id": _own_expr("$assignedOid", uid), "count": {"$sum": 1}}}
                    ],
                }},
            ]
            res = (await self._campaign_leads().aggregate(pipeline).to_list(length=1))[0]
            rows = res.get("data", [])
            total = res["total"][0]["count"] if res.get("total") else 0
            summary = {"mine": 0, "other": 0, "unassigned": 0}
            for r in res.get("summary", []):
                summary[r["_id"]] = r["count"]
            summary["all"] = sum(summary.values())

            users = await self._user_map([r.get("assignedOid") for r in rows])
            can_claim_campaign = (
                camp.get("distributionMode") == "on_demand" and camp.get("status") != "paused"
            )

            data = []
            for r in rows:
                owner = r.get("assignedOid")
                own = "mine" if owner == uid else ("unassigned" if owner is None else "other")
                item = self._lead_fields(r["lead"])
                item.update({
                    "campaignLeadId": str(r["_id"]),
                    "campaignStatus": r.get("campaignStatus"),
                    "ownership": own,
                    "assignedTo": users.get(owner),
                    "assignedAt": _iso(r.get("assignedAt")),
                    "lastContactedAt": _iso(r.get("lastContactedAt")),
                    "notes": r.get("notes"),
                    "canUpdateStatus": own == "mine",
                    "canClaim": own == "unassigned" and can_claim_campaign,
                })
                data.append(item)

            return {
                "campaign": self._campaign_mini(camp),
                "data": data,
                "summary": summary,
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit if total else 0,
            }
        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # ACTIONS
    # ─────────────────────────────────────────────────────────────────────────

    async def claim_lead(self, user: Dict[str, Any], campaign_id: str, campaign_lead_id: str):
        """ON_DEMAND: agent starts working on an unassigned lead -> it becomes theirs."""
        await self._get_accessible_campaign(user, campaign_id)
        return await CampaignService().claim_lead(
            campaign_id=campaign_id, campaign_lead_id=campaign_lead_id, user=user
        )

    async def update_lead_status(self, user: Dict[str, Any], lead_id: str, status: str):
        """Agent marks the connect status of one of THEIR leads."""
        try:
            uid, company = self._ids(user)
            lead_oid = _oid(lead_id, "lead id")
            lead = await self._leads().find_one(
                {"_id": lead_oid, "companyId": company, "deletedAt": None},
                {"assignedTo": 1, "fullName": 1, "lead_id": 1},
            )
            if not lead:
                raise AppException(404, "Lead not found")
            if uid not in {_ref_id(r) for r in (lead.get("assignedTo") or [])}:
                raise AppException(403, "You can only update the status of your own leads")

            result = await LeadService().update_connect_status(
                leadId=str(lead_oid), user=user, payload={"status": status}
            )
            return {
                "id": str(lead_oid),
                "leadId": lead.get("lead_id"),
                "fullName": lead.get("fullName"),
                "connectStatus": result.get("connectStatus"),
            }
        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # HOME + INSIGHTS
    # ─────────────────────────────────────────────────────────────────────────

    def _my_lead_base(self, uid, company) -> Dict[str, Any]:
        return {
            "companyId": company,
            "deletedAt": None,
            "status": {"$nin": DELETED_LEAD_STATUSES},
            "assignedTo.$id": uid,
        }

    async def home(self, user: Dict[str, Any]) -> Dict[str, Any]:
        try:
            uid, company = self._ids(user)
            rows = await self._leads().aggregate([
                {"$match": self._my_lead_base(uid, company)},
                {"$group": {"_id": "$connectStatus", "count": {"$sum": 1}}},
            ]).to_list(length=None)
            by_status = {r["_id"] or "not_reached": r["count"] for r in rows}

            camps = await self._campaigns().find(
                await self._my_campaign_query(uid, company), {"status": 1}
            ).to_list(length=None)

            return {
                "user": {
                    "id": str(uid),
                    "name": f"{user.get('firstName') or ''} {user.get('lastName') or ''}".strip(),
                },
                "leads": {"total": sum(by_status.values()), "byConnectStatus": by_status},
                "campaigns": {
                    "total": len(camps),
                    "active": sum(c.get("status") == "active" for c in camps),
                    "paused": sum(c.get("status") == "paused" for c in camps),
                },
            }
        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    @staticmethod
    def _add_months(d: datetime, months: int) -> datetime:
        idx = d.year * 12 + (d.month - 1) + months
        return d.replace(year=idx // 12, month=idx % 12 + 1, day=1)

    def _period_ranges(self, period: str, tz_name: str):
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            raise AppException(400, f"Invalid timezone: {tz_name}")

        now = datetime.now(tz)
        midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
        if period == "today":
            start, end = midnight, midnight + timedelta(days=1)
            p_start, p_end = start - timedelta(days=1), start
        elif period == "week":
            start = midnight - timedelta(days=midnight.weekday())
            end = start + timedelta(days=7)
            p_start, p_end = start - timedelta(days=7), start
        elif period == "month":
            start = midnight.replace(day=1)
            end = self._add_months(start, 1)
            p_start, p_end = self._add_months(start, -1), start
        else:  # quarter
            start = self._add_months(midnight.replace(day=1), -((midnight.month - 1) % 3))
            end = self._add_months(start, 3)
            p_start, p_end = self._add_months(start, -3), start

        to_utc = lambda d: d.astimezone(timezone.utc)  # noqa: E731
        return to_utc(start), to_utc(end), to_utc(p_start), to_utc(p_end)

    async def _period_stats(self, uid, company, start: datetime, end: datetime) -> Dict[str, Any]:
        match = self._my_lead_base(uid, company)
        match["$or"] = [
            {"assignedAt": {"$gte": start, "$lt": end}},
            {"assignedAt": None, "createdAt": {"$gte": start, "$lt": end}},
        ]
        res = (await self._leads().aggregate([
            {"$match": match},
            {"$facet": {
                "sales": [{"$group": {"_id": "$status", "count": {"$sum": 1}}}],
                "connect": [{"$group": {"_id": "$connectStatus", "count": {"$sum": 1}}}],
                "source": [{"$group": {"_id": "$source", "count": {"$sum": 1}}}],
            }},
        ]).to_list(length=1))[0]

        sales = {r["_id"]: r["count"] for r in res["sales"]}
        total = sum(sales.values())
        return {
            "totalLeads": total,
            "activeLeads": sum(c for s, c in sales.items() if s not in CLOSED_LEAD_STATUSES),
            "wonLeads": sales.get("won", 0),
            "lostLeads": sales.get("lost", 0),
            "bySalesStatus": sales,
            "byConnectStatus": {r["_id"] or "not_reached": r["count"] for r in res["connect"]},
            "bySource": {r["_id"] or "other": r["count"] for r in res["source"]},
        }

    async def insights(self, user: Dict[str, Any], period: str, tz_name: str) -> Dict[str, Any]:
        try:
            period = (period or "month").lower()
            if period not in PERIODS:
                raise AppException(400, f"period must be one of: {', '.join(PERIODS)}")
            uid, company = self._ids(user)
            start, end, p_start, p_end = self._period_ranges(period, tz_name)

            current = await self._period_stats(uid, company, start, end)
            previous = await self._period_stats(uid, company, p_start, p_end)
            change = {k: current[k] - previous[k] for k in ("totalLeads", "activeLeads", "wonLeads", "lostLeads")}

            return {
                "period": period,
                "timezone": tz_name,
                "range": {"start": _iso(start), "end": _iso(end)},
                "stats": current,
                "previous": {k: previous[k] for k in change},
                "change": change,
            }
        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")
