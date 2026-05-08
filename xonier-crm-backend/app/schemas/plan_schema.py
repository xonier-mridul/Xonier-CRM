from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal, List
from app.utils.custom_exception import AppException
from app.core.enums import PLAN_STATUS, PLAN_VISIBILITY, CURRENCY, DISCOUNT_TYPE
from datetime import datetime, timezone
from app.db.models.plan_model import Price, PlanFeature



class PlanCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str
    price: Price
    currency: CURRENCY = CURRENCY.USD.value
    discount: Optional[float] = None
    discountType: DISCOUNT_TYPE = DISCOUNT_TYPE.PERCENTAGE.value
    discountApply: Optional[Literal["monthly", "yearly", "both"]] = None
    discountTill: Optional[datetime] = None
    features: Optional[List[PlanFeature]] = Field(..., default_factory=list)
    status: PLAN_STATUS = PLAN_STATUS.ACTIVE.value
    visibility: PLAN_VISIBILITY = PLAN_VISIBILITY.PUBLIC.value
    trial_days: int = 0

    @field_validator("discount", mode="before")
    @classmethod
    def validate_discount(cls, v):
        if v is not None and v < 0:
            raise AppException(422, "Discount must be greater then 0")
        
    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, v):
        if len(v) < 2 and len(v)> 100:
            raise AppException(422, "Name should be greater then 2 and less then 100 words") 
        
        return v
        



class PlanUpdateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str
    price: Price
    currency: CURRENCY = CURRENCY.USD.value
    discount: Optional[float] = None
    discountType: DISCOUNT_TYPE = DISCOUNT_TYPE.PERCENTAGE.value
    discountApply: Optional[Literal["monthly", "yearly", "both"]] = None
    discountTill: Optional[datetime] = None
    features: Optional[List[PlanFeature]] = Field(..., default_factory=list)
    status: PLAN_STATUS = PLAN_STATUS.ACTIVE.value
    visibility: PLAN_VISIBILITY = PLAN_VISIBILITY.PUBLIC.value
    trial_days: int = 0

    @field_validator("discount", mode="before")
    @classmethod
    def validate_discount(cls, v):
        if v is not None and v < 0:
            raise AppException(422, "Discount must be greater then 0")
        
    @field_validator("name", mode="before")
    @classmethod
    def validate_name(cls, v):
        if len(v) < 2 and len(v)> 100:
            raise AppException(422, "Name should be greater then 2 and less then 100 words") 
        
        return v
        



