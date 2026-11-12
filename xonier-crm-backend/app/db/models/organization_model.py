from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from pydantic import Field
from pymongo import IndexModel

from app.db.models.base_model import BaseDocument


class OrganizationModel(BaseDocument):
    name: str = Field(min_length=1, max_length=200)
    normalizedName: str
    cnpj: Optional[str] = None
    industry: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    createdById: PydanticObjectId
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "organizations"
        indexes = [IndexModel([("companyId", 1), ("normalizedName", 1)], unique=True, name="unique_organization_name")]
