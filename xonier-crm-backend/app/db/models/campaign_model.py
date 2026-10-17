from beanie import Document, Link, before_event, Save, Replace, Insert
from pydantic import Field, field_validator
from typing import Optional, List
from datetime import datetime, timezone
from pymongo import IndexModel
from app.core.enums import CAMPAIGN_DISTRIBUTION_MODE, CAMPAIGN_STATUS
from app.db.models.base_model import BaseDocument
from app.utils.custom_exception import AppException


class CampaignModel(BaseDocument):
    campaign_id: str

    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = Field(None, max_length=500)

    # Managers and agents are real company users
    managers: List[Link["UserModel"]] = Field(default_factory=list)
    agents: List[Link["UserModel"]] = Field(default_factory=list)

    distributionMode: CAMPAIGN_DISTRIBUTION_MODE = CAMPAIGN_DISTRIBUTION_MODE.ON_DEMAND

    # Stores conditional rules config for CONDITIONAL mode.
    # Format: {"rules": [{"field": "country", "operator": "equals", "value": "IN", "assignTo": "<userId>"}], "fallback": "<userId>"}
    # Empty for ON_DEMAND and EQUAL modes.
    distributionConfig: Optional[dict] = None

    status: CAMPAIGN_STATUS = CAMPAIGN_STATUS.DRAFT

    # Denormalized counts — updated via atomic $inc during import/assignment.
    # Avoids expensive COUNT queries on campaign_leads when listing campaigns.
    totalLeads: int = Field(default=0, ge=0)
    assignedLeads: int = Field(default=0, ge=0)
    completedLeads: int = Field(default=0, ge=0)

    createdBy: Link["UserModel"]
    updatedBy: Optional[Link["UserModel"]] = None
    deletedBy: Optional[Link["UserModel"]] = None
    deletedAt: Optional[datetime] = None

    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "campaigns"
        use_state_management = True
        indexes = [
            IndexModel(
                [("campaign_id", 1)],
                unique=True,
                name="unique_campaign_id"
            ),
            IndexModel(
                [("companyId", 1), ("status", 1)],
                name="idx_campaign_company_status"
            ),
            IndexModel(
                [("companyId", 1), ("createdAt", -1)],
                name="idx_campaign_company_created"
            ),
            IndexModel(
                [("companyId", 1), ("name", 1)],
                name="idx_campaign_company_name"
            ),
        ]

    @before_event(Save, Replace)
    def update_timestamp(self):
        self.updatedAt = datetime.now(timezone.utc)

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not isinstance(v, str):
            raise AppException(422, "Campaign name must be a string")
        v = v.strip()
        if not v:
            raise AppException(422, "Campaign name cannot be empty")
        if len(v) < 2:
            raise AppException(422, "Campaign name must be at least 2 characters")
        return v


from app.db.models.user_model import UserModel
CampaignModel.model_rebuild()
