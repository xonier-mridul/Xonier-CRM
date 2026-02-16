from beanie import Document, Link, before_event, Insert, Save
from pydantic import Field, BaseModel, field_validator, ValidationInfo
from typing import Optional, List
from datetime import datetime, date, timezone, timedelta
from app.db.models.deal_model import DealModel
from app.db.models.quotation_model import QuotationModel
from app.core.enums import INVOICE_STATUS
from app.db.models.user_model import UserModel
from pymongo import IndexModel
from app.core.crypto import Encryption
from app.core.enums import PROJECT_TYPES

encryption = Encryption()



class InvoiceModel(Document):

    invoiceId: str                   
    deal: Link[DealModel]
    quotation: Link[QuotationModel]
    customerName: str
    customerEmail: str
    customerPhone: Optional[str] = None
    companyName: Optional[str] = None
    billingAddress: Optional[str] = None
    subTotal: float = Field(..., gt=0)
    total: float = Field(0, ge=0)

    issueDate: Optional[date] = None
    dueDate: date = Field(
    default_factory=lambda: (datetime.now(timezone.utc) + timedelta(days=30)).date()
)

    status: INVOICE_STATUS = INVOICE_STATUS.DRAFT

    notes: Optional[str] = None

    paidAmount: float = Field(0, ge=0)
    lastPaymentDate: Optional[datetime] = None

    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None

    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None

    class Settings:
        name = "invoices"
        indexes = [
            IndexModel([("invoiceId", 1)], unique=True, name="unique_invoiceId") ,
            IndexModel([("status", 1)]),
            IndexModel([("dueDate", 1)]) ,
            IndexModel([("createdAt", 1)]) 
        ]


    # @field_validator('dueDate', mode="before")
    # @classmethod
    # def validate_due_date(cls, v, info: ValidationInfo):
    #     issueDate = info.data.get("issueDate")
    #     if issueDate and v < issueDate:
    #         raise ValueError("Due date must be greater the issue date")
        
    #     return v


    @before_event(Insert, Save)
    def update_stamp(self):
        self.updatedAt = datetime.now(timezone.utc)
