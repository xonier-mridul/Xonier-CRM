from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from app.core.enums import (
    CAMPAIGN_DISTRIBUTION_MODE,
    CAMPAIGN_STATUS,
    CAMPAIGN_LEAD_STATUS,
)
from app.utils.custom_exception import AppException


# ─── Campaign CRUD ────────────────────────────────────────────────────────────

class CampaignCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = Field(None, max_length=500)
    managers: List[str] = Field(default_factory=list)       # list of user ObjectId strings
    agents: List[str] = Field(default_factory=list)         # list of user ObjectId strings
    distributionMode: CAMPAIGN_DISTRIBUTION_MODE = CAMPAIGN_DISTRIBUTION_MODE.ON_DEMAND
    distributionConfig: Optional[Dict[str, Any]] = None
    status: CAMPAIGN_STATUS = CAMPAIGN_STATUS.DRAFT

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        if not isinstance(v, str):
            raise AppException(422, "Campaign name must be a string")
        v = v.strip()
        if not v:
            raise AppException(422, "Campaign name cannot be empty")
        return v

    @model_validator(mode="before")
    @classmethod
    def validate_conditional_config(cls, values):
        mode = values.get("distributionMode")
        config = values.get("distributionConfig")
        if mode == CAMPAIGN_DISTRIBUTION_MODE.CONDITIONAL and not config:
            raise AppException(
                422,
                "distributionConfig is required when distributionMode is 'conditional'"
            )
        return values


class CampaignUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    description: Optional[str] = Field(None, max_length=500)
    managers: Optional[List[str]] = None
    agents: Optional[List[str]] = None
    distributionMode: Optional[CAMPAIGN_DISTRIBUTION_MODE] = None
    distributionConfig: Optional[Dict[str, Any]] = None

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v):
        if v is None:
            return v
        v = str(v).strip()
        if not v:
            raise AppException(422, "Campaign name cannot be empty")
        return v


class CampaignStatusUpdateSchema(BaseModel):
    status: CAMPAIGN_STATUS

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v):
        try:
            return CAMPAIGN_STATUS(v)
        except ValueError:
            valid = [s.value for s in CAMPAIGN_STATUS]
            raise AppException(422, f"Invalid status. Valid values: {valid}")


# ─── Campaign Lead Operations ─────────────────────────────────────────────────

class CampaignLeadImportSchema(BaseModel):
    """
    Payload for importing leads into a campaign via CSV/XLSX upload.
    Reuses existing LeadsCreateSchema for individual lead validation.
    """
    leads: List[Dict[str, Any]]   # raw lead dicts — validated in service layer
    dataTag: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def normalise_tag(cls, values):
        tag = values.get("dataTag")
        if tag:
            values["dataTag"] = str(tag).strip().lower()
        return values

    @field_validator("leads", mode="before")
    @classmethod
    def leads_not_empty(cls, v):
        if not v:
            raise AppException(400, "leads array cannot be empty")
        return v


class CampaignLeadStatusUpdateSchema(BaseModel):
    campaignStatus: CAMPAIGN_LEAD_STATUS

    @field_validator("campaignStatus", mode="before")
    @classmethod
    def validate_campaign_status(cls, v):
        try:
            return CAMPAIGN_LEAD_STATUS(v)
        except ValueError:
            valid = [s.value for s in CAMPAIGN_LEAD_STATUS]
            raise AppException(422, f"Invalid campaignStatus. Valid values: {valid}")


class CampaignLeadAssignSchema(BaseModel):
    agentId: str = Field(..., min_length=1)

    @field_validator("agentId", mode="before")
    @classmethod
    def strip_agent_id(cls, v: str) -> str:
        v = str(v).strip()
        if not v:
            raise AppException(422, "agentId cannot be empty")
        return v
