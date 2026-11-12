from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from pydantic import Field
from pymongo import IndexModel

from app.db.models.base_model import BaseDocument


class PersonModel(BaseDocument):
    fullName: str = Field(min_length=1, max_length=200)
    organizationId: Optional[PydanticObjectId] = None
    title: Optional[str] = None
    hashedEmail: Optional[str] = None
    hashedPhone: Optional[str] = None
    linkedin: Optional[str] = None
    createdById: PydanticObjectId
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "people"
        indexes = [
            IndexModel([("companyId", 1), ("hashedEmail", 1)], name="person_email"),
            IndexModel([("companyId", 1), ("hashedPhone", 1)], name="person_phone"),
        ]
