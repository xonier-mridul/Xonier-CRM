"""
Click-to-call: web app asks the backend to make the agent's MOBILE phone dial a lead.

Flow
  1. Web  : POST /api/call/request {leadId}      -> session (pending) + pushed to the mobile app
  2. Mobile gets the request over WebSocket (or by polling /api/mobile/calls/pending)
  3. Mobile: POST /api/mobile/calls/{id}/status   received -> dialing -> ended|failed
  4. Web  : receives session_update over WebSocket  to show live state / timer (no polling)
  5. Web  : POST /api/call/session/{id}/dispose   "Was call connected?" -> lead connectStatus updated

All queries use raw collections with an explicit companyId, so the same methods work from
REST handlers and from the WebSocket handler (which has no tenant context).
"""
import traceback
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from beanie import PydanticObjectId

from app.core.crypto import Encryption
from app.core.ws_manager import manager
from app.db.models.call_session_model import (
    ACTIVE_CALL_STATUSES,
    CALL_CANCELLED,
    CALL_DELIVERED,
    CALL_DIALING,
    CALL_ENDED,
    CALL_EXPIRED,
    CALL_FAILED,
    CALL_PENDING,
    CallSessionModel,
)
from app.db.models.campaign_lead_model import CampaignLeadModel
from app.db.models.lead_model import LeadsModel
from app.db.models.user_model import UserModel
from app.services.lead_service import LeadService
from app.services.mobile_service import _ref_id
from app.utils.custom_exception import AppException
from app.utils.validate_admin import validate_admin_company_admin

# statuses the mobile app is allowed to report
MOBILE_STATUS_MAP = {
    "received": CALL_DELIVERED,
    "dialing": CALL_DIALING,
    "ended": CALL_ENDED,
    "failed": CALL_FAILED,
}
DISPOSITIONS = {True: "connected", False: "not_connected"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _iso(dt: Optional[datetime]) -> Optional[str]:
    dt = _aware(dt)
    return dt.isoformat() if dt else None


class CallService:
    # a request nobody picked up within this window is expired
    EXPIRE_AFTER_SEC = 60

    def __init__(self):
        self.encryption = Encryption()

    # ─── helpers ──────────────────────────────────────────────────────────────

    def _col(self):
        return CallSessionModel.get_pymongo_collection()

    def _leads(self):
        return LeadsModel.get_pymongo_collection()

    @staticmethod
    def _ids(user: Dict[str, Any]):
        return PydanticObjectId(user["_id"]), PydanticObjectId(user["companyId"])

    def _view(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Session as the web app sees it (no phone number)."""
        return {
            "id": str(doc["_id"]),
            "leadId": str(doc["leadId"]),
            "leadName": doc.get("leadName"),
            "status": doc["status"],
            "failureReason": doc.get("failureReason"),
            "requestedAt": _iso(doc.get("requestedAt")),
            "deliveredAt": _iso(doc.get("deliveredAt")),
            "dialedAt": _iso(doc.get("dialedAt")),
            "endedAt": _iso(doc.get("endedAt")),
            "durationSec": doc.get("durationSec"),
            "disposition": doc.get("disposition"),
            "disposedAt": _iso(doc.get("disposedAt")),
        }

    def _mobile_view(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Session as the mobile app receives it (includes the plain phone number)."""
        try:
            phone = self.encryption.decrypt_data(doc["phone"])
        except Exception:
            phone = doc["phone"]
        return {
            "sessionId": str(doc["_id"]),
            "leadId": str(doc["leadId"]),
            "leadName": doc.get("leadName"),
            "phone": phone,
            "status": doc["status"],
            "requestedAt": _iso(doc.get("requestedAt")),
            "expiresAt": _iso(_aware(doc.get("requestedAt")) + timedelta(seconds=self.EXPIRE_AFTER_SEC)),
        }

    async def _load_owned(self, user: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        uid, company = self._ids(user)
        try:
            oid = PydanticObjectId(session_id)
        except Exception:
            raise AppException(400, "Invalid call session id")
        doc = await self._col().find_one({"_id": oid, "companyId": company})
        if not doc:
            raise AppException(404, "Call session not found")
        if doc["agentId"] != uid:
            raise AppException(403, "This call session belongs to another user")
        return await self._expire_if_stale(doc)

    async def _expire_if_stale(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        if doc["status"] in (CALL_PENDING, CALL_DELIVERED):
            age = (_now() - _aware(doc["requestedAt"])).total_seconds()
            if age > self.EXPIRE_AFTER_SEC:
                now = _now()
                await self._col().update_one(
                    {"_id": doc["_id"], "status": {"$in": [CALL_PENDING, CALL_DELIVERED]}},
                    {"$set": {"status": CALL_EXPIRED, "updatedAt": now}},
                )
                doc = {**doc, "status": CALL_EXPIRED, "updatedAt": now}
        return doc

    # ─── web app ──────────────────────────────────────────────────────────────

    async def request_call(
        self,
        user: Dict[str, Any],
        lead_id: str,
        campaign_id: Optional[str] = None,
        campaign_lead_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            uid, company = self._ids(user)
            try:
                lead_oid = PydanticObjectId(lead_id)
            except Exception:
                raise AppException(400, "Invalid lead id")

            lead = await self._leads().find_one(
                {"_id": lead_oid, "companyId": company, "deletedAt": None}
            )
            if not lead:
                raise AppException(404, "Lead not found")

            # Campaign calls deliberately use campaign-scoped assignment, which is
            # independent from the lead's general assignedTo field. This check is
            # strict for every role, including managers/admins, so another agent's
            # campaign lead can never be called by changing the browser request.
            if bool(campaign_id) != bool(campaign_lead_id):
                raise AppException(400, "Campaign id and campaign lead id must be provided together")
            if campaign_id:
                try:
                    campaign_oid = PydanticObjectId(campaign_id)
                    campaign_lead_oid = PydanticObjectId(campaign_lead_id)
                except Exception:
                    raise AppException(400, "Invalid campaign call details")

                campaign_lead = await CampaignLeadModel.get_pymongo_collection().find_one({
                    "_id": campaign_lead_oid,
                    "companyId": company,
                    "$and": [
                        {"$or": [{"campaignId.$id": campaign_oid}, {"campaignId": campaign_oid}]},
                        {"$or": [{"leadId.$id": lead_oid}, {"leadId": lead_oid}]},
                    ],
                })
                if not campaign_lead:
                    raise AppException(404, "Campaign lead not found")
                if _ref_id(campaign_lead.get("assignedTo")) != uid:
                    raise AppException(403, "You can only call campaign leads assigned to you")
            else:
                assigned = {_ref_id(r) for r in (lead.get("assignedTo") or [])}
                allowed = (
                    validate_admin_company_admin(user["userRole"])
                    or uid in assigned
                    or uid == _ref_id(lead.get("createdBy"))
                )
                if not allowed:
                    raise AppException(403, "You can only call leads that are assigned to you")
            if not lead.get("phone"):
                raise AppException(400, "This lead has no phone number")

            now = _now()
            # only one live call request per agent -> supersede older ones
            await self._col().update_many(
                {"agentId": uid, "status": {"$in": ACTIVE_CALL_STATUSES}},
                {"$set": {"status": CALL_CANCELLED, "updatedAt": now}},
            )

            doc = {
                "companyId": company,
                "agentId": uid,
                "leadId": lead_oid,
                "leadName": lead.get("fullName"),
                "phone": lead["phone"],
                "status": CALL_PENDING,
                "failureReason": None,
                "requestedAt": now,
                "deliveredAt": None,
                "dialedAt": None,
                "endedAt": None,
                "durationSec": None,
                "disposition": None,
                "disposedAt": None,
                "createdAt": now,
                "updatedAt": now,
            }
            res = await self._col().insert_one(doc)
            doc["_id"] = res.inserted_id

            online = manager.is_online(str(uid))
            pushed = await manager.send(
                str(uid), {"event": "call_request", "session": self._mobile_view(doc)}
            )
            return {"session": self._view(doc), "mobileOnline": online, "pushed": pushed}
        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    async def get_session(self, user: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        doc = await self._load_owned(user, session_id)
        return {**self._view(doc), "mobileOnline": manager.is_online(str(doc["agentId"]))}

    async def cancel_session(self, user: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        doc = await self._load_owned(user, session_id)
        if doc["status"] in ACTIVE_CALL_STATUSES:
            now = _now()
            await self._col().update_one(
                {"_id": doc["_id"]}, {"$set": {"status": CALL_CANCELLED, "updatedAt": now}}
            )
            doc = {**doc, "status": CALL_CANCELLED}
            await manager.send(
                str(doc["agentId"]), {"event": "call_cancelled", "sessionId": str(doc["_id"])}
            )
        return self._view(doc)

    def presence(self, user: Dict[str, Any]) -> Dict[str, Any]:
        return {"mobileOnline": manager.is_online(str(user["_id"]))}

    async def lead_history(self, user: Dict[str, Any], lead_id: str) -> list[Dict[str, Any]]:
        """Return the mobile-call history for one lead, newest first.

        Call sessions preserve the exact events reported by the agent's mobile app,
        including terminal status, duration and failure reason. They are a more
        accurate source for a lead's call timeline than a generic audit entry.
        """
        try:
            _, company = self._ids(user)
            try:
                lead_oid = PydanticObjectId(lead_id)
            except Exception:
                raise AppException(400, "Invalid lead id")

            exists = await self._leads().find_one(
                {"_id": lead_oid, "companyId": company, "deletedAt": None}, {"_id": 1}
            )
            if not exists:
                raise AppException(404, "Lead not found")

            sessions = await self._col().find(
                {"companyId": company, "leadId": lead_oid},
                sort=[("requestedAt", -1)],
            ).to_list(length=100)

            agent_ids = {session.get("agentId") for session in sessions if session.get("agentId")}
            agent_names: Dict[Any, str] = {}
            if agent_ids:
                agents = await UserModel.get_pymongo_collection().find(
                    {"_id": {"$in": list(agent_ids)}}, {"firstName": 1, "lastName": 1, "email": 1}
                ).to_list(length=len(agent_ids))
                agent_names = {
                    agent["_id"]: " ".join(
                        part for part in [agent.get("firstName"), agent.get("lastName")] if part
                    ) or agent.get("email") or "Agent"
                    for agent in agents
                }

            return [
                {
                    **self._view(session),
                    "agentName": agent_names.get(session.get("agentId"), "Agent"),
                }
                for session in sessions
            ]
        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    async def dispose(self, user: Dict[str, Any], session_id: str, connected: bool) -> Dict[str, Any]:
        """'Was call connected?' -> save the answer and update the lead's connect status."""
        try:
            doc = await self._load_owned(user, session_id)
            if doc.get("disposition"):
                raise AppException(400, "This call has already been marked")
            if doc["status"] == CALL_PENDING:
                raise AppException(400, "The call has not started yet")

            now = _now()
            disposition = DISPOSITIONS[bool(connected)]
            updates: Dict[str, Any] = {
                "disposition": disposition, "disposedAt": now, "updatedAt": now,
            }
            # agent finished the call but the mobile never reported the end -> close it here
            if doc["status"] in (CALL_DELIVERED, CALL_DIALING):
                updates["status"] = CALL_ENDED
                updates["endedAt"] = now
                if doc.get("dialedAt") and doc.get("durationSec") is None:
                    updates["durationSec"] = int((now - _aware(doc["dialedAt"])).total_seconds())
            await self._col().update_one({"_id": doc["_id"]}, {"$set": updates})

            warning = None
            try:
                await LeadService().update_connect_status(
                    leadId=str(doc["leadId"]), user=user, payload={"status": disposition}
                )
            except AppException as e:
                # e.g. lead is already won/deleted: keep the call record, tell the UI
                warning = e.message

            saved = await self._col().find_one({"_id": doc["_id"]})
            return {
                "session": self._view(saved),
                "connectStatus": disposition,
                "leadStatusUpdated": warning is None,
                "warning": warning,
            }
        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")

    # ─── mobile app ───────────────────────────────────────────────────────────

    async def pending_for_agent(self, user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Newest call request still waiting for this agent's phone (polling fallback)."""
        uid, company = self._ids(user)
        manager.touch(str(uid))
        cutoff = _now() - timedelta(seconds=self.EXPIRE_AFTER_SEC)
        doc = await self._col().find_one(
            {
                "companyId": company,
                "agentId": uid,
                "status": {"$in": [CALL_PENDING, CALL_DELIVERED]},
                "requestedAt": {"$gte": cutoff},
            },
            sort=[("requestedAt", -1)],
        )
        return self._mobile_view(doc) if doc else None

    async def mobile_update(
        self,
        user: Dict[str, Any],
        session_id: str,
        status: str,
        duration_sec: Optional[int] = None,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Mobile app reports progress of a call request."""
        try:
            if status not in MOBILE_STATUS_MAP:
                raise AppException(400, f"status must be one of: {', '.join(MOBILE_STATUS_MAP)}")
            uid, _ = self._ids(user)
            manager.touch(str(uid))

            doc = await self._load_owned(user, session_id)
            if doc["status"] in (CALL_CANCELLED, CALL_EXPIRED):
                raise AppException(409, f"This call request is {doc['status']}")
            if doc["status"] in (CALL_ENDED, CALL_FAILED):
                return self._view(doc)  # already finished -> idempotent

            now = _now()
            new_status = MOBILE_STATUS_MAP[status]
            updates: Dict[str, Any] = {"status": new_status, "updatedAt": now}
            if new_status == CALL_DELIVERED:
                if doc["status"] == CALL_DIALING:
                    return self._view(doc)  # never go backwards
                updates["deliveredAt"] = now
            elif new_status == CALL_DIALING:
                updates["dialedAt"] = doc.get("dialedAt") or now
                updates["deliveredAt"] = doc.get("deliveredAt") or now
            elif new_status == CALL_ENDED:
                duration = max(int(duration_sec or 0), 0)
                updates["endedAt"] = now
                updates["durationSec"] = duration
                updates["deliveredAt"] = doc.get("deliveredAt") or now
                updates["dialedAt"] = doc.get("dialedAt") or (now - timedelta(seconds=duration))
            else:  # failed
                updates["failedAt"] = now
                updates["failureReason"] = (reason or "Call could not be placed")[:300]

            await self._col().update_one({"_id": doc["_id"]}, {"$set": updates})
            updated_doc = {**doc, **updates}
            # Push real-time update to the web browser (same agent) — replaces polling
            await manager.send(
                str(uid),
                {
                    "event": "session_update",
                    "session": self._view(updated_doc),
                    "mobileOnline": True,
                },
            )
            return self._view(updated_doc)
        except AppException:
            raise
        except Exception as e:
            traceback.print_exc()
            raise AppException(500, f"Internal server error: {e}")
