from pydantic import BaseModel, field_validator, Field, EmailStr, model_validator
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
    EMPLOYEE_SENIORITY, CONTACT_STATUS
)
from app.utils.custom_exception import AppException

class LeadBaseSchema(BaseModel):
    fullName: str
    email: EmailStr
    phone: Optional[str] = None

    priority: Optional[PRIORITY] = PRIORITY.MEDIUM.value
    source: Optional[str] = SOURCE.OTHER.value 
    projectType:Optional[str] = None

    companyName: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    postalCode: Optional[int] = None
    language: Optional[LANGUAGE_CODE] = None
    dataTag: Optional[str] = None

    industry: Optional[str] = None
    employeeRole: Optional[str] = None
    employeeSeniority: Optional[EMPLOYEE_SENIORITY] = None
    extraFields: Optional[dict[str, str | int | float | bool | None]] = Field(default=None)
    message: Optional[str] = None
    membershipNotes: Optional[str] = None

    @field_validator("fullName", mode="before")
    @classmethod
    def name_min_length(cls, v: Optional[str]):
        if v and len(v.strip()) < 1:
            raise AppException(422, "Full name must be at least 1 characters long")
        return v

    # @field_validator("phone")
    # @classmethod
    # def validate_phone(cls, v: Optional[str]):
    #     if not v:
    #         return v
    #     try:
    #         phone_number = phonenumbers.parse(v, None)
    #         if not phonenumbers.is_valid_number(phone_number):
    #             raise AppException(422, "Invalid phone number format. Use country code, e.g. +919876543210")
    #     except Exception:
    #         raise AppException(422,
    #             "Invalid phone number format. Use country code, e.g. +919876543210"
    #         )
    #     return v
    
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
    phone: Optional[str] = None

    priority: Optional[PRIORITY] = PRIORITY.MEDIUM.value
    source: Optional[str] = SOURCE.OTHER.value
    projectType:Optional[str] = None
    dataTag: Optional[str] = None

    companyName: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] =None
    postalCode: Optional[int] = Field(None, ge=1000, le=999999)
    language: Optional[LANGUAGE_CODE] =None

    industry: Optional[str] = None
    employeeRole: Optional[str] = None
    employeeSeniority: Optional[EMPLOYEE_SENIORITY] = None
    extraFields: Optional[dict[str, str | int | float | bool | None]] = Field(default=None)

    message: Optional[str] = None
    membershipNotes: Optional[str] = None

    # @model_validator(mode="before")
    # @classmethod
    # def validate_fields(cls, value):
    #     sourcef = value.get("source")

    #     if not sourcef:
    #         raise AppException(422, "source field must required")
        
    #     return value


class CreateBulkLeadSchema(BaseModel):
    
    leads: List[LeadsCreateSchema]
    dataTag: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def data_tag_lowercase(cls, value):
        tag = value.get("dataTag")
        
        if tag:
            value["dataTag"] = tag.strip().lower()

        return value


class BulkAssignLeadSchema(BaseModel):
    userId: str
    leadsId: List[str] 

    
class LeadUpdateSchema(LeadBaseSchema):
    status: Optional[SALES_STATUS] = None

class LeadStatusUpdateSchema(BaseModel):
    status: SALES_STATUS

class LeadConnectStatusUpdateSchema(BaseModel):
    status: CONTACT_STATUS

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v):
        try:
            return CONTACT_STATUS(v)
        except ValueError:
            raise AppException(
                422,
                "Invalid status. Use: connected, not_connected, interested, not_interested, not_reached"
            )


class BulkReassignLeadSchema(BaseModel):
    userId: str
    leadsId: List[str]

    @field_validator("userId")
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("userId cannot be empty")
        return v.strip()

    @field_validator("leadsId")
    @classmethod
    def validate_leads_id(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("leadsId cannot be empty")
        return v
    
class BulkDeleteSchema(BaseModel):
    leadsIds: List[str]

    @field_validator("leadsIds")
    @classmethod
    def validate_leads_id(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("leadsIda cannot be empty")
        return v
    

class BulkClearAssignSchema(BaseModel):
    leadsIds: List[str]

    @field_validator("leadsIds")
    @classmethod
    def validate_leads_id(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("leadsIda cannot be empty")
        return v

