from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from app.utils.custom_exception import AppException


class PaymentItemSchema(BaseModel):
    name: str
    quantity: int = 1
    unit_amount: float
    description: Optional[str] = None


class CreateOrderSchema(BaseModel):
    plan_id: str = Field(..., description="MongoDB ObjectId of the plan")
    billing_cycle: str = Field(..., description="monthly or yearly")

    @field_validator("billing_cycle", mode="before")
    @classmethod
    def validate_billing_cycle(cls, v):
        if v not in ["monthly", "yearly"]:
            raise AppException(422, "Billing cycle must be 'monthly' or 'yearly'")
        return v

    @field_validator("plan_id", mode="before")
    @classmethod
    def validate_plan_id(cls, v):
        if not v or not v.strip():
            raise AppException(422, "Plan ID is required")
        return v


class CapturePaymentSchema(BaseModel):
    payer_id: str = Field(..., description="PayPal PayerID from redirect URL")

    @field_validator("payer_id", mode="before")
    @classmethod
    def validate_payer_id(cls, v):
        if not v or not v.strip():
            raise AppException(422, "Payer ID is required")
        return v


class RefundPaymentSchema(BaseModel):
    amount: Optional[float] = Field(
        None,
        description="Refund amount, if None full refund will be processed"
    )
    reason: str = Field(..., description="Reason for refund")

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, v):
        if v is not None and float(v) <= 0:
            raise AppException(422, "Refund amount must be greater than 0")
        return v

    @field_validator("reason", mode="before")
    @classmethod
    def validate_reason(cls, v):
        if not v or not v.strip():
            raise AppException(422, "Refund reason is required")
        return v