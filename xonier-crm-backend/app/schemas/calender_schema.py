from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal
from datetime import datetime
from app.core.enums import EVENT_TYPE


class CreateCalendarEventSchema(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = None

    eventType: EVENT_TYPE

    start: datetime
    end: Optional[datetime] = None

    isAllDay: bool = False

    priority: Optional[Literal["low", "medium", "high"]] = "low"


    @model_validator(mode="after")
    def validate_event_dates(self):
        if self.end and self.end <= self.start:
            raise ValueError("end must be greater than start")

        return self
