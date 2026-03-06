from beanie import Link, PydanticObjectId
from pydantic import BaseModel, StringConstraints, EmailStr, Field, field_validator, model_validator, HttpUrl
from typing import Optional, Annotated, List
from app.core.enums import PROJECT_TYPES, PRIORITY, SOURCE, DESIGNATION, NUMBER_OF_EMPLOYEES, INDUSTRIES, TECHNOLOGY, INFO_TYPE, COUNTRY_CODE
from app.db.models.user_model import UserModel
import re
from app.utils.custom_exception import AppException
from app.core.constants import ZIPCODE_PATTERNS
from app.utils.custom_exception import AppException


PhoneNumber = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=10,
        max_length=15,
        pattern=r"^\+?[1-9]\d{9,14}$",
        
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
            raise AppException(422,"Field must not be blank")
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
                raise AppException(422,
                    f"Invalid zipcode '{self.zipcode}' for country '{country_key}'. "
                    f"Expected format: {example}"
                )
        elif not re.fullmatch(r"^[A-Z0-9\s\-]{3,10}$", zipcode, re.IGNORECASE):
            raise AppException(422,
                f"Zipcode '{self.zipcode}' doesn't look valid. "
                "Expected 3–10 alphanumeric characters."
            )

        self.zipcode = zipcode
        return self
 
    
class EnquiryRegisterSchema(BaseModel):
    fullName: str
    email: EmailStr
    phone: PhoneNumber
    companyName: Optional[str] = None
    designation: DESIGNATION = DESIGNATION.OTHER
    socialLinks: Optional[SocialLinks] = None
    infoType: INFO_TYPE
    location: Optional[Location] = None
    numberOfEmployees: Optional[NUMBER_OF_EMPLOYEES] = None
    industry: List[INDUSTRIES]
    technologies: Optional[List[TECHNOLOGY]] = []
    keywords: Optional[List[str]] = []
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
    

    
    @model_validator(mode="before")
    @classmethod
    def validate_project_type(cls, values):
        if not values.get("projectType"):
            raise AppException(422, "Project type field must be required")
        
        # if values.get("projectType") not in PROJECT_TYPES.__members__:
        #    print("vv: ", PROJECT_TYPES.__members__)
        #    raise AppException(422, "Project type field must be a valid enum")

        if not values.get("priority"):
            raise AppException(422, "Priority field must be required")
        
        # if values.get("priority") != PRIORITY:
        #     raise AppException(422, "Priority field must be a valid enum")

        if not values.get("source"):
            raise AppException(422, "Source  field must be required")
        
        # if values.get("source") != SOURCE:
        #     raise AppException(422, "Source  field must be a valid enum")
        return values
    


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
    designation: DESIGNATION = DESIGNATION.OTHER
    infoType: INFO_TYPE
    socialLinks: Optional[SocialLinks] = None
    location: Optional[Location] = None
    numberOfEmployees: Optional[NUMBER_OF_EMPLOYEES] = None
    technologies: Optional[List[TECHNOLOGY]] = []
    keywords: Optional[List[str]] = []
    industry: List[INDUSTRIES]
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
    

    @model_validator(mode="before")
    @classmethod
    def validate_project_update_type(cls, values):
        if not values.get("projectType"):
            raise AppException(422, "Project type field must be required")
        
        # if values.get("projectType") != PROJECT_TYPES:
        #     raise AppException(422, "Project type field must be a valid enum")

        if not values.get("priority"):
            raise AppException(422, "Priority field must be required")
        
        # if values.get("priority") != PRIORITY:
        #     raise AppException(422, "Priority field must be a valid enum")

        if not values.get("source"):
            raise AppException(422, "Source  field must be required")
        
        # if values.get("source") != SOURCE:
        #     raise AppException(422, "Source  field must be a valid enum")
        return values
    

class BulkAssign(BaseModel):
    enquiryIds: List[str]
    assignedTo: str


    @model_validator(mode="before")
    @classmethod
    def validate_bulk_assign_payload(cls, value):
        if not value.get("assignedTo"):
            raise AppException(422,"assigned to field must be required")
        
        if not value.get("enquiryIds"):
            raise AppException(422, "enquiry ids field must be required")
        

        return value




    