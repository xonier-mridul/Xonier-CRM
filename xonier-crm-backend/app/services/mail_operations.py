"""Redacted queue operations; no mail bodies, addresses, credentials or OTPs."""
from datetime import timedelta
from bson import ObjectId
from app.core.security_store import database, now, utc
from app.services.mail_queue import MailQueue
from app.utils.custom_exception import AppException


class MailOperations:
    def __init__(self, db=None):
        self.db = db if db is not None else database()

    async def overview(self):
        counts = {state: await self.db.email_jobs.count_documents({"state": state})
                  for state in ["queued", "sending", "sent", "failed", "uncertain", "expired", "cancelled"]}
        workers = await self.db.email_workers.find({"lastSeenAt": {"$gt": now() - timedelta(seconds=45)}},
            {"_id": 0, "lane": 1, "lastSeenAt": 1}).to_list(100)
        oldest = await self.db.email_jobs.find_one({"state": "queued"}, {"createdAt": 1}, sort=[("createdAt", 1)])
        return {"counts": counts, "healthyLanes": sorted({worker["lane"] for worker in workers}),
            "workers": workers, "oldestQueuedSeconds": max(0, int((now() - utc(oldest["createdAt"])).total_seconds())) if oldest else 0,
            "requiresReview": counts["failed"] + counts["uncertain"]}

    async def redrive(self, job_id, actor, acknowledge=False):
        if not any(role.get("code") == "SUPER_ADMIN" for role in actor.get("userRole", [])):
            raise AppException(403, "Only Super Admin may retry mail jobs")
        queue = MailQueue(self.db)
        async def commit(session):
            job = await self.db.email_jobs.find_one({"_id": job_id}, session=session)
            if not job:
                raise AppException(404, "Mail job not found")
            if job["state"] not in {"failed", "uncertain"}:
                raise AppException(409, "Only failed/review-required jobs may be retried")
            if job["state"] == "uncertain" and not acknowledge:
                raise AppException(409, "Delivery may already have happened. Explicitly acknowledge the possible duplicate before retrying.")
            if utc(job["expiresAt"]) <= now() or not await queue.valid_otp(job, session=session):
                raise AppException(409, "This message or OTP is expired, used, or superseded; it cannot be retried")
            if not job.get("payloadCipher"):
                raise AppException(409, "Mail payload has already been purged")
            result = await self.db.email_jobs.update_one({"_id": job_id, "state": job["state"]}, {"$set": {
                "state": "queued", "availableAt": now(), "attempts": 0, "updatedAt": now(), "error": None,
                "errorCode": None, "errorCategory": None,
            }, "$inc": {"redriveCount": 1}, "$unset": {"cleanupAt": ""}}, session=session)
            if not result.matched_count:
                raise AppException(409, "Job changed; refresh and try again")
            await queue.sync_history(job, session)
            await self.db.auth_security_events.insert_one({"event": "mail.redriven", "userId": ObjectId(actor["_id"]),
                "jobId": job_id, "acknowledgedPossibleDuplicate": acknowledge, "createdAt": now(),
                "cleanupAt": now() + timedelta(days=90)}, session=session)
            return {"jobId": job_id, "status": "queued"}
        async with await self.db.client.start_session() as session:
            return await session.with_transaction(commit)
