
from app.db.models.user_model import UserModel
from app.db.models.form_field_model import CustomFieldModel
from beanie import Document, Link, before_event, Insert, Save, Replace
from pydantic import Field
from typing import List, Union
from datetime import datetime, timezone
from pymongo import IndexModel
from app.core.enums import FORM_FIELD_MODULES
from app.db.models.custom_form_field_model import UserCustomFieldModel


class UserFormModel(Document):
    userId: Link[UserModel] 
    selectedFormFields: List[ Union[ Link[CustomFieldModel], Link[UserCustomFieldModel]]]
    
    module: FORM_FIELD_MODULES
    status: bool = True
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name="user_form"
        indexes= [IndexModel([("userId", 1)], unique = True, name="user_id")]

    @before_event(Insert, Replace, Save)
    async def update_time_stamp(self):
        self.updatedAt = datetime.now(timezone.utc)