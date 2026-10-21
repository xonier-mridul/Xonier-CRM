"""Durable transactional outbox. API processes NEVER contact SMTP."""
import hashlib
import json
import uuid
from datetime import timedelta

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from app.core.config import get_setting
from app.core.crypto import encryptor
from app.core.security_store import database, now, utc
from app.utils.custom_exception import AppException


class MailQueue:
    def __init__(self, db=None):
        self.db = db if db is not None else database()
        self.settings = get_setting()

    async def enqueue(self, **kwargs):
        if kwargs.get("session") is not None:
            return await self._enqueue(**kwargs)
        async def commit(session):
            return await self._enqueue(**{**kwargs, "session": session})
        for attempt in range(3):
            try:
                async with await self.db.client.start_session() as session:
                    return await session.with_transaction(commit)
            except DuplicateKeyError:
                if attempt == 2:
                    raise AppException(409, "Concurrent email request; retry using the same idempotency key")

    async def _enqueue(self, *, to, subject, html, text="", cc=None, bcc=None, reply_to=None,
                      from_name="", kind="transactional", key=None, expires_at=None,
                      history_id=None, otp_ref=None, tenant_id=None, session=None):
        recipients = sorted(set([*(to or []), *(cc or []), *(bcc or [])]))
        if not recipients or len(recipients) > 150:
            raise AppException(422, "Email must have 1–150 recipients")
        if any("\n" in value or "\r" in value for value in [subject, from_name, reply_to or "", *recipients]):
            raise AppException(422, "Email headers cannot contain line breaks")
        group = str(key or uuid.uuid4())
        group_hash = hashlib.sha256(json.dumps({"recipients": recipients, "to": to, "cc": cc, "bcc": bcc,
            "subject": subject, "html": html, "text": text, "replyTo": reply_to, "fromName": from_name},
            sort_keys=True, default=str).encode()).hexdigest()
        group_id = hashlib.sha256(group.encode()).hexdigest()
        existing_group = await self.db.email_outbox.find_one({"_id": group_id}, session=session)
        if existing_group and existing_group["payloadHash"] != group_hash:
            raise AppException(409, "Idempotency key already used for a different email")
        await self.db.email_outbox.update_one({"_id": group_id}, {"$setOnInsert": {
            "payloadHash": group_hash, "createdAt": now(),
            "cleanupAt": now() + timedelta(days=max(4, self.settings.MAIL_RETENTION_DAYS + 4)),
        }}, upsert=True, session=session)
        jobs = []
        for recipient in recipients:
            # One SMTP envelope recipient per job: partial RCPT acceptance can
            # never cause already accepted recipients to receive a retry.
            payload = {"recipient": recipient, "to": to, "cc": cc or [], "subject": subject,
                "html": html, "text": text or "", "replyTo": reply_to,
                "fromName": from_name, "fromEmail": self.settings.FROM_EMAIL}
            serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
            if len(serialized.encode()) > self.settings.MAIL_MAX_MESSAGE_BYTES:
                raise AppException(413, "Email body exceeds the configured queue size limit")
            job_id = hashlib.sha256(f"{group}:{recipient}".encode()).hexdigest()
            digest = hashlib.sha256(serialized.encode()).hexdigest()
            job = {"_id": job_id, "groupId": group, "payloadHash": digest,
                "payloadCipher": encryptor.encrypt_data(serialized), "state": "queued",
                "lane": "critical" if kind in {"otp", "security"} else "general",
                "kind": kind, "priority": 0 if kind == "otp" else 10 if kind == "security" else 30 if kind == "bulk" else 20,
                "attempts": 0, "availableAt": now(), "createdAt": now(),
                "expiresAt": expires_at or now() + timedelta(days=3),
                "historyId": history_id, "otpRef": otp_ref, "tenantId": tenant_id}
            existing = await self.db.email_jobs.find_one({"_id": job_id}, {"payloadHash": 1}, session=session)
            if existing and existing["payloadHash"] != digest:
                raise AppException(409, "Idempotency key already used for a different email")
            await self.db.email_jobs.update_one({"_id": job_id},
                {"$setOnInsert": job}, upsert=True, session=session)
            jobs.append(job_id)
        return {"status": "queued", "groupId": group, "jobIds": jobs}

    async def valid_otp(self, job, session=None):
        ref = job.get("otpRef")
        if not ref:
            return True
        # Collection names and predicates are server-generated, never user input.
        if ref["collection"] not in {"auth_challenges", "otps"}:
            return False
        return bool(await self.db[ref["collection"]].find_one(ref["filter"], {"_id": 1}, session=session))

    async def claim(self, owner, lane):
        query = {"state": "queued", "lane": lane, "availableAt": {"$lte": now()}}
        return await self.db.email_jobs.find_one_and_update(query,
            {"$set": {"state": "sending", "phase": "claimed", "leaseOwner": owner,
                      "leaseUntil": now() + timedelta(seconds=self.settings.MAIL_LEASE_SECONDS)}, "$inc": {"attempts": 1}},
            sort=[("priority", 1), ("availableAt", 1), ("_id", 1)], return_document=ReturnDocument.AFTER)

    async def dispatching(self, job):
        if utc(job["expiresAt"]) <= now() or not await self.valid_otp(job):
            raise StaleMail()
        result = await self.db.email_jobs.update_one(self.fence(job), {"$set": {"phase": "dispatching"}})
        if not result.matched_count:
            raise LostLease()

    def fence(self, job):
        return {"_id": job["_id"], "state": "sending", "leaseOwner": job["leaseOwner"], "leaseUntil": {"$gt": now()}}

    async def finish(self, job, state, *, error=None, retry_in=None):
        async def commit(session):
            fields = {"state": state, "updatedAt": now(), "error": error}
            if retry_in is not None:
                fields["availableAt"] = now() + timedelta(seconds=retry_in)
            else:
                fields["cleanupAt"] = now() + timedelta(days=self.settings.MAIL_RETENTION_DAYS)
            mutation = {"$set": fields, "$unset": {"leaseOwner": "", "leaseUntil": "", "phase": ""}}
            if state in {"sent", "expired", "cancelled"}:
                mutation["$unset"]["payloadCipher"] = ""
            changed = await self.db.email_jobs.update_one(self.fence(job), mutation, session=session)
            if not changed.matched_count:
                return False
            await self.sync_history(job, session)
            return True
        async with await self.db.client.start_session() as session:
            return await session.with_transaction(commit)

    async def sync_history(self, job, session):
        if not job.get("historyId"):
            return
        outstanding = await self.db.email_jobs.find({"groupId": job["groupId"], "state": {"$ne": "sent"}},
            {"state": 1}, session=session).to_list(151)
        pending = any(row["state"] in {"queued", "sending"} for row in outstanding)
        status = "queued" if pending else "failed" if outstanding else "sent"
        history = await self.db.email_history.find_one({"_id": job["historyId"]}, session=session)
        if not history:
            return
        changed = await self.db.email_history.update_one({"_id": job["historyId"]}, {"$set": {
            "status": status, "updated_at": now(), "sent_at": now() if status == "sent" else None,
            "retry_count": max(job["attempts"] - 1, history.get("retry_count", 0)),
            "error_message": "Some recipients failed or require delivery review" if status == "failed" else None,
        }}, session=session)
        template = history.get("template")
        if changed.matched_count and status == "sent" and history.get("status") != "sent" and template:
            await self.db.email_templates.update_one({"_id": template.id},
                {"$inc": {"usage_count": 1}, "$set": {"last_used_at": now()}}, session=session)

    async def recover(self):
        # Never blindly retry a job that might already have been accepted by
        # SMTP. An expired dispatching lease is explicitly "uncertain".
        for phase, state in [("claimed", "queued"), ("dispatching", "uncertain")]:
            async for job in self.db.email_jobs.find({"state": "sending", "phase": phase, "leaseUntil": {"$lte": now()}}).limit(100):
                async def commit(session):
                    terminal = state == "uncertain" or job["attempts"] >= self.settings.MAIL_MAX_ATTEMPTS
                    final_state = state if not terminal or state == "uncertain" else "failed"
                    values = {"state": final_state, "availableAt": now(), "error": "worker_lease_expired"}
                    if terminal:
                        values["cleanupAt"] = now() + timedelta(days=self.settings.MAIL_RETENTION_DAYS)
                    result = await self.db.email_jobs.update_one({"_id": job["_id"], "leaseOwner": job["leaseOwner"],
                        "state": "sending", "leaseUntil": {"$lte": now()}}, {"$set": values,
                        "$unset": {"leaseOwner": "", "leaseUntil": "", "phase": ""}}, session=session)
                    if result.matched_count:
                        await self.sync_history(job, session)
                async with await self.db.client.start_session() as session:
                    await session.with_transaction(commit)


class StaleMail(Exception):
    pass


class LostLease(Exception):
    pass
