from beanie import Document, Link, before_event, Save, Insert, Replace, Indexed
from typing import Annotated, Optional
from pydantic import StringConstraints, Field, field_validator
from app.db.models.user_model import UserModel
from app.core.enums import PROJECT_TYPES, SALES_STATUS, PRIORITY, SOURCE, LANGUAGE_CODE, COUNTRY_CODE, INDUSTRIES, EMPLOYEE_SENIORITY
from datetime import datetime, timezone
from app.core.security import hash_password, hash_value
from app.core.crypto import encryptor
import phonenumbers
from pymongo import IndexModel




PhoneNumber = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=10,
        max_length=15,
        pattern=r"^\+?[1-9]\d{9,14}$"
    )
]

class LeadsModel(Document):
    lead_id: str
    fullName: str = Field(..., min_length=5, max_length=49)
    email: str  
    hashedEmail: str = Indexed()
    phone: str
    hashedPhone: str = Indexed()
    priority: PRIORITY
    source: SOURCE
    projectType: PROJECT_TYPES
    createdBy: Link[UserModel]
    status: SALES_STATUS = SALES_STATUS.NEW

    companyName: Optional[str] = None
    city: Optional[str] = None
    country: Optional[COUNTRY_CODE] = None
    postalCode: Optional[int] =  Field(None, gt=1000, lt=999999)
    language: Optional[LANGUAGE_CODE] = None
    
    industry: Optional[INDUSTRIES] = None
    employeeRole: Optional[str] = None
    employeeSeniority: Optional[EMPLOYEE_SENIORITY] = None
 
    message: Optional[str] = None
    membershipNotes: Optional[str] = None

    inDeal: bool = False
    
    updatedBy: Optional[Link[UserModel]] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None


    class Settings:
        name = "leads"
        use_state_management = True
        indexes = [
            IndexModel(
                [("lead_id", 1)],
                unique=True,
                name="unique_lead_id"
            )
        ]

    @before_event(Insert, Replace, Save)
    def encrypt_email(self):
        if not self.email:
            return

        if self.id is None:
            plain_email = self.email.lower()
            self.hashedEmail = hash_value(plain_email)
            self.email = encryptor.encrypt_data(plain_email)
            return

        if "email" in self.get_changes():
            plain_email:str = self.email.lower()
            self.hashedEmail = hash_value(plain_email)
            self.email = encryptor.encrypt_data(plain_email)

    @before_event(Insert, Replace, Save)
    def encrypt_phone(self):
        if not self.phone:
            return
        
        if self.id is None:
            plain_phone = self.phone
            self.phone = encryptor.encrypt_data(plain_phone)
            self.hashedPhone = hash_value(plain_phone)
            return
        
        if "phone" in self.get_changes():
            plain_phone = self.phone
            self.phone = encryptor.encrypt_data(plain_phone)
            self.hashedPhone = hash_value(plain_phone)


    # @field_validator("phone")
    # @classmethod
    # def validate_phone(cls, v: str):
    #     try:
    #         phone_number = phonenumbers.parse(v, None) 
    #         if not phonenumbers.is_valid_number(phone_number):
    #             raise ValueError()
    #     except Exception:
    #         raise ValueError("Invalid phone number format. Use country code, e.g. +919876543210")

    #     return v