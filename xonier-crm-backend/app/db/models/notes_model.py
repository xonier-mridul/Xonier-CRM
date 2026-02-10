from beanie import Document, Link
from typing import Optional, List
from datetime import datetime, timezone
from app.db.models.user_model import UserModel
from app.core.enums import NOTE_VISIBILITY, NOTE_STATUS, NOTES_ENTITIES
from pydantic import Field, model_validator, ValidationInfo


class NoteModel(Document):
    title: str = Field(..., min_length=3, max_length=35)
    content: str  
    entityType: NOTES_ENTITIES 
    # entityId: Optional[str] = None  

    visibility: NOTE_VISIBILITY = NOTE_VISIBILITY.PUBLIC
    status: NOTE_STATUS = NOTE_STATUS.ACTIVE

    isPinned: bool = False
    byAdmin:bool = False


    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None

    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None

    class Settings:
        name = "notes"


    # @model_validator(mode="after")

    # def validate_entity_id(self):
    #     if self.entityType != NOTES_ENTITIES.GENERAL.value and not self.entityId:
    #         raise ValueError(
    #             "entityId is required when entityType is not GENERAL"
    #         )
    #     return self


    

    