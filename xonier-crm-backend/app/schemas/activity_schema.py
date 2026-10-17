from pydantic import BaseModel
from app.core.enums import ACTIVITY_ACTION, ACTIVITY_ENTITY_TYPE, CONTACT_STATUS
from typing import Optional, Literal
from beanie import PydanticObjectId

class CallActivitySchema(BaseModel):
    number: str
    entityType: ACTIVITY_ENTITY_TYPE
    entityId: Optional[PydanticObjectId] = None
    action: ACTIVITY_ACTION


class CallActivityUpdateSchema(BaseModel):
    callDuration: Optional[str] = None
    feedback: Optional[str] = None
    connectStatus: Optional[CONTACT_STATUS] = None
    # Mobile sends one of the preset options OR a custom ISO datetime string
    # Preset options: "1h" | "6h" | "1d"
    # Custom: any valid ISO-8601 datetime string e.g. "2026-10-16T10:30:00"
    followUpIn: Optional[str] = None