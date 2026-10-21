"""Run separately: python -m app.workers.mail_worker --lane critical|general."""
import argparse
import asyncio
import contextlib
import json
import logging
import random
import signal
import uuid
from datetime import timedelta
from email.message import EmailMessage
from email.utils import formataddr
from cryptography.fernet import InvalidToken

import aiosmtplib
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import get_setting
from app.core.crypto import encryptor
from app.core.security_store import initialize_security_indexes, now, utc, rate_limit
from app.services.mail_queue import MailQueue, StaleMail, LostLease
from app.utils.custom_exception import AppException

log = logging.getLogger("trakeroo.mail")


class RejectedMail(Exception):
    def __init__(self, code):
        self.code = int(code)


async def smtp_send(payload, message_id, mark_dispatching):
    settings = get_setting()
    port = int(settings.EMAIL_PORT)
    mode = settings.MAIL_SMTP_TLS
    if mode not in {"auto", "tls", "starttls"}:
        raise ValueError("MAIL_SMTP_TLS must be auto, tls or starttls")
    implicit = mode == "tls" or mode == "auto" and port == 465
    smtp = aiosmtplib.SMTP(hostname=settings.EMAIL_HOST, port=port, use_tls=implicit,
        start_tls=not implicit, validate_certs=True, timeout=settings.MAIL_SMTP_TIMEOUT_SECONDS)
    try:
        await smtp.connect()
        if settings.EMAIL_USER:
            await smtp.login(settings.EMAIL_USER, settings.EMAIL_PASS)
        message = EmailMessage()
        message["Message-ID"] = f"<{message_id}@trakeroo-mail>"
        message["Subject"] = payload["subject"]
        message["From"] = formataddr((payload["fromName"], payload["fromEmail"]))
        message["To"] = ", ".join(payload["to"])
        if payload["cc"]:
            message["Cc"] = ", ".join(payload["cc"])
        if payload.get("replyTo"):
            message["Reply-To"] = payload["replyTo"]
        # BCC is an envelope recipient, NEVER a MIME header.
        message.set_content(payload["text"])
        message.add_alternative(payload["html"], subtype="html")
        await mark_dispatching()
        try:
            await smtp.send_message(message, sender=payload["fromEmail"], recipients=[payload["recipient"]])
        except aiosmtplib.SMTPRecipientsRefused as error:
            raise RejectedMail(error.recipients[0].code) from error
        except aiosmtplib.SMTPResponseException as error:
            raise RejectedMail(error.code) from error
    finally:
        # Delivery is decided by DATA's response, not by a later QUIT failure.
        with contextlib.suppress(Exception):
            smtp.close()


class MailWorker:
    def __init__(self, db, lane, transport=smtp_send):
        self.queue, self.lane, self.transport = MailQueue(db), lane, transport
        self.settings = get_setting()
        self.owner = uuid.uuid4().hex
        self.stop = asyncio.Event()

    async def once(self):
        job = await self.queue.claim(uuid.uuid4().hex, self.lane)
        if not job:
            return False
        dispatching = False

        async def mark():
            nonlocal dispatching
            await self.queue.dispatching(job)
            dispatching = True

        try:
            if utc(job["expiresAt"]) <= now() or not await self.queue.valid_otp(job):
                await self.queue.finish(job, "expired")
                return True
            try:
                await rate_limit(self.queue.db, "smtp-global", self.settings.MAIL_RATE_PER_SECOND, 1)
            except AppException as error:
                if error.status_code != 429:
                    raise
                # Rate limiting is not a delivery attempt.
                await self.queue.db.email_jobs.update_one(self.queue.fence(job), {"$inc": {"attempts": -1}})
                await self.queue.finish(job, "queued", retry_in=1)
                return True
            payload = json.loads(encryptor.decrypt_data(job["payloadCipher"]))
            await asyncio.wait_for(self.transport(payload, job["_id"], mark), timeout=self.settings.MAIL_SMTP_TIMEOUT_SECONDS)
            await self.queue.finish(job, "sent")
        except StaleMail:
            await self.queue.finish(job, "expired")
        except LostLease:
            pass
        except Exception as error:
            permanent = isinstance(error, RejectedMail) and error.code >= 500
            if not dispatching and isinstance(error, (InvalidToken, ValueError, KeyError, TypeError)):
                permanent = True
            if isinstance(error, aiosmtplib.SMTPResponseException):
                permanent = error.code >= 500
            uncertain = dispatching and not isinstance(error, RejectedMail)
            state = "uncertain" if uncertain else "failed" if permanent or job["attempts"] >= self.settings.MAIL_MAX_ATTEMPTS else "queued"
            delay = min(3600, 5 * 2 ** (job["attempts"] - 1)) + random.uniform(0, 3)
            # Never log body, recipient, password, OTP or SMTP's raw response.
            await self.queue.finish(job, state, error=type(error).__name__, retry_in=delay if state == "queued" else None)
            log.warning("mail_job state=%s id=%s attempt=%d", state, job["_id"], job["attempts"])
        return True

    async def consume(self):
        while not self.stop.is_set():
            try:
                if await self.once():
                    continue
            except Exception:
                log.error("Mail queue unavailable; retrying safely")
            try:
                await asyncio.wait_for(self.stop.wait(), timeout=1)
            except TimeoutError:
                pass

    async def maintain(self):
        while not self.stop.is_set():
            try:
                await self.queue.recover()
                await self.queue.db.email_workers.update_one({"_id": self.owner}, {"$set": {
                    "lane": self.lane, "lastSeenAt": now(), "cleanupAt": now() + timedelta(minutes=5)}}, upsert=True)
            except Exception:
                log.error("Mail worker maintenance failed")
            try:
                await asyncio.wait_for(self.stop.wait(), timeout=10)
            except TimeoutError:
                pass

    async def run(self):
        if self.settings.MAIL_LEASE_SECONDS < self.settings.MAIL_SMTP_TIMEOUT_SECONDS * 3:
            raise ValueError("Mail lease must be at least 3x the SMTP wall-clock timeout")
        await asyncio.gather(self.maintain(), *[self.consume() for _ in range(self.settings.MAIL_WORKER_CONCURRENCY)])


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lane", choices=["critical", "general"], required=True)
    args = parser.parse_args()
    settings = get_setting()
    client = AsyncIOMotorClient(settings.MONGO_URI, tz_aware=True, w="majority")
    try:
        db = client[settings.DATABASE_NAME]
        await initialize_security_indexes(db)
        worker = MailWorker(db, args.lane)
        loop = asyncio.get_running_loop()
        for signum in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(signum, worker.stop.set)
        await worker.run()
    finally:
        client.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(main())
