"""Small, side-effect free rules shared by HTTP, workers and WebSocket delivery."""
from datetime import datetime, timezone

from bson import ObjectId

from app.utils.custom_exception import AppException


def now():
    return datetime.now(timezone.utc)


def oid(value):
    try:
        return ObjectId(str(value))
    except Exception:
        raise AppException(400, "Invalid resource id")


def public(doc):
    """Serialize BSON without exposing internal storage/outbox fields."""
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.replace(tzinfo=doc.tzinfo or timezone.utc).isoformat()
    if isinstance(doc, list):
        return [public(v) for v in doc]
    if isinstance(doc, dict):
        return {("id" if k == "_id" else k): public(v) for k, v in doc.items()
                if k not in {"companyId", "dmKey", "requestHash", "storageKey", "sealedKey", "scanLease", "scanError"}}
    return doc


def require_member(conversation, user_id):
    if not conversation or user_id not in conversation.get("memberIds", []):
        # Same response for absent/inaccessible conversations avoids existence disclosure.
        raise AppException(404, "Conversation not found")


def require_owner(conversation, user_id):
    require_member(conversation, user_id)
    if conversation["ownerId"] != user_id or conversation["kind"] == "dm":
        raise AppException(403, "Only the group/channel owner can manage members")


def require_author(message, user_id):
    if message["senderId"] != user_id:
        raise AppException(403, "You can only change your own messages")
    if message.get("deletedAt"):
        raise AppException(409, "Message has already been deleted")


def validate_members(kind, members, user_id, maximum):
    members = sorted(set([user_id, *members]))
    if len(members) > maximum:
        raise AppException(400, f"A conversation can have at most {maximum} members")
    if kind == "dm" and len(members) != 2:
        raise AppException(400, "Select exactly one other person for a direct message")
    return members
