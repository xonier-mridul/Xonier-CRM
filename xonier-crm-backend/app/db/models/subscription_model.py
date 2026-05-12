# app/db/models/subscription_model.py
from beanie import Document, Link
from pydantic import Field
from typing import Optional
from pymongo import IndexModel
from app.core.enums import SUBSCRIPTION_STATUS, BILLING_CYCLE, DISCOUNT_TYPE
from datetime import datetime, timezone
from app.db.models.user_model import UserModel
from app.db.models.plan_model import PlanModel
import uuid


class SubscriptionModel(Document):
    subscriptionId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    planId: Link[PlanModel]
    companyId: Link["CompanyModel"]
    billingCycle: BILLING_CYCLE = BILLING_CYCLE.MONTHLY
    basePrice: float
    discountAmount: float = 0.0
    finalPrice: float
    status: SUBSCRIPTION_STATUS = SUBSCRIPTION_STATUS.PAUSED
    startSubscriptionDate: datetime
    endSubscriptionDate: Optional[datetime] = None
    trialStartDate: Optional[datetime] = None
    trialEndDate: Optional[datetime] = None
    cancelledAt: Optional[datetime] = None
    cancelReason: Optional[str] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    createdBy: Link[UserModel]
    updatedAt: Optional[datetime] = None
    updatedBy: Optional[Link[UserModel]] = None
    deletedAt: Optional[datetime] = None
    deletedBy: Optional[Link[UserModel]] = None

    class Settings:
        name = "subscriptions"
        indexes = [
            IndexModel(
                [("subscriptionId", 1)],
                unique=True,
                name="unique_subscription_id",
            ),
            IndexModel(
                [("companyId", 1), ("status", 1)],
                name="company_subscription_status",
            ),
        ]


from app.db.models.company_model import CompanyModel
SubscriptionModel.model_rebuild()