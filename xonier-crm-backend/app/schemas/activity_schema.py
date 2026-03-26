from pydantic import BaseModel
from app.core.enums import ACTIVITY_ACTION, ACTIVITY_ENTITY_TYPE, CONTACT_STATUS
from typing import Optional
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
    