from pydantic import BaseModel, field_validator, Field, EmailStr
from typing import Optional, List
import phonenumbers
from app.core.enums import (
    PROJECT_TYPES,
    SALES_STATUS,
    PRIORITY,
    SOURCE,
    LANGUAGE_CODE,
    COUNTRY_CODE,
    INDUSTRIES,
    EMPLOYEE_SENIORITY,
)
from app.utils.custom_exception import AppException

class LeadBaseSchema(BaseModel):
    fullName: str
    email: EmailStr
    phone: str

    priority: PRIORITY
    source: SOURCE
    projectType:PROJECT_TYPES

    companyName: Optional[str] = None
    city: Optional[str] = None
    country: Optional[COUNTRY_CODE] = None
    postalCode: Optional[int] = None
    language: Optional[LANGUAGE_CODE] = None

    industry: Optional[INDUSTRIES] = None
    employeeRole: Optional[str] = None
    employeeSeniority: Optional[EMPLOYEE_SENIORITY] = None
    extraFields: Optional[dict[str, str | int | float | bool | None]] = Field(default=None)
    message: Optional[str] = None
    membershipNotes: Optional[str] = None

    @field_validator("fullName", mode="before")
    @classmethod
    def name_min_length(cls, v: Optional[str]):
        if v and len(v.strip()) < 5:
            raise AppException(422, "Full name must be at least 5 characters long")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]):
        if not v:
            return v
        try:
            phone_number = phonenumbers.parse(v, None)
            if not phonenumbers.is_valid_number(phone_number):
                raise AppException(422, "Invalid phone number format. Use country code, e.g. +919876543210")
        except Exception:
            raise AppException(422,
                "Invalid phone number format. Use country code, e.g. +919876543210"
            )
        return v
    
    @field_validator("postalCode")
    @classmethod
    def validate_zip(cls, v):
        if not v:
            return v
        
        if (v < 1000) or (v > 999999):
            raise AppException(422, "Postal code must be between 4 and 6 digits (e.g., 1234–123456)")
        
        return v


class LeadsCreateSchema(LeadBaseSchema):
    fullName: str
    email: EmailStr
    phone: str

    priority: PRIORITY
    source: SOURCE
    projectType: PROJECT_TYPES

    companyName: Optional[str] = None
    city: Optional[str] = None
    country: Optional[COUNTRY_CODE] =None
    postalCode: Optional[int] = Field(None, ge=1000, le=999999)
    language: Optional[LANGUAGE_CODE] =None

    industry: Optional[INDUSTRIES] = None
    employeeRole: Optional[str] = None
    employeeSeniority: Optional[EMPLOYEE_SENIORITY] = None

    message: Optional[str] = None
    membershipNotes: Optional[str] = None


class CreateBulkLeadSchema(BaseModel):
    leads: List[LeadsCreateSchema]
    

    
class LeadUpdateSchema(LeadBaseSchema):
    status: Optional[SALES_STATUS] = None
