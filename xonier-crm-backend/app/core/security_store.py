"""Shared durable primitives. No process-local state is an auth authority."""
import importlib
import hashlib
from datetime import datetime, timezone, timedelta
from pymongo import ReturnDocument
from app.utils.custom_exception import AppException


def now():
    return datetime.now(timezone.utc)


def utc(value):
    return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


def database():
    db = importlib.import_module("app.db.db").db
    if db is None:
        raise AppException(503, "Database unavailable; please retry", code="AUTH_UNAVAILABLE")
    return db


async def rate_limit(db, key: str, limit: int, seconds: int):
    timestamp = int(now().timestamp())
    bucket = timestamp // seconds
    doc = await db.security_limits.find_one_and_update(
        {"_id": f"{hashlib.sha256(key.encode()).hexdigest()}:{bucket}"},
        {"$inc": {"count": 1}, "$setOnInsert": {"cleanupAt": now() + timedelta(seconds=seconds * 2)}},
        upsert=True, return_document=ReturnDocument.AFTER,
    )
    if doc["count"] > limit:
        raise AppException(429, "Too many attempts. Please wait before trying again.",
                           code="RATE_LIMITED", retry_after=seconds - timestamp % seconds)


async def initialize_security_indexes(db):
    await db.security_limits.create_index("cleanupAt", expireAfterSeconds=0)
    await db.auth_sessions.create_index([("userId", 1), ("sessionType", 1)], unique=True,
        partialFilterExpression={"sessionType": {"$exists": True}})
    await db.auth_challenges.create_index("cleanupAt", expireAfterSeconds=0)
    await db.auth_challenges.create_index([("userId", 1), ("purpose", 1), ("clientHash", 1), ("createdAt", -1)])
    await db.auth_security_events.create_index([("userId", 1), ("createdAt", -1)])
    await db.auth_security_events.create_index("cleanupAt", expireAfterSeconds=0)
    await db.email_jobs.create_index([("state", 1), ("lane", 1), ("priority", 1), ("availableAt", 1)])
    await db.email_jobs.create_index([("state", 1), ("leaseUntil", 1)])
    await db.email_jobs.create_index([("groupId", 1), ("state", 1)])
    await db.email_jobs.create_index("cleanupAt", expireAfterSeconds=0)
    await db.email_jobs.create_index([("historyId", 1), ("state", 1)])
    await db.email_outbox.create_index("cleanupAt", expireAfterSeconds=0)
    await db.email_workers.create_index("cleanupAt", expireAfterSeconds=0)
