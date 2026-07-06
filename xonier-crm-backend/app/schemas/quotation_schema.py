from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List, Any
from pydantic import Field
import phonenumbers
from app.core.enums import QuotationStatus, QuotationPaymentStatus, QuotationCurrency
from datetime import date, datetime
from app.utils.custom_exception import AppException


class QuotationLineItemSchema(BaseModel):
    description: str = Field(..., min_length=1, max_length=500)
    quantity: float = Field(..., gt=0)
    unit: Optional[str] = None
    unitPrice: float = Field(..., ge=0)
    discount: Optional[float] = Field(None, ge=0, le=100)
    taxRate: Optional[float] = Field(None, ge=0, le=100)
    total: float = Field(..., ge=0)


class QuotationSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)

    deal: str
    customerName: str = Field(..., min_length=1, max_length=200)
    customerEmail: str
    customerPhone: Optional[str] = None
    companyName: Optional[str] = None
    companyAddress: Optional[str] = None
    companyWebsite: Optional[str] = None

    lineItems: Optional[List[QuotationLineItemSchema]] = []

    currency: QuotationCurrency = QuotationCurrency.USD
    subTotal: float
    discountAmount: Optional[float] = None
    discountPercent: Optional[float] = None
    taxAmount: Optional[float] = None
    taxPercent: Optional[float] = None
    shippingAmount: Optional[float] = None
    total: float

    quotationStatus: QuotationStatus = QuotationStatus.SENT
    paymentTerms: Optional[str] = None
    paymentMethod: Optional[str] = None

    issueDate: date
    valid: Optional[date] = None

    termsAndConditions: Optional[str] = None
    notes: Optional[str] = None
    internalNotes: Optional[str] = None
    attachments: Optional[List[str]] = []

    @field_validator("subTotal", mode="before")
    @classmethod
    def check_sub_total(cls, v):
        if v is None:
            raise AppException(422, "subTotal is required")
        if float(v) < 0:
            raise AppException(422, "subTotal must be >= 0")
        return v

    @field_validator("total", mode="before")
    @classmethod
    def check_total(cls, v):
        if v is None:
            raise AppException(422, "total is required")
        if float(v) < 0:
            raise AppException(422, "total must be >= 0")
        return v

    @field_validator("customerEmail")
    @classmethod
    def validate_email(cls, v):
        import re
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", v.strip()):
            raise AppException(422, "Invalid email format")
        return v.strip().lower()

    # @field_validator("customerPhone")
    # @classmethod
    # def validate_phone(cls, v):
    #     if not v:
    #         return v
    #     try:
    #         phone_number = phonenumbers.parse(v, None)
    #         if not phonenumbers.is_valid_number(phone_number):
    #             raise ValueError()
    #         return phonenumbers.format_number(phone_number, phonenumbers.PhoneNumberFormat.E164)
    #     except Exception:
    #         raise AppException(422, "Invalid phone number format. Use E.164 format e.g. +1234567890")

    @model_validator(mode="after")
    def validate_dates_and_totals(self):
        if self.valid and self.issueDate > self.valid:
            raise AppException(422, "Valid date must be greater than issue date")

        if self.total < self.subTotal and not self.discountAmount and not self.discountPercent:
            raise AppException(422, "Total cannot be less than subTotal without a discount")

        return self


class QuotationUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deal: Optional[str] = None
    customerName: Optional[str] = None
    customerEmail: Optional[str] = None
    customerPhone: Optional[str] = None
    companyName: Optional[str] = None
    companyAddress: Optional[str] = None
    companyWebsite: Optional[str] = None

    lineItems: Optional[List[QuotationLineItemSchema]] = None

    currency: Optional[QuotationCurrency] = None
    subTotal: Optional[float] = None
    discountAmount: Optional[float] = None
    discountPercent: Optional[float] = None
    taxAmount: Optional[float] = None
    taxPercent: Optional[float] = None
    shippingAmount: Optional[float] = None
    total: Optional[float] = None

    paymentTerms: Optional[str] = None
    paymentMethod: Optional[str] = None

    issueDate: Optional[date] = None
    valid: Optional[date] = None

    termsAndConditions: Optional[str] = None
    notes: Optional[str] = None
    internalNotes: Optional[str] = None
    attachments: Optional[List[str]] = None

    @field_validator("subTotal")
    @classmethod
    def validate_subtotal(cls, v):
        if v is not None and v < 0:
            raise AppException(422, "subTotal must be >= 0")
        return v

    @field_validator("total")
    @classmethod
    def validate_total(cls, v):
        if v is not None and v < 0:
            raise AppException(422, "total must be >= 0")
        return v

    @field_validator("customerPhone")
    @classmethod
    def validate_phone(cls, v):
        if not v:
            return v
        try:
            phone_number = phonenumbers.parse(v, None)
            if not phonenumbers.is_valid_number(phone_number):
                raise ValueError()
            return phonenumbers.format_number(phone_number, phonenumbers.PhoneNumberFormat.E164)
        except Exception:
            raise AppException(422, "Invalid phone number format")


class QuoteStatusUpdateSchema(BaseModel):
    quotationStatus: QuotationStatus

    @field_validator("quotationStatus", mode="before")
    @classmethod
    def validate_quotation_status(cls, v: Any) -> QuotationStatus:
        if isinstance(v, QuotationStatus):
            return v
        if isinstance(v, str):
            try:
                return QuotationStatus(v.lower())
            except ValueError:
                valid_values = [s.value for s in QuotationStatus]
                raise AppException(422, f"Invalid status '{v}'. Must be one of: {', '.join(valid_values)}")
        raise AppException(422, f"quotationStatus must be a string, got {type(v).__name__}")


class QuotationConfirmSchema(BaseModel):
    confirmedByName: Optional[str] = None
    confirmedByEmail: Optional[str] = None