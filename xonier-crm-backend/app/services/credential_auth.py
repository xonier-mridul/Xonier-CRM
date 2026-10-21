"""Password-verified OTP challenges and durable per-client-type session slots."""
import hashlib
import hmac
import secrets
from datetime import timedelta

from bson import ObjectId
from fastapi.encoders import jsonable_encoder
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.config import get_setting
from app.core.crypto import encryptor
from app.core.security import hash_password, hash_value
from app.core.security_store import database, now, utc, rate_limit
from app.core.tenant import system_query
from app.services.auth_sessions import SessionService, fingerprint, session_error
from app.services.mail_queue import MailQueue
from app.templates.email_template import otp_template
from app.utils.custom_exception import AppException


class CredentialAuth:
    def __init__(self, owner):
        self.owner, self.db = owner, database()
        self.settings = get_setting()
        self.sessions, self.mail = SessionService(self.db), MailQueue(self.db)

    def digest(self, value):
        return hmac.new(self.settings.SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()

    def client_hash(self, client_id):
        # Only a challenge-binding hint, never accepted as proof of ownership.
        return fingerprint(client_id or "legacy-client")

    async def transaction(self, callback):
        for attempt in range(3):
            try:
                async with await self.owner.client.start_session() as session:
                    return await session.with_transaction(callback)
            except DuplicateKeyError:
                if attempt == 2:
                    raise AppException(409, "A concurrent login changed this account. Please retry.", code="LOGIN_CONFLICT")

    async def account(self, data, *, admin=False, session=None, check_password=False):
        email_hash = hash_value(data["email"].strip().lower())
        with system_query():
            if admin:
                user = await self.owner.repo.find_user_by_hashMail(email_hash, populate=["userRole"], session=session)
            else:
                company = await self.owner.companyRepo.find_company_by_companyId(data.get("companyId"), populate=["subscription"], session=session)
                if not company:
                    raise AppException(404, "Company not found against provided company ID")
                if company.status != "active":
                    raise AppException(400, f"Company status is {company.status}; contact support")
                if not company.subscription or company.subscription.status != "active":
                    raise AppException(403, "An active company subscription is required")
                user = await self.owner.repo.find_user_by_hashMail_and_companyId(email_hash, str(company.id), populate=["userRole"], session=session)
        if not user or user.status != "active" or not user.isEmailVerified:
            raise AppException(401, "Invalid credentials or inactive account")
        roles = [role.code for role in user.userRole]
        if admin and "SUPER_ADMIN" not in roles:
            raise AppException(401, "Invalid credentials or inactive account")
        if check_password and not user.compare_password(data.get("password", "")):
            raise AppException(401, "Invalid credentials or inactive account")
        return user

    async def challenge_user(self, challenge, session=None):
        with system_query():
            user = await self.owner.repo.find_by_id(challenge["userId"], populate=["userRole"], session=session)
        if not user or user.status != "active" or not hmac.compare_digest(challenge["passwordFingerprint"], self.digest(user.password)):
            raise AppException(401, "Account changed. Please start again.", code="LOGIN_RESTART_REQUIRED")
        if challenge["purpose"] == "admin_login":
            if "SUPER_ADMIN" not in [role.code for role in user.userRole]:
                raise AppException(403, "Administrator login is no longer allowed")
        elif user.companyId:
            with system_query():
                company = await self.owner.companyRepo.find_by_id(user.companyId, populate=["subscription"], session=session)
            if not company or company.status != "active" or not company.subscription or company.subscription.status != "active":
                raise AppException(403, "An active company subscription is required")
        return user

    async def enqueue_otp(self, challenge, otp, email, session):
        subject = "Password reset verification" if challenge["purpose"] == "password_reset" else "Verify your Trakeroo login"
        return await self.mail.enqueue(to=[email], subject=subject,
            text=f"Your verification code is {otp}. It expires in {self.settings.AUTH_OTP_SECONDS // 60} minutes. Never share this code.",
            html=otp_template(title=subject, otp_code=otp), kind="otp",
            key=f"otp:{challenge['_id']}:{challenge['generation']}", expires_at=challenge["expiresAt"],
            tenant_id=challenge.get("companyId"), otp_ref={"collection": "auth_challenges", "filter": {
                "_id": challenge["_id"], "generation": challenge["generation"], "usedAt": None,
                "attempts": {"$lt": self.settings.AUTH_OTP_MAX_ATTEMPTS},
            }}, session=session)

    async def issue(self, user, purpose, client_id, session, session_type="web"):
        stamp = now()
        # Serialize concurrent challenge issuance, recovery and account changes
        # even when no previous challenge/session document exists yet.
        changed = await self.db.users.update_one({"_id": user.id, "password": user.password,
            "status": "active", "isEmailVerified": True, "deletedAt": None},
            {"$set": {"updatedAt": stamp}}, session=session)
        if not changed.matched_count:
            raise AppException(401, "Account changed. Please start again.", code="LOGIN_RESTART_REQUIRED")
        challenge_id = secrets.token_urlsafe(32)
        otp = str(secrets.randbelow(900000) + 100000)
        challenge = {"_id": challenge_id, "userId": user.id, "companyId": user.companyId,
            "purpose": purpose, "sessionType": session_type, "clientHash": self.client_hash(client_id), "generation": 1,
            "otpHash": self.digest(f"{challenge_id}:{otp}"), "passwordFingerprint": self.digest(user.password),
            "attempts": 0, "usedAt": None, "createdAt": stamp, "sentAt": stamp,
            "expiresAt": stamp + timedelta(seconds=self.settings.AUTH_OTP_SECONDS),
            "cleanupAt": stamp + timedelta(days=1)}
        await self.db.auth_challenges.update_many({"userId": user.id, "purpose": purpose,
            "clientHash": challenge["clientHash"], "usedAt": None}, {"$set": {"usedAt": stamp}}, session=session)
        await self.db.auth_challenges.insert_one(challenge, session=session)
        await self.enqueue_otp(challenge, otp, encryptor.decrypt_data(user.email), session)
        return {"challengeId": challenge_id, "expiresIn": self.settings.AUTH_OTP_SECONDS, "resendAfter": 60, "mailStatus": "queued"}

    async def begin(self, data, *, admin=False, ip=None, client_id="", existing_sid=None, session_type="web"):
        await rate_limit(self.db, f"login-ip:{ip or 'unknown'}", 30, 60)
        user = await self.account(data, admin=admin, check_password=True)
        await rate_limit(self.db, f"login-user:{user.id}:{session_type}", 5, 300)
        current = await self.db.auth_sessions.find_one({"_id": self.sessions.key(user.id, session_type)})
        self.sessions.check_switch(current, existing_sid)
        async def commit(session):
            purpose = "mobile_login" if session_type == "mobile" else "admin_login" if admin else "login"
            return await self.issue(user, purpose, client_id, session, session_type)
        return await self.transaction(commit)

    async def challenge(self, challenge_id, purpose, client_id, *, session=None):
        doc = await self.db.auth_challenges.find_one({"_id": challenge_id, "purpose": purpose,
            "clientHash": self.client_hash(client_id), "usedAt": None, "expiresAt": {"$gt": now()},
            "attempts": {"$lt": self.settings.AUTH_OTP_MAX_ATTEMPTS}}, session=session)
        if not doc:
            raise AppException(400, "OTP expired, already used or invalid. Start again.", code="OTP_INVALID")
        return doc

    async def resend(self, data, *, admin=False, ip=None, client_id="", session_type="web"):
        await rate_limit(self.db, f"resend-ip:{ip or 'unknown'}", 20, 60)
        purpose = "mobile_login" if session_type == "mobile" else "admin_login" if admin else "login"
        async def commit(session):
            doc = await self.challenge(data["challengeId"], purpose, client_id, session=session)
            user = await self.challenge_user(doc, session)
            elapsed = (now() - utc(doc["sentAt"])).total_seconds()
            if elapsed < 60:
                raise AppException(429, "Please wait before requesting another code", code="OTP_RESEND_LIMITED", retry_after=max(1, int(60 - elapsed)))
            code = str(secrets.randbelow(900000) + 100000)
            doc.update(otpHash=self.digest(f"{doc['_id']}:{code}"), generation=doc["generation"] + 1,
                       sentAt=now(), expiresAt=now() + timedelta(seconds=self.settings.AUTH_OTP_SECONDS))
            await self.db.auth_challenges.update_one({"_id": doc["_id"], "usedAt": None}, {"$set": {
                key: doc[key] for key in ["otpHash", "generation", "sentAt", "expiresAt"]}}, session=session)
            await self.enqueue_otp(doc, code, encryptor.decrypt_data(user.email), session)
            return {"challengeId": doc["_id"], "expiresIn": self.settings.AUTH_OTP_SECONDS, "resendAfter": 60, "mailStatus": "queued"}
        return await self.transaction(commit)

    async def check_code(self, data, purpose, client_id, ip):
        await rate_limit(self.db, f"verify-ip:{ip or 'unknown'}", 40, 60)
        doc = await self.challenge(data["challengeId"], purpose, client_id)
        if not hmac.compare_digest(doc["otpHash"], self.digest(f"{doc['_id']}:{data['otp']}")):
            await self.db.auth_challenges.update_one({"_id": doc["_id"], "usedAt": None,
                "attempts": {"$lt": self.settings.AUTH_OTP_MAX_ATTEMPTS}}, {"$inc": {"attempts": 1}})
            raise AppException(400, "Invalid verification code", code="OTP_INVALID")
        return doc

    async def consume(self, doc, session):
        result = await self.db.auth_challenges.update_one({"_id": doc["_id"], "generation": doc["generation"],
            "otpHash": doc["otpHash"], "usedAt": None, "expiresAt": {"$gt": now()},
            "attempts": {"$lt": self.settings.AUTH_OTP_MAX_ATTEMPTS}}, {"$set": {"usedAt": now()}}, session=session)
        if not result.matched_count:
            raise AppException(400, "OTP expired or already used", code="OTP_INVALID")

    async def profile(self, user_id, session):
        with system_query():
            profile = await self.owner.repo.find_by_id_nested(user_id, ["userRole", "userRole.permissions"], session=session)
        result = jsonable_encoder(profile, exclude={"password", "refreshToken", "hashedEmail", "hashedPhone"})
        for key in ["email", "phone"]:
            if result.get(key):
                result[key] = encryptor.decrypt_data(result[key])
        return result

    async def verify(self, data, *, admin=False, ip=None, agent=None, client_id="", existing_sid=None, session_type="web"):
        purpose = "mobile_login" if session_type == "mobile" else "admin_login" if admin else "login"
        initial = await self.check_code(data, purpose, client_id, ip)
        async def commit(session):
            doc = await self.challenge(initial["_id"], purpose, client_id, session=session)
            if not hmac.compare_digest(doc["otpHash"], initial["otpHash"]):
                raise AppException(400, "A newer code was sent. Use the latest one.", code="OTP_INVALID")
            user = await self.challenge_user(doc, session)
            await self.consume(doc, session)
            tokens = await self.sessions.activate(user, client_id, existing_sid=existing_sid, ip=ip, agent=agent,
                session_type=session_type, session=session)
            if tokens.pop("replaced", False):
                await self.mail.enqueue(to=[encryptor.decrypt_data(user.email)], subject=f"A new {session_type} login replaced your Trakeroo session",
                    text=f"A verified {session_type} login ended your previous {session_type} session. Your other device type was not logged out. If this was not you, reset your password and do not share verification codes.",
                    html=f"<p>A new verified {session_type} login ended your previous {session_type} session only.</p><p>If this was not you, reset your password and keep your account and email secure.</p>",
                    kind="security", key=f"session-notice:{fingerprint(tokens['access_token'])}", session=session)
            return {"user": await self.profile(user.id, session), **tokens}
        return await self.transaction(commit)

    async def refresh(self, payload):
        async def commit(session):
            with system_query():
                user = await self.owner.repo.find_by_id(ObjectId(payload["_id"]), populate=["userRole"], session=session)
            if not user or user.status != "active" or not user.isEmailVerified:
                raise session_error()
            if user.companyId:
                with system_query():
                    company = await self.owner.companyRepo.find_by_id(user.companyId, populate=["subscription"], session=session)
                if not company or company.status != "active" or not company.subscription or company.subscription.status != "active":
                    raise session_error()
            tokens = await self.sessions.refresh(user, payload, session=session)
            return {"message": "Token refreshed successfully", "user": await self.profile(user.id, session), **tokens}
        return await self.transaction(commit)

    async def forgot(self, data, *, ip=None, client_id=""):
        await rate_limit(self.db, f"recover-ip:{ip or 'unknown'}", 10, 300)
        # Keep the established company eligibility checks, but never send a code
        # for an unverified/nonexistent user or bypass the selected tenant.
        user = await self.account(data)
        if "SUPER_ADMIN" in [role.code for role in user.userRole]:
            raise AppException(403, "Super Admin recovery requires the administrator recovery procedure")
        await rate_limit(self.db, f"recover-user:{user.id}", 3, 300)
        async def commit(session):
            return await self.issue(user, "password_reset", client_id, session)
        return await self.transaction(commit)

    async def recover_password(self, data, *, ip=None, client_id=""):
        initial = await self.check_code(data, "password_reset", client_id, ip)
        password_hash = hash_password(data["password"])
        async def commit(session):
            doc = await self.challenge(initial["_id"], "password_reset", client_id, session=session)
            if not hmac.compare_digest(doc["otpHash"], initial["otpHash"]):
                raise AppException(400, "Use the latest OTP", code="OTP_INVALID")
            user = await self.challenge_user(doc, session)
            await self.consume(doc, session)
            await self.db.users.update_one({"_id": user.id}, {"$set": {"password": password_hash,
                "refreshToken": None, "updatedAt": now()}}, session=session)
            await self.sessions.revoke(user.id, session=session, recovery=True)
            await self.mail.enqueue(to=[encryptor.decrypt_data(user.email)], subject="Your Trakeroo password was reset",
                text="Your password was reset and all login sessions were ended. If this was not you, contact your administrator immediately.",
                html="<p>Your password was reset. All sessions have been ended.</p>", kind="security",
                key=f"password-reset:{doc['_id']}", session=session)
            return True
        return await self.transaction(commit)
