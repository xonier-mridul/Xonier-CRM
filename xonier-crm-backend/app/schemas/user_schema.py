from pydantic import BaseModel, EmailStr, StringConstraints, field_validator
from app.core.enums import USER_ROLES, USER_STATUS
from typing_extensions import Annotated
from pydantic import Field
from typing import List
import phonenumbers

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

    @field_validator("firstName", "lastName")
    @classmethod
    def name_min_length(cls, v: str):
        if len(v.strip()) < 4:
            raise ValueError("First name and last name must be at least 4 characters long")
        return v
    
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str):
        try:
            phone_number = phonenumbers.parse(v, None) 
            if not phonenumbers.is_valid_number(phone_number):
                raise ValueError()
        except Exception:
            raise ValueError("Invalid phone number format. Use country code, e.g. +919876543210")

        return v

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

    @field_validator("firstName", "lastName")
    @classmethod
    def name_min_length(cls, v: str):
        if len(v.strip()) < 4:
            raise ValueError("First name and last name must be at least 5 characters long")
        return v
    

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str):
        try:
            phone_number = phonenumbers.parse(v, None) 
            if not phonenumbers.is_valid_number(phone_number):
                raise ValueError()
        except Exception:
            raise ValueError("Invalid phone number format. Use country code, e.g. +919876543210")

        return v

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
    

class UpdateUserStatusSchema(BaseModel):
    status: USER_STATUS
    
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
    

class ResetPasswordByAdminSchema(BaseModel):
    password: Password
    confirmPassword: Password

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
    @field_validator("confirmPassword")
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

    
