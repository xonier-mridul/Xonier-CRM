from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal, List
from datetime import datetime
from app.core.enums import EVENT_TYPE
from app.utils.custom_exception import AppException


class CreateCalendarEventSchema(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = None

    eventType: EVENT_TYPE
    meetingLink: Optional[str] = None
    start: datetime
    end: Optional[datetime] = None

    isAllDay: bool = False

    priority: Optional[Literal["low", "medium", "high"]] = None


    @model_validator(mode="after")
    def validate_event_dates(self):
        if self.end and self.end <= self.start:
            raise AppException(422, "end must be greater than start")

        return self
    



class CreateBulkCalenderEvent(BaseModel):
    events: List[CreateCalendarEventSchema] 


    @model_validator(mode="before")
   
    def validate_bulk_event(self):
        
        if not self["events"] or self["events"] == []:
            raise AppException(422, "Events field not be empty")
        
        return self
    

