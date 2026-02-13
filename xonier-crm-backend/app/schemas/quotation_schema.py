from pydantic import BaseModel, field_validator
from typing import Optional, Any
import phonenumbers
from app.core.enums import QuotationStatus
from datetime import date, datetime

class QuotationSchema(BaseModel):

    title: Optional[str]
    description: Optional[str]

    deal: str
    customerName: str

    customerEmail: str

    customerPhone: Optional[str]

    companyName: Optional[str]
    quotationStatus: QuotationStatus = QuotationStatus.SENT
    issueDate: date
    valid: Optional[date] = None
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
    

class QuotationUpdateSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

    deal: Optional[str] = None
    customerName: Optional[str] = None
    customerEmail: Optional[str] = None
    customerPhone: Optional[str] = None
    companyName: Optional[str] = None

    issueDate: Optional[date] = None
    valid: Optional[datetime] = None

    subTotal: Optional[float] = None
    total: Optional[float] = None


    @field_validator("subTotal")
    @classmethod
    def validate_subtotal(cls, v):
        if v is not None and v < 0:
            raise ValueError("Sub total must be >= 0")
        return v

    @field_validator("total")
    @classmethod
    def validate_total(cls, v):
        if v is not None and v < 0:
            raise ValueError("Total must be >= 0")
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
            return phonenumbers.format_number(
                phone_number, phonenumbers.PhoneNumberFormat.E164
            )
        except Exception:
            raise ValueError("Invalid phone number format")
        

class QuoteStatusUpdateSchema(BaseModel):
    quotationStatus: QuotationStatus


    @field_validator('quotationStatus', mode='before')
    @classmethod
    def validate_quotation_status(cls, v: Any) -> QuotationStatus:
        
        if isinstance(v, QuotationStatus):
            return v
        
        if isinstance(v, str):
            
            try:
                return QuotationStatus(v.lower())
            except ValueError:
                valid_values = [status.value for status in QuotationStatus]
                raise ValueError(
                    f"Invalid quotation status: '{v}'. "
                    f"Must be one of: {', '.join(valid_values)}"
                )
        
        raise ValueError(
            f"quotationStatus must be a string or QuotationStatus enum, "
            f"got {type(v).__name__}"
        )
