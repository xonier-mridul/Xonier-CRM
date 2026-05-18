

from beanie import Document, Link, before_event, Insert, Save
from pydantic import Field, BaseModel
from typing import Optional, List
from datetime import datetime, date, timezone, timedelta
from pymongo import IndexModel
from app.db.models.deal_model import DealModel
from app.db.models.quotation_model import QuotationModel, QuotationLineItem
from app.db.models.user_model import UserModel
from app.core.enums import INVOICE_STATUS
from app.core.crypto import Encryption
from app.db.models.base_model import BaseDocument

encryption = Encryption()


class InvoiceModel(BaseDocument):
    invoiceId: str
    sourceQuoteId: Optional[str] = None

    deal: Link[DealModel]
    quotation: Link[QuotationModel]

    customerName: str
    customerEmail: str
    customerEmailHash: Optional[str] = None
    customerPhone: Optional[str] = None
    customerPhoneHash: Optional[str] = None
    companyName: Optional[str] = None
    companyAddress: Optional[str] = None
    companyWebsite: Optional[str] = None
    billingAddress: Optional[str] = None

    lineItems: Optional[List[QuotationLineItem]] = Field(default_factory=list)

    currency: str = "USD"
    subTotal: float = Field(..., gt=0)
    discountAmount: Optional[float] = Field(None, ge=0)
    discountPercent: Optional[float] = Field(None, ge=0, le=100)
    taxAmount: Optional[float] = Field(None, ge=0)
    taxPercent: Optional[float] = Field(None, ge=0, le=100)
    shippingAmount: Optional[float] = Field(None, ge=0)
    total: float = Field(..., ge=0)

    issueDate: Optional[date] = None
    dueDate: date = Field(
        default_factory=lambda: (datetime.now(timezone.utc) + timedelta(days=30)).date()
    )

    status: INVOICE_STATUS = INVOICE_STATUS.ISSUED

    paymentTerms: Optional[str] = None
    notes: Optional[str] = None
    termsAndConditions: Optional[str] = None
    internalNotes: Optional[str] = None

    paidAmount: float = Field(0, ge=0)
    lastPaymentDate: Optional[datetime] = None

    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    deletedAt: Optional[datetime] = None

    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    

    class Settings:
        name = "invoices"
        indexes = [
            IndexModel([("invoiceId", 1)], unique=True, name="unique_invoiceId"),
            IndexModel([("sourceQuoteId", 1)], name="source_quote_idx"),
            IndexModel([("createdAt", -1)], name="created_at_idx"),
            IndexModel([("deal", 1)], name="deal_idx"),
            IndexModel([("quotation", 1)], name="quotation_idx"),
        ]

    @before_event(Insert, Save)
    def update_stamp(self):
        self.updatedAt = datetime.now(timezone.utc)
        


