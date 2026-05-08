from beanie import Document, Link
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from pymongo import IndexModel
from app.core.enums import NUMBER_OF_EMPLOYEES, COUNTRY_CODE, COMPANY_STATUS
from datetime import datetime, timezone
from app.db.models.user_model import UserModel



class CompanyModel(Document):
    companyId:str
    slug: str
    subDomain: Optional[str] = None
    industry: str
    companyName:str = Field(..., min_length=3)
    email: EmailStr
    number: str
    companySize: Optional[NUMBER_OF_EMPLOYEES] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    registrationNumber: Optional[str] = None
    primary_admin: Link[UserModel]
    subscription: Optional[Link["SubscriptionModel"]] = None
    userLimit: Optional[int] = None
    planCount: int = 0
    country: Optional[COUNTRY_CODE] = None

    status: Optional[COMPANY_STATUS] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    createdBy: Link[UserModel]
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    

    class Settings:
        name = "companies"
        indexes = [
            IndexModel(
                [("email", 1)],
                unique = True,
                name="unique_company_email"
            ),
            IndexModel(
                [("companyId", 1)],
                name="unique_company_id",
                unique=True
            )
        ]
  

from app.db.models.subscription_model import SubscriptionModel
CompanyModel.model_rebuild()


