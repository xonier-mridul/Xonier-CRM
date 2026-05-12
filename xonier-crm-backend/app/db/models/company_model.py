from beanie import Document, Link, before_event, Save, Replace, Update ,Insert
from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import Optional
from pymongo import IndexModel
from app.core.enums import NUMBER_OF_EMPLOYEES, COUNTRY_CODE, COMPANY_STATUS
from datetime import datetime, timezone

from app.utils.custom_exception import AppException
from app.core.crypto import Encryption
from app.core.security import hash_value


crypto = Encryption()


class CompanyModel(Document):
    companyId:str
    slug: str
    subDomain: Optional[str] = None
    industry: str
    companyName:str = Field(..., min_length=3)
    email: str
    emailHash: str
    number: str
    numberHash: str
    companySize: Optional[NUMBER_OF_EMPLOYEES] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    registrationNumber: Optional[str] = None
    tradeNumber: Optional[str] = None
    primary_admin: Optional[Link["UserModel"]] =None
    subscription: Optional[Link["SubscriptionModel"]] = None
    userLimit: Optional[int] = None
    subscriptionCount: int = 0
    country: Optional[COUNTRY_CODE] = None

    status: Optional[COMPANY_STATUS] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    createdBy: Link["UserModel"]
    updatedAt: Optional[datetime] = None
    deletedAt: Optional[datetime] = None
    deletedBy: Optional[Link["UserModel"]] = None
    

    class Settings:
        name = "companies"
        use_state_management = True
        indexes = [
            IndexModel(
                [("emailHash", 1)],
                unique = True,
                name="unique_company_email"
            ),
            IndexModel(
                [("companyId", 1)],
                name="unique_company_id",
                unique=True
            )
        ]

    
    @field_validator("companyName")
    @classmethod
    def validate_name(cls, v)->str:
        if v.strip() and len(v) < 3 and len(v) > 100:
            raise AppException(422, "Company name should be greater then 3 or less then 100")
        
        return v
    

    @before_event(Save, Replace, Insert)
    def hash_email(self):
        if not self.email:
            return 
        
        if self.id is None:
            lower = self.email.lower()
            self.email = crypto.encrypt_data(lower)
            self.emailHash = hash_value(lower)
            return 

        if "email" in self.get_changes():
            lower = self.email.lower()
            self.email = crypto.encrypt_data(lower)
            self.emailHash = hash_value(lower)
            return 
        
        
    @before_event(Save, Replace, Insert)
    def hash_phone(self):
        if not self.number:
            return 
        
        if self.id is None:
            lower = self.number.lower()
            self.number = crypto.encrypt_data(lower)
            self.numberHash = hash_value(lower)
            return 

        if "number" in self.get_changes():
            lower = self.number.lower()
            self.number = crypto.encrypt_data(lower)
            self.emailHash = hash_value(lower)
            return 



from app.db.models.subscription_model import SubscriptionModel
from app.db.models.user_model import UserModel
CompanyModel.model_rebuild()


