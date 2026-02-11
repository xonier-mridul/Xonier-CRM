from beanie import Document, Link
from pydantic import Field, model_validator
from typing import Optional, Literal
from datetime import datetime, timezone
from app.core.enums import EVENT_TYPE
from app.db.models.user_model import UserModel
from app.db.models.deal_model import DealModel
from pymongo import IndexModel


class CalenderEventModel(Document):
    title: str
    description: Optional[str] = None
    eventType: EVENT_TYPE
    start: datetime
    end: Optional[datetime] = None
    isAllDay: bool = False
    meetingLink: Optional[str] = None
    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    priority: Optional[Literal["low", "medium", "high"]] = "low"
    createdAt: datetime = Field(default_factory=lambda:datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda:datetime.now(timezone.utc))


    class Settings:
        name = "calender_events"
        indexes = [
            IndexModel(
            [("title", 1)],
            name="unique_title"
        )]

    
    
