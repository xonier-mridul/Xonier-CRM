
from pydantic import Field, BaseModel
from typing import Optional, List
from datetime import datetime, date, timezone

from app.core.enums import INVOICE_STATUS




class InvoiceCreateSchema(BaseModel):
    invoiceId: str
    sourceQuoteId: Optional[str] = None

    deal: str
    quotation: str

    customerName: str
    customerEmail: str
    customerPhone: Optional[str] = None
    companyName: Optional[str] = None
    companyAddress: Optional[str] = None
    companyWebsite: Optional[str] = None
    billingAddress: Optional[str] = None

    lineItems: Optional[List[dict]] = Field(default_factory=list)

    currency: str = "USD"
    subTotal: float = Field(..., gt=0)
    discountAmount: Optional[float] = None
    discountPercent: Optional[float] = None
    taxAmount: Optional[float] = None
    taxPercent: Optional[float] = None
    shippingAmount: Optional[float] = None
    total: float = Field(..., ge=0)

    issueDate: Optional[date] = None
    dueDate: date

    status: INVOICE_STATUS = INVOICE_STATUS.ISSUED

    paymentTerms: Optional[str] = None
    notes: Optional[str] = None
    termsAndConditions: Optional[str] = None
    internalNotes: Optional[str] = None

    paidAmount: float = 0
    lastPaymentDate: Optional[datetime] = None

    createdBy: str