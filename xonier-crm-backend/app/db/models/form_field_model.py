from beanie import Document

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone
from pymongo import IndexModel
from app.core.enums import FORM_FIELD_MODULES


class SelectOption(BaseModel):
    label: str
    value: str


class CustomFieldModel(Document):

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
    module: List[FORM_FIELD_MODULES]

    options: Optional[List[SelectOption]] = None

    placeholder: Optional[str] = None

    order: Optional[int] = 0

    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "custom_fields"
        use_state_management = True
        indexes = [
            IndexModel(
                [("key", 1)],
                unique=True,
                name="unique_key"
            )
        ]
