from pydantic import BaseModel, model_validator, Field
from typing import Any, Optional
from app.utils.custom_exception import AppException
import re
from beanie import Document
from datetime import datetime, timezone


class QueryModel(Document):
    name: str
    email: str
    phone: str
    address: str
    industryType: str
    companyName: str
    teamSize: str
    message: Optional[str] = None
    createdAt: datetime = Field(..., default_factory=lambda:datetime.now(timezone.utc))


    class Settings:
        name = "queries"

    @model_validator(mode="before")
    @classmethod
    def validate_fields(cls, fields: Any):
        name = fields.get("name")
        email = fields.get("email")
        phone = fields.get("phone")
        address = fields.get("address")
        industryType = fields.get("industryType")
        companyName = fields.get("companyName")
        teamSize = fields.get("teamSize")

        
        if not name or not name.strip():
            raise AppException(422, "Name field must be required")

        if not email or not email.strip():
            raise AppException(422, "Email field must be required")

        if not phone or not phone.strip():
            raise AppException(422, "Phone field must be required")

        if not address or not address.strip():
            raise AppException(422, "Address field must be required")

        if not industryType or not industryType.strip():
            raise AppException(422, "Industry type field must be required")

        if not companyName or not companyName.strip():
            raise AppException(422, "Company name field must be required")

        if not teamSize or not teamSize.strip():
            raise AppException(422, "Team size field must be required")

        
        cls._validate_email(email.strip())

        
        cls._validate_phone(phone.strip())

        return fields

    @classmethod
    def _validate_email(cls, email: str):
        
        email_regex = re.compile(
            r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,10}$"
        )

        if not email_regex.match(email):
            raise AppException(422, "Please provide a valid email address")

        
        local_part, domain = email.rsplit("@", 1)

        if len(local_part) > 64:
            raise AppException(422, "Email local part must not exceed 64 characters")

        if len(domain) > 255:
            raise AppException(422, "Email domain must not exceed 255 characters")

        if email.count("@") != 1:
            raise AppException(422, "Email must contain exactly one @ symbol")

        if ".." in email:
            raise AppException(422, "Email must not contain consecutive dots")

    @classmethod
    def _validate_phone(cls, phone: str):
        
        cleaned_phone = re.sub(r"[\s\-\(\)]", "", phone)

        phone_regex = re.compile(
            r"^\+?[1-9]\d{6,14}$" 
        )

        if not phone_regex.match(cleaned_phone):
            raise AppException(
                422,
                "Please provide a valid phone number (e.g., +1234567890 or 1234567890)"
            )

        
        digit_count = len(re.sub(r"\D", "", cleaned_phone))

        if digit_count < 7:
            raise AppException(422, "Phone number must have at least 7 digits")

        if digit_count > 15:
            raise AppException(422, "Phone number must not exceed 15 digits")