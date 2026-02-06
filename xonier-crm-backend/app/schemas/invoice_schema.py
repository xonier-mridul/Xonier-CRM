
from pydantic import Field, BaseModel
from typing import Optional, List
from datetime import datetime, date, timezone

from app.core.enums import INVOICE_STATUS






class InvoiceModel(BaseModel):

    invoiceId: str                   
    deal: str
    quotation: str

    customerName: str
    customerEmail: str

    customerPhone: Optional[str] = None

    companyName: Optional[str] = None

    billingAddress: Optional[str] = None
    subTotal: float = Field(..., gt=0)
    total: float = Field(0, ge=0)

    issueDate: Optional[date] = None
    dueDate: date

    status: INVOICE_STATUS = INVOICE_STATUS.DRAFT

    notes: Optional[str] = None

    paidAmount: float = Field(0, ge=0)
    lastPaymentDate: Optional[datetime] = None

    createdBy: str
 