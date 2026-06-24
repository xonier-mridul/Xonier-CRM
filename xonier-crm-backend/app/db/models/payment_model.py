from __future__ import annotations
from beanie import Document, Link
from pydantic import Field
from typing import Optional, TYPE_CHECKING
from pymongo import IndexModel
from app.core.enums import PAYMENT_STATUS, PAYMENT_METHOD
from datetime import datetime, timezone
from app.db.models.plan_model import PlanModel
from app.db.models.subscription_model import SubscriptionModel
import uuid

if TYPE_CHECKING:
    from app.db.models.user_model import UserModel
    from app.db.models.company_model import CompanyModel


class PaymentModel(Document):
    paymentId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # PayPal specific fields
    paypalOrderId: Optional[str] = None
    paypalTransactionId: Optional[str] = None
    paypalPayerId: Optional[str] = None
    
    # Relations
    planId: Link[PlanModel]
    subscriptionId: Optional[Link[SubscriptionModel]] = None
    companyId: Optional[Link["CompanyModel"]] = None
    createdBy: Optional[Link["UserModel"]] = None
    
    # Payment details
    amount: float
    currency: str = "USD"
    billingCycle: str = "monthly"  # monthly | yearly
    
    # Discount
    discountAmount: float = 0.0
    finalAmount: float
    
    # Status
    status: PAYMENT_STATUS = PAYMENT_STATUS.PENDING
    
    # Refund
    refundId: Optional[str] = None
    refundAmount: Optional[float] = None
    refundReason: Optional[str] = None
    refundedAt: Optional[datetime] = None
    
    # Failure
    failureReason: Optional[str] = None
    
    # Timestamps
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: Optional[datetime] = None
    deletedAt: Optional[datetime] = None
    deletedBy: Optional[Link["UserModel"]] = None

    class Settings:
        name = "payments"
        indexes = [
            IndexModel(
                [("paymentId", 1)],
                unique=True,
                name="unique_payment_id"
            ),
            IndexModel(
                [("paypalOrderId", 1)],
                name="paypal_order_id_index"
            ),
            IndexModel(
                [("companyId.$id", 1), ("status", 1)],
                name="company_payment_status"
            ),
        ]


from app.db.models.user_model import UserModel
from app.db.models.company_model import CompanyModel

PaymentModel.model_rebuild()