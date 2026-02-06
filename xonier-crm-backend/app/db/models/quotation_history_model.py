from beanie import Document, Link, before_event, Insert, Save, Replace
from pydantic import Field
from app.core.enums import QuotationEventType, QuotationStatus
from app.db.models.quotation_model import QuotationModel
from app.db.models.user_model import UserModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from pymongo import IndexModel
from app.core.crypto import Encryption
from app.core.security import hash_value

encryption = Encryption()



class QuotationHistoryModel(Document):
    quotation: Link[QuotationModel]

    eventType: QuotationEventType
    delta: Optional[Dict[str, Any]] = None

    previousStatus: Optional[QuotationStatus] = None
    newStatus: Optional[QuotationStatus] = None

    performedBy: Optional[Link[UserModel]] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "quotation_history"
        indexes = [
            IndexModel([("quotation", 1)]),
            IndexModel([("eventType", 1)]),
            IndexModel([("createdAt", -1)]),
        ]

    