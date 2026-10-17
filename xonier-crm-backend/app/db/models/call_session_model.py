from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from pydantic import Field
from pymongo import IndexModel, DESCENDING

from app.db.models.base_model import BaseDocument

# Lifecycle of a click-to-call session (web app -> backend -> mobile app dialer)
CALL_PENDING = "pending"        # created by web, waiting for the mobile app
CALL_DELIVERED = "delivered"    # mobile app received the request
CALL_DIALING = "dialing"        # mobile app opened the dialer / call started
CALL_ENDED = "ended"            # call finished (duration reported by mobile)
CALL_FAILED = "failed"          # mobile could not place the call
CALL_CANCELLED = "cancelled"    # cancelled from web (or superseded by a newer request)
CALL_EXPIRED = "expired"        # mobile never picked it up in time

ACTIVE_CALL_STATUSES = [CALL_PENDING, CALL_DELIVERED, CALL_DIALING]


class CallSessionModel(BaseDocument):
    """One click-to-call attempt for a lead, initiated from the web app."""

    agentId: PydanticObjectId
    leadId: PydanticObjectId
    leadName: Optional[str] = None
    # Stored exactly as on the lead (already encrypted); decrypted only when sent to the mobile app.
    phone: str

    status: str = CALL_PENDING
    failureReason: Optional[str] = None

    requestedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deliveredAt: Optional[datetime] = None
    dialedAt: Optional[datetime] = None
    endedAt: Optional[datetime] = None
    durationSec: Optional[int] = None

    # "Was call connected?" answer given on the web app
    disposition: Optional[str] = None          # "connected" | "not_connected"
    disposedAt: Optional[datetime] = None

    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "call_sessions"
        indexes = [
            IndexModel([("agentId", 1), ("status", 1)], name="idx_call_agent_status"),
            IndexModel([("leadId", 1), ("createdAt", DESCENDING)], name="idx_call_lead_created"),
        ]
