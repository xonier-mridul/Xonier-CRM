
from pydantic import BaseModel, Field, field_validator
from app.core.enums import DEAL_PIPELINE, DEAL_STAGES, DEAL_TYPE, FORECAST_CATEGORY, DEAL_STATUS
from typing import Optional
from datetime import datetime
from app.utils.custom_exception import AppException

class DealSchema(BaseModel):
    lead_id : str
    dealName : str 
    # dealPipeline: DEAL_PIPELINE
    dealStage: DEAL_STAGES
    dealOwner: Optional[str]
    dealType: DEAL_TYPE
    createDate: datetime
    closeDate: Optional[datetime] = None
    amount: int = Field(gt=0)
    dealCollaborator: Optional[str] = None
    dealDescription: Optional[str] = None
    dealProbability: Optional[int] = Field(None,gt=0, lt=100) 
    forecastProbability: Optional[int] = Field(None, gt=0, lt=100)
    nextStep: Optional[str] = None
    forecastCategory: Optional[FORECAST_CATEGORY] = None
    closedWonReason: Optional[str] = None
    closedLostReason: Optional[str] = None
    originalTrafficSource: Optional[str] = None


    @field_validator("dealName", mode="before")
    @classmethod
    def validate_deal_name(cls, value):
        if not isinstance(value, str):
            raise AppException(422, "Deal name must be a string")

        value = value.strip()

        if not value:
            raise AppException(422, "Deal name cannot be empty")

        if len(value) < 4:
            raise AppException(422 ,"Deal name must be at least 4 characters long")

        return value


    
    @field_validator("dealProbability", "forecastProbability", mode="before")
    @classmethod
    def validate_percentage(cls, v):
        if v is None:
            return v
        if not 0 <= v <= 100:
            raise AppException(422, "Probabilities must be between 0 and 100")
        return v
    
class DealUpdateSchema(BaseModel):
    dealName : str 
    # dealPipeline: DEAL_PIPELINE
    dealStage: DEAL_STAGES
    dealOwner: Optional[str]
    dealType: DEAL_TYPE
    createDate: datetime
    closeDate: Optional[datetime] = None
    amount: int 
    dealCollaborator: Optional[str] = None
    dealDescription: Optional[str] = None
    dealProbability: Optional[int] = Field(None,gt=0, lt=100) 
    forecastProbability: Optional[int] = Field(None, gt=0, lt=100)
    nextStep: Optional[str] = None
    forecastCategory: Optional[FORECAST_CATEGORY] = None
    closedWonReason: Optional[str] = None
    closedLostReason: Optional[str] = None
    originalTrafficSource: Optional[str] = None


    @field_validator("dealName", mode="before")
    @classmethod
    def validate_deal_name(cls, value):
        if not isinstance(value, str):
            raise AppException(422, "Deal name must be a string")

        value = value.strip()

        if not value:
            raise AppException(422, "Deal name cannot be empty")

        if len(value) < 4:
            raise AppException(422, "Deal name must be at least 4 characters long")

        return value
        

    @field_validator("dealProbability", "forecastProbability", mode="before")
    @classmethod
    def validate_percentage(cls, v):
        if v is None:
            return v
        if not 0 <= v <= 100:
            raise AppException(422, "Probabilities must be between 0 and 100")
        return v
    
    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, v):
        if v is None:
            return AppException(422, "Amount must required")
        
        if v < 0:
            raise AppException(422, "Amount must be grater then 0")
        
        return v
    
class UpdateDealStatusSchema(BaseModel):
    status: DEAL_STATUS
        
       


