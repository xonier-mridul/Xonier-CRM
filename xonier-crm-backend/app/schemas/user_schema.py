from pydantic import BaseModel, EmailStr, StringConstraints, field_validator
from app.core.enums import USER_ROLES
from typing_extensions import Annotated
from pydantic import Field
from typing import List


Password = Annotated[str, ...]
Otp = Annotated[int, Field(gt=100000, lt=999999)]


class RegisterUserSchema(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    phone: str
    password: Password
    userRole: List[str]
    company: str

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str):
        rules = {
            "lowercase": any(c.islower() for c in v),
            "uppercase": any(c.isupper() for c in v),
            "digit": any(c.isdigit() for c in v),
            "special": any(c in "@$!%*?&#" for c in v),
            "length": len(v) >= 8,
        }

        if not all(rules.values()):
            raise ValueError(
                "Password must contain uppercase, lowercase, digit, special character and be at least 8 characters long"
            )

        return v

class UpdateUserSchema(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    phone: str
    userRole: List[str]
    company: str


class UserLoginSchema(BaseModel):
    email: EmailStr
    password: Password

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str):
        rules = {
            "lowercase": any(c.islower() for c in v),
            "uppercase": any(c.isupper() for c in v),
            "digit": any(c.isdigit() for c in v),
            "special": any(c in "@$!%*?&#" for c in v),
            "length": len(v) >= 8,
        }

        if not all(rules.values()):
            raise ValueError(
                "Password must contain uppercase, lowercase, digit, special character and be at least 8 characters long"
            )

        return v
    
class ResendOTPSchema(BaseModel):
    email: EmailStr
    password: Password

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str):
        rules = {
            "lowercase": any(c.islower() for c in v),
            "uppercase": any(c.isupper() for c in v),
            "digit": any(c.isdigit() for c in v),
            "special": any(c in "@$!%*?&#" for c in v),
            "length": len(v) >= 8,
        }

        if not all(rules.values()):
            raise ValueError(
                "Password must contain uppercase, lowercase, digit, special character and be at least 8 characters long"
            )

        return v
    
class VerifyLoginOtpSchema(BaseModel):
    email: EmailStr
    otp: Otp
    password: Password

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str):
        rules = {
            "lowercase": any(c.islower() for c in v),
            "uppercase": any(c.isupper() for c in v),
            "digit": any(c.isdigit() for c in v),
            "special": any(c in "@$!%*?&#" for c in v),
            "length": len(v) >= 8,
        }

        if not all(rules.values()):
            raise ValueError(
                "Password must contain uppercase, lowercase, digit, special character and be at least 8 characters long"
            )

        return v
    

class ResetPasswordSchema(BaseModel):
    oldPassword: Password
    newPassword: Password

    @field_validator("newPassword")
    @classmethod
    def strong_password(cls, v: str):
        rules = {
            "lowercase": any(c.islower() for c in v),
            "uppercase": any(c.isupper() for c in v),
            "digit": any(c.isdigit() for c in v),
            "special": any(c in "@$!%*?&#" for c in v),
            "length": len(v) >= 8,
        }

        if not all(rules.values()):
            raise ValueError(
                "Password must contain uppercase, lowercase, digit, special character and be at least 8 characters long"
            )

        return v

    
