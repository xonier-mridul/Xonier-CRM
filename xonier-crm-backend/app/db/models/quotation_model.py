from beanie import Document, Link, before_event, Insert, Replace, Save
from pydantic import Field, model_validator, field_validator, BaseModel
from typing import Optional, List, Any
from datetime import datetime, timezone, date, timedelta
from pymongo import IndexModel
from app.core.enums import QuotationStatus, QuotationPaymentStatus, QuotationCurrency
from app.db.models.deal_model import DealModel
from app.core.crypto import Encryption
from app.core.security import hash_value
from app.db.models.user_model import UserModel
from beanie import PydanticObjectId
from app.db.models.base_model import BaseDocument
from app.utils.custom_exception import AppException

encryption = Encryption()


class QuotationLineItem(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    quantity: float = Field(..., gt=0)
    unit: Optional[str] = Field(None, max_length=50)
    unitPrice: float = Field(..., ge=0)
    discount: Optional[float] = Field(None, ge=0, le=100)
    taxRate: Optional[float] = Field(None, ge=0, le=100)
    total: float = Field(..., ge=0)

    @model_validator(mode="after")
    def validate_total(self):
        expected = self.quantity * self.unitPrice
        if self.discount:
            expected = expected * (1 - self.discount / 100)
        if abs(self.total - expected) > 0.01:
            self.total = round(expected, 2)
        return self


class QuotationNote(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    createdBy: Optional[PydanticObjectId] = None


class QuotationModel(BaseDocument):
    quoteId: str
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)

    deal: Link[DealModel]

    customerName: str = Field(..., min_length=1, max_length=200)
    customerEmail: str
    customerEmailHash: Optional[str] = None
    customerPhone: Optional[str] = None
    customerPhoneHash: Optional[str] = None
    companyName: Optional[str] = Field(None, max_length=200)
    companyAddress: Optional[str] = Field(None, max_length=500)
    companyWebsite: Optional[str] = None

    lineItems: Optional[List[QuotationLineItem]] = Field(default_factory=list)

    currency: QuotationCurrency = QuotationCurrency.USD
    subTotal: float = Field(..., ge=0)
    discountAmount: Optional[float] = Field(None, ge=0)
    discountPercent: Optional[float] = Field(None, ge=0, le=100)
    taxAmount: Optional[float] = Field(None, ge=0)
    taxPercent: Optional[float] = Field(None, ge=0, le=100)
    shippingAmount: Optional[float] = Field(None, ge=0)
    total: float = Field(..., ge=0)

    quotationStatus: QuotationStatus = QuotationStatus.SENT
    paymentStatus: QuotationPaymentStatus = QuotationPaymentStatus.UNPAID
    paymentTerms: Optional[str] = Field(None, max_length=500)
    paymentMethod: Optional[str] = Field(None, max_length=100)

    issueDate: date = Field(default_factory=date.today)
    valid: Optional[date] = Field(
        default_factory=lambda: (datetime.now(timezone.utc).date() + timedelta(days=60))
    )
    confirmedAt: Optional[datetime] = None
    rejectedAt: Optional[datetime] = None
    viewedAt: Optional[datetime] = None
    sentAt: Optional[datetime] = None

    # ── Content ───────────────────────────────────────────────────────────────
    termsAndConditions: Optional[str] = Field(None, max_length=5000)
    notes: Optional[str] = Field(None, max_length=2000)
    internalNotes: Optional[str] = Field(None, max_length=2000)
    signature: Optional[str] = None
    attachments: Optional[List[str]] = Field(default_factory=list)

    # ── Token for public confirm link ─────────────────────────────────────────
    confirmToken: Optional[str] = None
    confirmTokenExpiry: Optional[datetime] = None
    confirmedByName: Optional[str] = None
    confirmedByEmail: Optional[str] = None

    # ── Tracking ─────────────────────────────────────────────────────────────
    viewCount: int = Field(default=0)
    lastViewedAt: Optional[datetime] = None
    version: int = Field(default=1)
    isLatestVersion: bool = True
    previousVersionId: Optional[PydanticObjectId] = None

    # ── Relations ─────────────────────────────────────────────────────────────
    convertedToInvoice: bool = False
    invoiceId: Optional[PydanticObjectId] = None

    # ── Audit ─────────────────────────────────────────────────────────────────
    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    deletedBy: Optional[Link[UserModel]] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None

    class Settings:
        name = "quotations"
        use_state_management = True
        indexes = [
            IndexModel([("quoteId", 1)], unique=True, name="unique_quote_id"),
            IndexModel([("customerEmailHash", 1)], name="email_hash_idx"),
            IndexModel([("customerPhoneHash", 1)], name="phone_hash_idx"),
            IndexModel([("quotationStatus", 1)], name="status_idx"),
            IndexModel([("deal", 1)], name="deal_idx"),
            IndexModel([("createdAt", -1)], name="created_at_idx"),
            IndexModel([("valid", 1)], name="valid_idx"),
            IndexModel([("convertedToInvoice", 1)], name="invoice_idx"),
        ]

    # @model_validator(mode="before")
    # @classmethod
    # def validate_dates(cls, data:Any):
    #     valid = data.get("valid")
    #     issued = data.get("issueDate")
    #     print("valid date: ", valid)
    #     print("issued: ", issued)
    #     if valid and issued and issued > valid:
    #         raise AppException(400, "Valid date must be greater than issue date")
    #     return data

    @before_event(Insert, Replace, Save)
    def secure_sensitive_fields(self):
        if not self.customerEmail:
            raise ValueError("Customer email is required")

        if not self.customerEmail.startswith("gAAAAA"):
            email_plain = self.customerEmail.lower()
            self.customerEmailHash = hash_value(email_plain)
            self.customerEmail = encryption.encrypt_data(email_plain)

        if self.customerPhone and not self.customerPhone.startswith("gAAAAA"):
            phone_plain = self.customerPhone
            self.customerPhoneHash = hash_value(phone_plain)
            self.customerPhone = encryption.encrypt_data(phone_plain)

    @before_event(Insert, Replace, Save)
    def update_stamp(self):
        self.updatedAt = datetime.now(timezone.utc)

    @before_event(Insert)
    def set_sent_at(self):
        if self.quotationStatus == QuotationStatus.SENT:
            self.sentAt = datetime.now(timezone.utc)