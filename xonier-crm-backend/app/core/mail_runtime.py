"""Development consumer lifecycle; production delivery stays in separate workers.

Every message still goes through the durable queue, its leases and expiry checks.
This is NOT an inline SMTP fallback in a login request.
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from app.core.config import get_setting
from app.core.mail_delivery import mailpit_enabled
from app.workers.mail_worker import MailWorker

log = logging.getLogger(__name__)


def embedded_enabled(settings):
    development = settings.ENV.strip().lower() in {"development", "dev", "local"}
    if settings.MAIL_WORKER_MODE == "embedded" and not development:
        raise ValueError("Embedded mail workers are development-only; use MAIL_WORKER_MODE=external in production")
    return settings.MAIL_WORKER_MODE == "embedded" or settings.MAIL_WORKER_MODE == "auto" and development


@asynccontextmanager
async def mail_consumers(db, *, transport=None):
    settings = get_setting()
    if mailpit_enabled(settings):
        log.warning("Development email capture enabled: inbox http://127.0.0.1:8025; "
            "SMTP 127.0.0.1:%d. No external mail delivery. Start with "
            "docker compose -f deploy/compose.dev-mail.yml up -d", settings.MAIL_DEV_SMTP_PORT)
    if not embedded_enabled(settings):
        yield
        return
    if settings.MAIL_LEASE_SECONDS < settings.MAIL_SMTP_TIMEOUT_SECONDS * 3:
        raise ValueError("Mail lease must be at least 3x the SMTP wall-clock timeout")
    workers = [MailWorker(db, lane, **({"transport": transport} if transport else {}))
        for lane in ("critical", "general")]
    tasks = [asyncio.create_task(worker.run(), name=f"local-mail-{worker.lane}") for worker in workers]
    log.info("Local durable mail consumers started for critical and general lanes")
    try:
        yield
    finally:
        for worker in workers:
            worker.stop.set()
        try:
            await asyncio.wait_for(asyncio.gather(*tasks), timeout=settings.MAIL_SMTP_TIMEOUT_SECONDS + 5)
        except TimeoutError:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
        log.info("Local mail consumers stopped")
