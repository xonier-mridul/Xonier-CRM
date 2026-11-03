"""Server-side FCM token ownership. The current login contract supports one device per user."""

import hashlib
from datetime import datetime, timezone

from beanie import PydanticObjectId

from app.core.config import get_setting
from app.core.crypto import encryptor
from app.db.db import Client


def token_digest(token: str) -> str:
    # Registration tokens are case-sensitive. Do not use hash_value(), which lowercases.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class PushTokenService:
    def _collection(self):
        return Client[get_setting().DATABASE_NAME]["mobile_push_tokens"]

    async def bind(self, user_id, company_id, token: str, session=None) -> None:
        user_oid = PydanticObjectId(user_id)
        company_oid = PydanticObjectId(company_id)
        digest = token_digest(token)
        collection = self._collection()
        # A rotated token must not keep delivering to its previous account.
        await collection.delete_many(
            {"tokenHash": digest, "$or": [{"userId": {"$ne": user_oid}}, {"companyId": {"$ne": company_oid}}]},
            session=session,
        )
        await collection.update_one(
            {"userId": user_oid, "companyId": company_oid},
            {"$set": {
                "tokenEncrypted": encryptor.encrypt_data(token),
                "tokenHash": digest,
                "updatedAt": datetime.now(timezone.utc),
            }},
            upsert=True,
            session=session,
        )

    async def remove_user(self, user_id, company_id, session=None) -> None:
        await self._collection().delete_many(
            {"userId": PydanticObjectId(user_id), "companyId": PydanticObjectId(company_id)},
            session=session,
        )

    async def get(self, user_id, company_id):
        return await self._collection().find_one({
            "userId": PydanticObjectId(user_id),
            "companyId": PydanticObjectId(company_id),
        })

    async def remove_if_matches(self, user_id, company_id, digest: str) -> None:
        await self._collection().delete_one({
            "userId": PydanticObjectId(user_id),
            "companyId": PydanticObjectId(company_id),
            "tokenHash": digest,
        })
