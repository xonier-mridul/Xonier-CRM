"""Super-admin OTP audit metadata. Never exposes login codes or challenge secrets."""
import hashlib
import math
from typing import Dict, Any

from fastapi.encoders import jsonable_encoder

from app.core.security_store import database
from app.core.crypto import encryptor
from app.utils.custom_exception import AppException
from app.utils.validate_admin import validate_admin


class OTPService:
    async def get_all_otp(self, user: Dict[str, Any], filters: Dict[str, Any]):
        if not validate_admin(user["userRole"]):
            raise AppException(403, "You are not authorized to access OTP history")
        try:
            page = max(1, int(filters.get("page") or 1))
            limit = min(100, max(1, int(filters.get("limit") or 20)))
        except (ValueError, TypeError):
            raise AppException(422, "Invalid OTP history pagination")
        # Login/recovery moved to auth_challenges. Keep the established history
        # page useful without copying plaintext codes back into legacy otps.
        challenge_pipeline = [
            {"$lookup": {"from": "users", "localField": "userId", "foreignField": "_id",
                "pipeline": [{"$project": {"email": 1}}], "as": "owner"}},
            {"$project": {"_id": 1, "challenge": {"$literal": True},
                "encrypt_mail": {"$arrayElemAt": ["$owner.email", 0]},
                "email": {"$literal": ""}, "otp_type": {"$cond": [
                    {"$eq": ["$purpose", "password_reset"]}, "reset", "login"]},
                "is_used": {"$ne": [{"$ifNull": ["$usedAt", None]}, None]},
                "expires_at": "$expiresAt", "createdAt": 1, "updatedAt": "$sentAt"}},
        ]
        result = await database().otps.aggregate([
            {"$project": {"_id": 1, "encrypt_mail": 1, "email": 1, "otp_type": 1,
                "is_used": 1, "expires_at": 1, "createdAt": 1, "updatedAt": 1}},
            {"$unionWith": {"coll": "auth_challenges", "pipeline": challenge_pipeline}},
            {"$sort": {"createdAt": -1, "_id": -1}},
            {"$facet": {"data": [{"$skip": (page - 1) * limit}, {"$limit": limit}],
                "count": [{"$count": "total"}]}},
        ]).to_list(1)
        result = result[0] if result else {"data": [], "count": []}
        for row in result["data"]:
            if row.pop("challenge", False):
                # A history row identifier must not become a usable login nonce.
                row["id"] = "challenge-" + hashlib.sha256(row.pop("_id").encode()).hexdigest()
            else:
                row["id"] = str(row.pop("_id"))
            encrypted = row.get("encrypt_mail")
            row["encrypt_mail"] = encryptor.decrypt_data(encrypted) if encrypted else ""
            row["otp"] = row["encrypt_opt"] = ""
        total = result["count"][0]["total"] if result["count"] else 0
        return jsonable_encoder({"data": result["data"], "page": page, "limit": limit,
            "total": total, "totalPages": math.ceil(total / limit)})
