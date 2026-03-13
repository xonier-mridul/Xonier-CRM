from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from beanie import Document, Link
from pydantic import Field
from pymongo import IndexModel, ASCENDING, DESCENDING
from app.db.models.user_model import UserModel


from app.core.enums import MESSAGE_CHANNEL, MESSAGE_DIRECTION, MESSAGE_STATUS


class SMSHistory(Document):

    provider_message_sid: Optional[str] = None      
    conversation_id: Optional[str] = None          

    
    sent_by: Optional[Link[UserModel]] = None         
    sent_to_number: str                             
    sent_from_number: str                          

    message: str

    direction: MESSAGE_DIRECTION = MESSAGE_DIRECTION.OUTBOUND.value
    status: MESSAGE_STATUS = MESSAGE_STATUS.QUEUED.value
    channel: MESSAGE_CHANNEL = MESSAGE_CHANNEL.TWILIO.value


    error_code: Optional[str] = None
    error_message: Optional[str] = None

    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None

    
    cost: Optional[float] = None                   
    cost_currency: Optional[str] = "USD"


    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    isDeleted: bool = False

    class Settings:
        name = "sms_history"
        indexes = [
            IndexModel([("conversation_id", ASCENDING)]),
            IndexModel([("sent_to_number", ASCENDING)]),
            IndexModel([("sent_from_number", ASCENDING)]),
            IndexModel([("prospect_id", ASCENDING)]),        
            IndexModel([("sent_by", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("provider_message_sid", ASCENDING)], unique=True, name="unique_sid"),
            IndexModel([("createdAt", DESCENDING)]),
        ]