from beanie import Document, Link
from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator
from typing import Optional, Literal, List
from pymongo import IndexModel
from app.core.enums import PLAN_STATUS, PLAN_VISIBILITY, CURRENCY, DISCOUNT_TYPE
from datetime import datetime, timezone
from app.db.models.user_model import UserModel
from app.db.models.feature_model import FeatureModel
from app.utils.custom_exception import AppException


class Price(BaseModel):
    monthlyPrice: float
    yearlyPrice: float

    @field_validator("monthlyPrice", mode="before")
    @classmethod
    def validate_monthly_price(cls, v):
        if v is not None and v < 0:
            raise AppException(422, "Monthly Price should be greater then 0")
        
        return v
    
    @field_validator("yearlyPrice", mode="before")
    @classmethod
    def validate_yearly_price(cls, v):
        if v is not None and v < 0:
            raise AppException(422, "Yearly price should be greater then 0")
        
        return v


class PlanFeature(BaseModel):
    feature: Link[FeatureModel]
    is_unlimited:bool =  True
    limit: Optional[int] = None
    limit_override: Optional[int] = None
    is_enabled: bool = True

    @field_validator("limit", mode="before")
    @classmethod
    def validate_limit(cls, v):
        if v is not None and int(v) < 0:
            raise AppException(422, "Limit should be grater then 0")
        
        return v
    
    @field_validator("limit_override", mode="before")
    @classmethod
    def validate_limit_override(cls, v):
        if v is not None and int(v) < 0:
            raise AppException(422, "Limit override should be grater then 0")
        
        return v
    
    @model_validator(mode="before")
    @classmethod
    def validate_limitation(cls, values):

        is_unlimited = values.get("is_unlimited")
        limit = values.get("limit")

        if is_unlimited and limit is not None and int(limit) > 0:
            raise AppException(
                422,
                "When plan is unlimited then limit must be 0 or null"
            )

        return values



class PlanModel(Document):
    name: str = Field(..., min_length=2, max_length=100)
    description: str
    price: Price
    discount: Optional[float] = None
    discountType: DISCOUNT_TYPE = DISCOUNT_TYPE.PERCENTAGE.value
    currency: CURRENCY = CURRENCY.USD.value
    discountApply: Optional[Literal["monthly", "yearly", "both"]] = None
    discountTill: Optional[datetime] = None
    features: Optional[List[PlanFeature]] = Field(..., default_factory=list)
    status: PLAN_STATUS = PLAN_STATUS.ACTIVE.value
    visibility: PLAN_VISIBILITY = PLAN_VISIBILITY.PUBLIC.value
    trial_days: int = 0
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    createdBy: Link[UserModel]
    
    updatedAt: Optional[datetime] = None
    deletedBy: Optional[Link[UserModel]] = None
    deletedAt: Optional[datetime] = None

    class Settings:
        name = "plans"
        indexes = [IndexModel([("name", 1)], unique=True, name="unique_plan_name")]

    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, v):
        if len(v) < 2 and len(v)> 100:
            raise AppException(422, "Name should be greater then 2 and less then 100 words") 
        
        return v
