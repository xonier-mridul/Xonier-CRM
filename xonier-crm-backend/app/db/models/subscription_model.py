from beanie import Document, Link
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal, List
from pymongo import IndexModel
from app.core.enums import PLAN_STATUS, SUBSCRIPTION_STATUS
from datetime import datetime, timezone
from app.db.models.user_model import UserModel
from app.db.models.plan_model import PlanModel


class SubscriptionModel(Document):
    subscriptionId: str
    planId: Link[PlanModel] 
    companyId: Link["CompanyModel"]
    startSubscriptionDate: datetime = Field(...)
    endSubscriptionDate: Optional[datetime] = None
    status: SUBSCRIPTION_STATUS = SUBSCRIPTION_STATUS.PAUSED.value
    trialStartDate: Optional[datetime] = None
    trialEndDate: Optional[datetime] = None
    createdBy: Link[UserModel]
    deletedBy: Optional[Link[UserModel]] = None
    updatedAt: Optional[datetime] = None
    updatedBy: Optional[Link[UserModel]] = None
    deletedAt: Optional[datetime] = None

    class Settings:
        name = "subscriptions"
        indexes = [
            IndexModel(
                [("subscriptionId", 1)],
                  unique=True, 
                  name="unique_subscription_id")
        ]

from app.db.models.company_model import CompanyModel
SubscriptionModel.model_rebuild()
