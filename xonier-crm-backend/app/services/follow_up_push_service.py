"""Durable lead follow-up push outbox and FCM delivery worker."""

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone

from beanie import PydanticObjectId
from pymongo import ReturnDocument

from app.core.config import get_setting
from app.core.crypto import encryptor
from app.db.db import Client
from app.services.push_token_service import PushTokenService

logger = logging.getLogger(__name__)
WINDOW = timedelta(minutes=15)
LEASE = timedelta(minutes=2)


def utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def iso_utc(value: datetime) -> str:
    return utc(value).isoformat(timespec="seconds").replace("+00:00", "Z")


class FollowUpPushService:
    def _db(self):
        return Client[get_setting().DATABASE_NAME]

    def _reminders(self):
        return self._db()["lead_follow_up_reminders"]

    async def sync(self, *, lead_id, company_id, owner_id, follow_up_at: datetime | None, session=None) -> None:
        """Call in the same Mongo transaction as the lead's follow-up write."""
        lead_oid = PydanticObjectId(lead_id)
        now = datetime.now(timezone.utc)
        if not follow_up_at or not owner_id:
            await self._reminders().update_one(
                {"_id": lead_oid},
                {"$inc": {"version": 1}, "$set": {"status": "cancelled", "updatedAt": now, "claimId": None}},
                session=session,
            )
            return
        scheduled = utc(follow_up_at)
        await self._reminders().update_one(
            {"_id": lead_oid},
            {
                "$inc": {"version": 1},
                "$set": {
                    "leadId": lead_oid,
                    "companyId": PydanticObjectId(company_id),
                    "userId": PydanticObjectId(owner_id),
                    "scheduledAt": scheduled,
                    "expiresAt": scheduled + WINDOW,
                    "nextAttemptAt": scheduled,
                    "status": "pending",
                    "claimId": None,
                    "updatedAt": now,
                },
                "$setOnInsert": {"createdAt": now},
            },
            upsert=True,
            session=session,
        )

    async def backfill_near_due(self, now: datetime) -> None:
        """Make existing saved follow-ups deliverable without changing their times."""
        leads = self._db()["leads"]
        cursor = leads.find(
            {
                "followUpAt": {"$gte": now - WINDOW, "$lte": now + timedelta(minutes=5)},
                "followUpOwnerId": {"$ne": None},
                "companyId": {"$ne": None},
                "deletedAt": None,
                "status": {"$ne": "delete"},
            },
            {"_id": 1, "companyId": 1, "followUpOwnerId": 1, "followUpAt": 1},
        )
        async for lead in cursor:
            scheduled = utc(lead["followUpAt"])
            await self._reminders().update_one(
                {"_id": lead["_id"]},
                {"$setOnInsert": {
                    "leadId": lead["_id"], "companyId": lead["companyId"],
                    "userId": lead["followUpOwnerId"], "scheduledAt": scheduled,
                    "expiresAt": scheduled + WINDOW, "nextAttemptAt": scheduled,
                    "version": 1, "status": "pending", "createdAt": now, "updatedAt": now,
                }},
                upsert=True,
            )

    async def run_due(self) -> None:
        settings = get_setting()
        if not settings.FOLLOW_UP_PUSH_ENABLED:
            return
        now = datetime.now(timezone.utc)
        await self.backfill_near_due(now)
        reminders = self._reminders()
        await reminders.update_many(
            {"status": {"$in": ["pending", "retry", "sending"]}, "expiresAt": {"$lte": now}},
            {"$set": {"status": "expired", "claimId": None, "updatedAt": now}},
        )
        for _ in range(100):
            now = datetime.now(timezone.utc)
            claim_id = uuid.uuid4().hex
            job = await reminders.find_one_and_update(
                {
                    "scheduledAt": {"$lte": now}, "expiresAt": {"$gt": now},
                    "$or": [
                        {"status": {"$in": ["pending", "retry"]}, "nextAttemptAt": {"$lte": now}},
                        {"status": "sending", "leaseUntil": {"$lte": now}},
                    ],
                },
                {"$set": {"status": "sending", "claimId": claim_id,
                          "leaseUntil": now + LEASE, "updatedAt": now}, "$inc": {"attempts": 1}},
                sort=[("scheduledAt", 1)], return_document=ReturnDocument.AFTER,
            )
            if job is None:
                break
            await self._deliver(job, claim_id)

    async def _deliver(self, job: dict, claim_id: str) -> None:
        reminders = self._reminders()
        now = datetime.now(timezone.utc)
        current = await reminders.find_one({"_id": job["_id"], "version": job["version"],
                                            "status": "sending", "claimId": claim_id})
        if not current or utc(current["expiresAt"]) <= now:
            return
        lead = await self._db()["leads"].find_one({
            "_id": job["leadId"], "companyId": job["companyId"], "deletedAt": None,
            "status": {"$ne": "delete"}, "followUpOwnerId": job["userId"],
            "followUpAt": job["scheduledAt"],
        }, {"fullName": 1})
        user = await self._db()["users"].find_one({
            "_id": job["userId"], "companyId": job["companyId"],
            "deletedAt": None, "status": "active",
        }, {"_id": 1})
        if not lead or not user:
            await reminders.update_one(
                {"_id": job["_id"], "version": job["version"], "claimId": claim_id},
                {"$set": {"status": "cancelled", "claimId": None, "updatedAt": now}},
            )
            return
        token_doc = await PushTokenService().get(job["userId"], job["companyId"])
        if not token_doc:
            await self._retry(job, claim_id, now, "no_token")
            return
        try:
            import firebase_admin
            from firebase_admin import messaging

            try:
                firebase_admin.get_app()
            except ValueError:
                firebase_admin.initialize_app(options={"projectId": get_setting().FCM_PROJECT_ID})

            token = encryptor.decrypt_data(token_doc["tokenEncrypted"])
            message = build_message(messaging, token, job, lead.get("fullName") or "Lead", now)
            # Recheck the version and recipient immediately before the external send.
            latest = await reminders.find_one({"_id": job["_id"], "version": job["version"],
                                               "status": "sending", "claimId": claim_id})
            if not latest:
                return
            latest_lead = await self._db()["leads"].find_one({
                "_id": job["leadId"], "companyId": job["companyId"], "deletedAt": None,
                "status": {"$ne": "delete"}, "followUpOwnerId": job["userId"],
                "followUpAt": job["scheduledAt"],
            }, {"_id": 1})
            latest_user = await self._db()["users"].find_one({
                "_id": job["userId"], "companyId": job["companyId"],
                "deletedAt": None, "status": "active",
            }, {"_id": 1})
            latest_token = await PushTokenService().get(job["userId"], job["companyId"])
            if not latest_lead or not latest_user or not latest_token or latest_token["tokenHash"] != token_doc["tokenHash"]:
                await self._retry(job, claim_id, datetime.now(timezone.utc), "recipient_changed")
                return
            await asyncio.to_thread(messaging.send, message)
            await reminders.update_one(
                {"_id": job["_id"], "version": job["version"], "claimId": claim_id},
                {"$set": {"status": "sent", "sentAt": datetime.now(timezone.utc),
                          "claimId": None, "updatedAt": datetime.now(timezone.utc)}},
            )
        except Exception as exc:
            # Exception text may contain a registration token; log only its class.
            error_type = type(exc).__name__
            if error_type in {"UnregisteredError", "SenderIdMismatchError"}:
                await PushTokenService().remove_if_matches(job["userId"], job["companyId"], token_doc["tokenHash"])
            logger.warning("Follow-up push failed: reminder=%s error=%s", job["_id"], error_type)
            await self._retry(job, claim_id, datetime.now(timezone.utc), error_type)

    async def _retry(self, job: dict, claim_id: str, now: datetime, reason: str) -> None:
        delay = min(120, 15 * 2 ** min(int(job.get("attempts", 1)) - 1, 3))
        await self._reminders().update_one(
            {"_id": job["_id"], "version": job["version"], "claimId": claim_id},
            {"$set": {"status": "retry", "nextAttemptAt": now + timedelta(seconds=delay),
                      "claimId": None, "lastErrorType": reason, "updatedAt": now}},
        )


def build_message(messaging, token: str, job: dict, lead_name: str, now: datetime):
    """Android stays data-only; the same token-targeted message has an iOS APNs alert."""
    expires = utc(job["expiresAt"])
    remaining = max(1, int((expires - now).total_seconds()))
    data = {
        "type": "follow_up_due", "reminderId": str(job["_id"]),
        "leadId": str(job["leadId"]), "userId": str(job["userId"]),
        "companyId": str(job["companyId"]), "version": str(job["version"]),
        "scheduledAt": iso_utc(job["scheduledAt"]), "expiresAt": iso_utc(expires),
        "leadName": str(lead_name), "title": "Lead Follow-Up",
        "body": "It is time to follow up with this lead.",
    }
    return messaging.Message(
        token=token, data=data,
        android=messaging.AndroidConfig(priority="high", ttl=timedelta(seconds=remaining)),
        apns=messaging.APNSConfig(
            headers={"apns-push-type": "alert", "apns-priority": "10",
                     "apns-expiration": str(int(expires.timestamp()))},
            payload=messaging.APNSPayload(aps=messaging.Aps(
                alert=messaging.ApsAlert(title="Lead Follow-Up", body="You have a scheduled lead follow-up."),
                sound="follow_up_alarm.caf", category="lead-follow-up-actions",
            )),
        ),
    )


async def send_due_follow_up_pushes() -> None:
    try:
        await FollowUpPushService().run_due()
    except Exception:
        logger.exception("Follow-up push worker tick failed")
