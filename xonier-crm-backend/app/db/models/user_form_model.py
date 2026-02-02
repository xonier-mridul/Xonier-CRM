
from app.db.models.user_model import UserModel
from app.db.models.form_field_model import CustomFieldModel
from beanie import Document, Link, before_event, Insert, Save, Replace
from pydantic import Field
from typing import List
from datetime import datetime, timezone
from pymongo import IndexModel
from app.core.enums import FORM_FIELD_MODULES


class UserFormModel(Document):
    userId: Link[UserModel] 
    selectedFormFields: List[Link[CustomFieldModel]]
    module: FORM_FIELD_MODULES
    status: bool = True
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name="user_form"
        # use_state_management = True
        indexes= [IndexModel([("userId", 1)], unique = True, name="user_id")]

    @before_event(Insert, Replace, Save)
    async def update_time_stamp(self):
        self.updatedAt = datetime.now(timezone.utc)