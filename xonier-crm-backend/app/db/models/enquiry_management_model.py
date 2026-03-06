from beanie import Document, Link, before_event,Save, Replace, Insert, Indexed
from typing import Optional, Annotated, List
from app.core.enums import PROJECT_TYPES, SALES_STATUS, PRIORITY, SOURCE, NUMBER_OF_EMPLOYEES, INDUSTRIES, DESIGNATION, INFO_TYPE, TECHNOLOGY, COUNTRY_CODE
from app.db.models.user_model import UserModel
from datetime import datetime, timedelta, timezone
from pydantic import Field, EmailStr, StringConstraints
from app.core.security import hash_value
from app.core.crypto import encryptor
from pydantic import BaseModel, field_validator, model_validator, HttpUrl
import re
from app.core.constants import ZIPCODE_PATTERNS

PhoneNumber = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=10,
        max_length=15,
        pattern=r"^\+?[1-9]\d{9,14}$"
    )
]

class OtherSocialLinks(BaseModel):
    platform: str
    url: HttpUrl


class SocialLinks(BaseModel):
    linkedin:  Optional[HttpUrl] = None
    twitter:   Optional[HttpUrl] = None
    github:    Optional[HttpUrl] = None
    facebook:  Optional[HttpUrl] = None
    instagram: Optional[HttpUrl] = None
    youtube:   Optional[HttpUrl] = None
    website:   Optional[HttpUrl] = None 
    other: Optional[List[OtherSocialLinks]] = None
    
    

class Location(BaseModel):
    country: Optional[COUNTRY_CODE] = None
    state: Optional[str] = None
    city: Optional[str] = None
    zipcode: Optional[str] = None

    @field_validator("state", "city")
    @classmethod
    def not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Field must not be blank")
        return v.strip() if v else v

    @model_validator(mode="after")
    def validate_zipcode_for_country(self) -> "Location":
        
        if not self.zipcode or not self.country:
            return self

        country_key = self.country.value if hasattr(self.country, "value") else str(self.country)
        zipcode = self.zipcode.strip().upper()

        if country_key in ZIPCODE_PATTERNS:
            pattern, example = ZIPCODE_PATTERNS[country_key]
            if not re.fullmatch(pattern, zipcode, re.IGNORECASE):
                raise ValueError(
                    f"Invalid zipcode '{self.zipcode}' for country '{country_key}'. "
                    f"Expected format: {example}"
                )
        elif not re.fullmatch(r"^[A-Z0-9\s\-]{3,10}$", zipcode, re.IGNORECASE):
            raise ValueError(
                f"Zipcode '{self.zipcode}' doesn't look valid. "
                "Expected 3–10 alphanumeric characters."
            )

        self.zipcode = zipcode
        return self


class EnquiryModel(Document):
    enquiry_id: str = Indexed(unique=True)
    fullName: str
    email: EmailStr
    phone: PhoneNumber
    companyName: Optional[str] = None
    infoType: INFO_TYPE
    
    designation: DESIGNATION = DESIGNATION.OTHER
    socialLinks: Optional[SocialLinks] = None
    location: Optional[Location] = None
    numberOfEmployees: Optional[NUMBER_OF_EMPLOYEES] = None
    industry: List[INDUSTRIES]
    technologies: Optional[List[TECHNOLOGY]] = []
    keywords: Optional[List[str]] = []

    priority: PRIORITY

    projectType: PROJECT_TYPES
    status: SALES_STATUS = SALES_STATUS.NEW
    isActive: bool = True
    priority: PRIORITY
    source: SOURCE
    message: Optional[str] = None
    assignTo: Optional[Link[UserModel]] = None
    assignBy: Optional[Link[UserModel]] = None
    assignedAt: Optional[datetime] = None
    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None

    class Settings: 
        name = "enquiries"
        use_state_management = True


    @before_event(Save, Replace)
    def update_timestamp_update(self):
        self.updatedAt = datetime.now(timezone.utc)
