
from typing import Optional, List
from datetime import datetime, timezone
from app.db.models.user_model import UserModel
from app.core.enums import NOTE_VISIBILITY, NOTE_STATUS, NOTES_ENTITIES
from pydantic import Field, model_validator, BaseModel


class NoteCreateSchema(BaseModel):
    title: str = Field(..., min_length=3, max_length=35)
    content: str  
    entityType: NOTES_ENTITIES 
    entityId: Optional[str] = None  

    visibility: NOTE_VISIBILITY = NOTE_VISIBILITY.PUBLIC

    isPinned: bool = False




    # @model_validator(mode="after")

    # def validate_entity_id(self):
    #     if self.entityType != NOTES_ENTITIES.GENERAL.value and not self.entityId:
    #         raise ValueError(
    #             "entityId is required when entityType is not GENERAL"
    #         )
    #     return self


    

    