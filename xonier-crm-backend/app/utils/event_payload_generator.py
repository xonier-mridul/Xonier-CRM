from pydantic import BaseModel
from typing import Optional, Literal, Dict, Any
from beanie import PydanticObjectId
from app.core.enums import EVENT_TYPE
from datetime import datetime



class EventPayloadGenerator(BaseModel):
        title: str
        description: Optional[str] = None
        eventType: EVENT_TYPE = EVENT_TYPE.NOTE.value
        start: datetime
        end: Optional[datetime] = None
        isAllDay: bool = False
        meetingLink: Optional[str] = None
        createdBy: PydanticObjectId
        updatedBy: Optional[PydanticObjectId] = None
        priority: Optional[Literal["low", "medium", "high"]] = "low"
        entityId: Optional[PydanticObjectId] = None

        model_config = {
            "use_enum_values": True,   
            "arbitrary_types_allowed": True,
        }

        def to_json(self) -> Dict[str, Any]:
            return self.model_dump(mode="json", exclude_none=True)
