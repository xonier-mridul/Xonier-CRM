from beanie import Link, PydanticObjectId
from pydantic import BaseModel, StringConstraints, EmailStr, Field, field_validator
from typing import Optional, Annotated, List
from app.core.enums import PROJECT_TYPES, PRIORITY, SOURCE
from app.db.models.user_model import UserModel
import re


PhoneNumber = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=10,
        max_length=15,
        pattern=r"^\+?[1-9]\d{9,14}$",
        
    )
]

class EnquiryRegisterSchema(BaseModel):
    fullName: str
    email: EmailStr
    phone: PhoneNumber
    companyName: Optional[str] = None
    projectType: PROJECT_TYPES
    priority: PRIORITY
    source: SOURCE
    assignTo: Optional[str] = None
    message: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        digits_only = value.replace("+", "")

        if not digits_only.isdigit():
            raise ValueError("Phone number must contain only digits")

        if len(digits_only) < 10:
            raise ValueError("Phone number must be at least 10 digits")

        if len(digits_only) > 15:
            raise ValueError("Phone number must not exceed 15 digits")

        if not re.match(r"^\+?[1-9]\d{9,14}$", value):
            raise ValueError(
                "Invalid phone number format. Use 9876543210 or +919876543210"
            )

        return value
    
class EnquiryRegisterSchema(BaseModel):
    fullName: str
    email: EmailStr
    phone: PhoneNumber
    companyName: Optional[str] = None
    projectType: PROJECT_TYPES
    priority: PRIORITY
    source: SOURCE
    assignTo: Optional[str] = None
    message: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        digits_only = value.replace("+", "")

        if not digits_only.isdigit():
            raise ValueError("Phone number must contain only digits")

        if len(digits_only) < 10:
            raise ValueError("Phone number must be at least 10 digits")

        if len(digits_only) > 15:
            raise ValueError("Phone number must not exceed 15 digits")

        if not re.match(r"^\+?[1-9]\d{9,14}$", value):
            raise ValueError(
                "Invalid phone number format. Use 9876543210 or +919876543210"
            )

        return value
    
from typing import List

class BulkEnquiryRegisterSchema(BaseModel):
    enquiries: List[EnquiryRegisterSchema]

    @field_validator("enquiries")
    @classmethod
    def validate_not_empty(cls, value):
        if not value:
            raise ValueError("Enquiries list cannot be empty")
        return value


    

class UpdateEnquirySchema(BaseModel):
    fullName: str
    email: EmailStr
    phone: PhoneNumber
    companyName: Optional[str] = None
    projectType: PROJECT_TYPES
    priority: PRIORITY
    source: SOURCE
    assignTo: Optional[str] = None
    message: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        digits_only = value.replace("+", "")

        if not digits_only.isdigit():
            raise ValueError("Phone number must contain only digits")

        if len(digits_only) < 10:
            raise ValueError("Phone number must be at least 10 digits")

        if len(digits_only) > 15:
            raise ValueError("Phone number must not exceed 15 digits")

        if not re.match(r"^\+?[1-9]\d{9,14}$", value):
            raise ValueError(
                "Invalid phone number format. Use 9876543210 or +919876543210"
            )

        return value


    