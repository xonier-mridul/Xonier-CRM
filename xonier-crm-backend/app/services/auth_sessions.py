"""One web and one native-mobile login per account, independently fenced."""
import hashlib
import hmac
import json
import secrets
from datetime import timedelta

from bson import ObjectId
from app.core.config import get_setting
from app.core.crypto import encryptor
from app.core.security_store import database, now, utc
from app.utils.custom_exception import AppException


def fingerprint(value):
    return hashlib.sha256(value.encode()).hexdigest()


def session_error():
    return AppException(401, "This login session has ended or was replaced by another login. Please sign in again.",
                        clear_cookies=True, code="SESSION_REPLACED")


class SessionService:
    def __init__(self, db=None):
        self.db = db if db is not None else database()
        self.settings = get_setting()

    @staticmethod
    def key(user_id, session_type="web"):
        if session_type not in {"web", "mobile"}:
            raise AppException(422, "Invalid session type")
        return f"{ObjectId(user_id)}:{session_type}"

    async def require(self, payload, session=None):
        if (not payload or not payload.get("sid") or not ObjectId.is_valid(payload.get("_id", ""))
                or payload.get("sessionType") not in {"web", "mobile"}):
            raise session_error()
        if payload.get("exp") and payload["exp"] <= now().timestamp():
            raise AppException(401, "Access token expired", code="ACCESS_EXPIRED")
        current = await self.db.auth_sessions.find_one({"_id": self.key(payload["_id"], payload["sessionType"]), "sid": payload["sid"],
            "revokedAt": None, "expiresAt": {"$gt": now()}}, session=session)
        if not current:
            raise session_error()
        return current

    def check_switch(self, current, existing_sid=None):
        if not current or current.get("revokedAt") or utc(current["expiresAt"]) <= now() or existing_sid == current["sid"]:
            return
        blocked = utc(current.get("switchBlockedUntil"))
        if blocked and blocked > now():
            raise AppException(429, "Repeated account switching detected. Keep using the active session, wait, or recover your account with a password reset.",
                code="TAKEOVER_LIMITED", retry_after=max(1, int((blocked - now()).total_seconds()) + 1))

    async def activate(self, user, client_id, *, existing_sid=None, ip=None, agent=None, session_type="web", session):
        key = self.key(user.id, session_type)
        current = await self.db.auth_sessions.find_one({"_id": key}, session=session)
        self.check_switch(current, existing_sid)
        stamp = now()
        active = bool(current and not current.get("revokedAt") and utc(current["expiresAt"]) > stamp)
        takeover = active and existing_sid != current["sid"]
        switches = [utc(t) for t in (current or {}).get("switches", [])
                    if utc(t) > stamp - timedelta(seconds=self.settings.AUTH_TAKEOVER_WINDOW_SECONDS)]
        blocked_until = None
        if takeover:
            switches.append(stamp)
            delay = self.settings.AUTH_TAKEOVER_LOCK_SECONDS if len(switches) >= self.settings.AUTH_TAKEOVER_MAX else self.settings.AUTH_TAKEOVER_COOLDOWN_SECONDS
            blocked_until = stamp + timedelta(seconds=delay)
        elif current:
            blocked_until = current.get("switchBlockedUntil")
        sid = secrets.token_urlsafe(32)
        expires = stamp + timedelta(days=float(self.settings.REFRESH_TOKEN_EXPIRY))
        access = user.generate_access_token(session_id=sid, session_type=session_type)
        refresh = user.generate_refresh_token(session_id=sid, session_type=session_type, expires_at=expires)
        record = {"userId": user.id, "sessionType": session_type, "sid": sid, "clientHash": fingerprint(client_id), "refreshHash": fingerprint(refresh),
            "expiresAt": expires, "createdAt": stamp, "revokedAt": None, "switches": switches[-self.settings.AUTH_TAKEOVER_MAX:],
            "switchBlockedUntil": blocked_until, "previousRefreshHash": None, "refreshResult": None}
        await self.db.auth_sessions.update_one({"_id": key}, {"$set": record}, upsert=True, session=session)
        # Serialize authentication, password resets and disable/restore actions on
        # the same user document as well as the session row.
        result = await self.db.users.update_one({"_id": user.id, "password": user.password, "status": "active"},
            {"$set": {"lastLogin": stamp, "refreshToken": None, "updatedAt": stamp}}, session=session)
        if not result.matched_count:
            raise AppException(401, "Account changed during login. Please start again.", code="LOGIN_RESTART_REQUIRED")
        await self.db.auth_security_events.insert_one({"userId": user.id, "event": "session.replaced" if takeover else "session.started",
            "sessionType": session_type, "createdAt": stamp, "ipHash": fingerprint(ip or "unknown"), "agentHash": fingerprint(agent or "unknown"),
            "cleanupAt": stamp + timedelta(days=90)}, session=session)
        return {"access_token": access, "refresh_token": refresh, "replaced": takeover}

    async def refresh(self, user, payload, *, session):
        current = await self.require(payload, session=session)
        incoming = fingerprint(payload["raw_token"])
        if not hmac.compare_digest(current["refreshHash"], incoming):
            if (current.get("previousRefreshHash") == incoming and current.get("previousRefreshUntil")
                    and utc(current["previousRefreshUntil"]) > now()):
                return json.loads(encryptor.decrypt_data(current["refreshResult"]))
            # A replaced session can never revoke the newer session by replaying
            # its old refresh token. Reject without altering the active row.
            raise session_error()
        access = user.generate_access_token(session_id=current["sid"], session_type=current["sessionType"])
        refresh = user.generate_refresh_token(session_id=current["sid"], session_type=current["sessionType"], expires_at=utc(current["expiresAt"]))
        tokens = {"access_token": access, "refresh_token": refresh}
        changed = await self.db.auth_sessions.update_one({"_id": current["_id"], "sid": current["sid"], "refreshHash": incoming}, {"$set": {
            "refreshHash": fingerprint(refresh), "previousRefreshHash": incoming,
            "previousRefreshUntil": now() + timedelta(seconds=self.settings.AUTH_REFRESH_GRACE_SECONDS),
            "refreshResult": encryptor.encrypt_data(json.dumps(tokens)),
        }}, session=session)
        if not changed.matched_count:
            raise session_error()
        return tokens

    async def revoke(self, user_id, *, sid=None, session=None, recovery=False):
        query = {"userId": ObjectId(user_id)}
        if sid:
            query["sid"] = sid
        values = {"revokedAt": now(), "refreshHash": None, "refreshResult": None}
        if recovery:
            values.update(switches=[], switchBlockedUntil=None)
        return await self.db.auth_sessions.update_many(query, {"$set": values}, session=session)

    async def revoke_company(self, company_id, *, session=None):
        ids = [user["_id"] async for user in self.db.users.find({"companyId": ObjectId(company_id)}, {"_id": 1}, session=session)]
        # Fence a first-ever login racing with company disable, where there is
        # no session row for update_many to conflict with yet.
        await self.db.users.update_many({"_id": {"$in": ids}}, {"$set": {"updatedAt": now()}}, session=session)
        await self.db.auth_sessions.update_many({"userId": {"$in": ids}}, {"$set": {
            "revokedAt": now(), "refreshHash": None, "refreshResult": None,
        }}, session=session)
