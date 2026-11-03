from typing import Literal
from pydantic import BaseModel, Field, field_validator


class LeadStatusSchema(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    type: Literal["ongoing", "final"]
    color: str = Field(default="#0891b2", pattern=r"^#[0-9a-fA-F]{6}$")
    order: int = Field(default=0, ge=0, le=10000)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Status name is required")
        return value
