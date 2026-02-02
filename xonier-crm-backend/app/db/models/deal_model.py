from beanie import Document, Link, before_event, Save, Replace
from pymongo import IndexModel
from typing import Optional
from pydantic import Field, field_validator
from app.db.models.lead_model import LeadsModel
from app.db.models.user_model import UserModel
from datetime import datetime, timezone
from app.core.enums import DEAL_PIPELINE, DEAL_STAGES, DEAL_TYPE, FORECAST_CATEGORY

class DealModel(Document):
    deal_id : str
    lead_id : Link[LeadsModel]
    dealName : str 
    dealPipeline: DEAL_PIPELINE
    dealStage: DEAL_STAGES
    dealOwner: Optional[str]
    dealType: DEAL_TYPE
    createDate: datetime
    closeDate: Optional[datetime] = None
    amount: int = Field(..., gt=0)
    dealCollaborator: Optional[str] = None
    dealDescription: Optional[str] = None
    dealProbability: Optional[int] = Field(None,gt=0, lt=100) 
    forecastProbability: Optional[int] = Field(None, gt=0, lt=100)
    nextStep: Optional[str] = None
    forecastCategory: Optional[FORECAST_CATEGORY] = None
    closedWonReason: Optional[str] = None
    closedLostReason: Optional[str] = None
    originalTrafficSource: Optional[str] = None
    inQuotation: bool = False
    createdBy : Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None

    

    class Settings:
        name = "deals"
        indexes = [
            IndexModel(
                [("deal_id", 1)],
                unique=True,
                name="unique_deal_id"
            ),
            IndexModel(
                [("lead_id.$id", 1)],
                unique=True,
                name="idx_lead_id"
            )
        ]

    @before_event(Save, Replace)
    def update_timestamp_update(self):
        self.updatedAt = datetime.now(timezone.utc)

    @field_validator("dealProbability", mode="before")
    @classmethod
    def define_percentage(cls, v):
        if v is None:
           return v
        if v < 0 or v > 100:
           raise ValueError("Deal probability must be between 0 and 100")
        return v
    
    @field_validator("forecastProbability", mode="before")
    @classmethod
    def define_forecast_percentage(cls, v):
        if v is None:
            return v
        if v<0 or v>100:
            raise ValueError("Forecast Probability should be between 0 and 100")
        return v
    
    @field_validator("amount", mode="before")
    @classmethod
    def manage_amount_field(cls, v):
        if v is None:
            raise ValueError("Amount field is required")
            
        if v<0:
            raise ValueError("Amount must be greater then 0")
        
        return v 
    
    

    @field_validator("closeDate", mode="before")
    @classmethod
    def validate_close_date(cls, v, info):
        create_date = info.data.get("createDate")
        if v and create_date and v < create_date:
            raise ValueError("Close date cannot be before create date")
        return v