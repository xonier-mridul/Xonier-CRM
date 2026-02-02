from pydantic import BaseModel, field_validator
from typing import Optional
import phonenumbers
from app.core.enums import QuotationStatus
from datetime import date

class QuotationSchema(BaseModel):
    quoteId: str
    title: Optional[str]
    description: Optional[str]

    deal: str

    customerId: str
    customerName: str

    customerEmail: str

    customerPhone: Optional[str]

    companyName: Optional[str]
    quotationStatus: QuotationStatus = QuotationStatus.SENT
    issueDate: date
    subTotal: float
    total: float


    @field_validator("subTotal", mode="before")
    @classmethod
    def check_sub_total(cls, v):
        if not v:
            raise ValueError("Sub total field is required")
        
        if v < 0:
            raise ValueError("Sub total must be equal to or grater then 0")
        
        return v
    
    @field_validator("total", mode="before")
    @classmethod
    def check_total(cls, v):
        if not v:
            raise ValueError("Total field is required")
        
        if v < 0:
            raise ValueError("Total must be equal to or grater then 0")
        
        return v
    

    @field_validator("customerPhone")
    @classmethod
    def validate_phone(cls, v: Optional[str]):
        if not v:
            return v
        try:
            phone_number = phonenumbers.parse(v, None)
            if not phonenumbers.is_valid_number(phone_number):
                raise ValueError()
        except Exception:
            raise ValueError(
                "Invalid phone number format. Use country code, e.g. +919876543210"
            )
        return v
