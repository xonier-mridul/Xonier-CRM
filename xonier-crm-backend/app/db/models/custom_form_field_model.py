from beanie import Document, Link

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone
from pymongo import IndexModel
from app.core.enums import FORM_FIELD_MODULES
from app.db.models.user_model import UserModel
from enum import Enum



class SelectOption(BaseModel):
    label: str
    value: str


class UserCustomFieldModel(Document):
    userId: Link[UserModel]
    isCustomFiled: bool = True
    name: str = Field(..., description="Human readable label")
    key: str = Field(..., unique=True, description="Unique field key")

    type: Literal[
        "text",
        "number",
        "email",
        "phone",
        "select",
        "textarea",
        "date",
        "checkbox"
    ]

    required: bool = False
    isActive: bool = True
    module: FORM_FIELD_MODULES

    options: Optional[List[SelectOption]] = None

    placeholder: Optional[str] = None

    order: Optional[int] = 0
    createdBy: Link[UserModel] 
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "user_custom_fields"
        use_state_management = True
        indexes = [
            IndexModel(
                [("key", 1)],
                unique=True,
                name="unique_key"
            )
        ]
