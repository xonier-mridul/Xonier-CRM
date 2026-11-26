from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

RecordId = Annotated[str, StringConstraints(to_lower=True, pattern=r"^[0-9a-fA-F]{24}$")]


class SalesTaskSelection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Literal["assign", "reassign"]
    userId: RecordId
    leadIds: list[RecordId] = Field(min_length=1, max_length=200)


class SalesTaskCreate(SalesTaskSelection):
    requestId: UUID
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
    instructions: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] = ""
    dueDate: date

    @field_validator("dueDate", mode="before")
    @classmethod
    def validate_calendar_date(cls, value):
        if not isinstance(value, str) or len(value) != 10:
            raise ValueError("Use a calendar date in YYYY-MM-DD format")
        return value
