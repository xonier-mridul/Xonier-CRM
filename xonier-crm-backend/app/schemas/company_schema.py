from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional
from app.core.enums import NUMBER_OF_EMPLOYEES, COUNTRY_CODE, COMPANY_STATUS, BILLING_CYCLE



class CompanyCreateSchema(BaseModel):
    industry: str
    companyName: str
    number: str
    companySize: Optional[NUMBER_OF_EMPLOYEES] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    registrationNumber: Optional[str] = None
    tradeNumber: Optional[str] = None
    adminFirstName: str
    adminLastName: Optional[str] = None
    adminEmail: EmailStr
    adminPhone: str
    password: str
    userLimit: Optional[int] = None
    country: Optional[COUNTRY_CODE] = None
    planId: Optional[str] = None
    billingCycle: BILLING_CYCLE = BILLING_CYCLE.MONTHLY

    @field_validator("companyName", mode="before")
    @classmethod
    def validate_company_name(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 3 or len(stripped) > 100:
            raise ValueError("Company name must be between 3 and 100 characters")
        return stripped

    @field_validator("adminFirstName", mode="before")
    @classmethod
    def validate_first_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Admin first name is required")
        if len(stripped) < 3 or len(stripped) > 49:
            raise ValueError("Admin first name must be between 3 and 49 characters")
        return stripped

    @field_validator("adminLastName", mode="before")
    @classmethod
    def validate_last_name(cls, v: str) -> str:
        if v is None:
            return v
        stripped = v.strip()
        if stripped and (len(stripped) < 2 or len(stripped) > 49):
            raise ValueError("Admin last name must be between 2 and 49 characters")
        return stripped

    @field_validator("password", mode="before")
    @classmethod
    def validate_password(cls, v: str) -> str:
        rules = {
            "lowercase": any(c.islower() for c in v),
            "uppercase": any(c.isupper() for c in v),
            "digit": any(c.isdigit() for c in v),
            "special": any(c in "@$!%*?&#" for c in v),
            "length": len(v) >= 8,
        }
        if not all(rules.values()):
            raise ValueError(
                "Password must contain uppercase, lowercase, digit, "
                "special character and be at least 8 characters"
            )
        return v

    @field_validator("planId", mode="before")
    @classmethod
    def validate_plan_id(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("planId cannot be empty string")
        return v

class CompanyUpdateSchema(BaseModel):
    industry: Optional[str] = None
    companyName: Optional[str] = None
    number: Optional[str] = None
    companySize: Optional[NUMBER_OF_EMPLOYEES] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    registrationNumber: Optional[str] = None
    tradeNumber: Optional[str] = None
    userLimit: Optional[int] = None
    country: Optional[COUNTRY_CODE] = None
    subDomain: Optional[str] = None
    status: Optional[COMPANY_STATUS] = None

    @field_validator("companyName", mode="before")
    @classmethod
    def validate_company_name(cls, v: str) -> str:
        if v is None:
            return v
        stripped = v.strip()
        if len(stripped) < 3 or len(stripped) > 100:
            raise ValueError("Company name must be between 3 and 100 characters")
        return stripped

    model_config = {"extra": "forbid"}


class CompanyFilterSchema(BaseModel):
    page: int = 1
    limit: int = 10
    search: Optional[str] = None
    status: Optional[COMPANY_STATUS] = None
    country: Optional[COUNTRY_CODE] = None
    companySize: Optional[NUMBER_OF_EMPLOYEES] = None

    @field_validator("page", "limit", mode="before")
    @classmethod
    def must_be_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Must be a positive integer")
        return v

    @field_validator("limit", mode="before")
    @classmethod
    def cap_limit(cls, v: int) -> int:
        return min(v, 100)
    


class CompanySelfRegisterSchema(BaseModel):
    industry: str
    companyName: str
    number: str
    companySize: Optional[NUMBER_OF_EMPLOYEES] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    registrationNumber: Optional[str] = None
    tradeNumber: Optional[str] = None
    adminFirstName: str
    adminLastName: Optional[str] = None
    adminEmail: EmailStr
    adminPhone: str
    password: str
    country: Optional[COUNTRY_CODE] = None
    planId: Optional[str] = None
    billingCycle: BILLING_CYCLE = BILLING_CYCLE.MONTHLY

    @field_validator("companyName", mode="before")
    @classmethod
    def validate_company_name(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 3 or len(stripped) > 100:
            raise ValueError("Company name must be between 3 and 100 characters")
        return stripped

    @field_validator("adminFirstName", mode="before")
    @classmethod
    def validate_first_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Admin first name is required")
        if len(stripped) < 3 or len(stripped) > 49:
            raise ValueError("Admin first name must be between 3 and 49 characters")
        return stripped

    @field_validator("password", mode="before")
    @classmethod
    def validate_password(cls, v: str) -> str:
        rules = {
            "lowercase": any(c.islower() for c in v),
            "uppercase": any(c.isupper() for c in v),
            "digit": any(c.isdigit() for c in v),
            "special": any(c in "@$!%*?&#" for c in v),
            "length": len(v) >= 8,
        }
        if not all(rules.values()):
            raise ValueError(
                "Password must contain uppercase, lowercase, digit, "
                "special character and be at least 8 characters"
            )
        return v

    @field_validator("planId", mode="before")
    @classmethod
    def validate_plan_id(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("planId cannot be empty string")
        return v


class VerifyCompanyOtpSchema(BaseModel):
    userId: str
    email: str
    otp: int

    @field_validator("otp", mode="before")
    @classmethod
    def validate_otp(cls, v: int) -> int:
        if not (100000 <= int(v) <= 999999):
            raise ValueError("OTP must be a 6-digit number")
        return v


class ResendOtpSchema(BaseModel):
    userId: str