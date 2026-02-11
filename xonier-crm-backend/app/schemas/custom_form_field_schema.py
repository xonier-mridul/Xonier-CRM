from pydantic import BaseModel, Field
from typing import Literal, Optional, List
from app.core.enums import FORM_FIELD_MODULES
from enum import Enum

class SelectOption(BaseModel):
    label: str
    value: str

class CreateCustomFormFieldSchema(BaseModel):
    name: str = Field(..., description="Human readable label")

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
    module: FORM_FIELD_MODULES

    options: Optional[List[SelectOption]] = None

    placeholder: Optional[str] = None

    order: Optional[int] = 0
