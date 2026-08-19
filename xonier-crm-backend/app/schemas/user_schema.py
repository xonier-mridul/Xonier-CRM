from pydantic import BaseModel, EmailStr, StringConstraints, field_validator, model_validator
from app.core.enums import USER_ROLES, USER_STATUS
from typing_extensions import Annotated
from pydantic import Field
from typing import List, Optional
from app.utils.custom_exception import AppException
import phonenumbers
import re

Password = Annotated[str, ...]
Otp = Annotated[int, Field(gt=100000, lt=999999)]


class RegisterUserSchema(BaseModel):
    firstName: str 
    lastName: str 
    email: EmailStr
    phone: str
    password: Password
    userRole: List[str]
    
    companyId: Optional[str] = None

    @field_validator("firstName", "lastName")
    @classmethod
    def name_min_length(cls, v: str):
        if len(v.strip()) < 3:
            raise ValueError("First name and last name must be at least 3 characters long")
        return v
    
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str):
        try:
            phone_number = phonenumbers.parse(v, None) 
            if not phonenumbers.is_valid_number(phone_number):
                raise ValueError()
        except Exception:
            raise AppException(422, "Invalid phone number format")

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
    
    companyId: Optional[str] = None

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
            raise AppException(422, "Invalid phone number format")

        return v


class AdminLoginSchema(BaseModel):
    
    email: EmailStr
    password: Password

    @model_validator(mode="before")
    @classmethod
    def verify_fields(cls, value):
       
        email = value.get("email")

        if not email:
            raise AppException(422, "Email field is required")

        return value


    @field_validator("password")
    @classmethod
    def strong_password2(cls, v: str):

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

class UserLoginSchema(BaseModel):
    companyId: str
    email: EmailStr
    password: Password

    @model_validator(mode="before")
    @classmethod
    def verify_fields(cls, value):
        companyId = value.get("companyId")
        email = value.get("email")

        if not companyId:
            raise AppException(422, "Company Id required")

        if not email:
            raise AppException(422, "Email field is required")

        return value


    @field_validator("password")
    @classmethod
    def strong_password2(cls, v: str):

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
    
class ResendAdminOTPSchema(BaseModel):
    
    email: EmailStr
    password: Password

    @field_validator("password")
    @classmethod
    def strong_password33(cls, v: str):
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
    companyId: str
    email: EmailStr
    password: Password

    @field_validator("password")
    @classmethod
    def strong_password33(cls, v: str):
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
    
class VerifyAdminLoginOtpSchema(BaseModel):
    
    email: EmailStr
    otp: Otp
    password: Password

    @field_validator("password")
    @classmethod
    def strong_password3(cls, v: str):
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
    companyId: str
    email: EmailStr
    otp: Otp
    password: Password

    @field_validator("password")
    @classmethod
    def strong_password3(cls, v: str):
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
    def strong_password4(cls, v: str):
        rules = {
            "lowercase": any(c.islower() for c in v),
            "uppercase": any(c.isupper() for c in v),
            "digit": any(c.isdigit() for c in v),
            "special": any(c in "@$!%*?&#" for c in v),
            "length": len(v) >= 8,
        }

        if not all(rules.values()):
            raise AppException(422,
                "Password must contain uppercase, lowercase, digit, special character and be at least 8 characters long"
            )

        return v
    

class ForgotPasswordSchema(BaseModel):
    companyId: str
    email: EmailStr

    @field_validator("email")
    @classmethod
    def validate_email(cls, v:str):
        if not v:
            raise AppException(422, "Email is required")

        return v

    @field_validator("companyId")
    @classmethod
    def validate_companyId(cls, v:str):
        if not v:
            raise AppException(422, "Company Id field is required")

        return v

class ForgotPassOtpSchema(BaseModel):
    email: EmailStr
    companyId: str
    otp: str
    password: str
    confirmPassword: str

    @model_validator(mode="before")
    @classmethod
    def verify_forgot_pass_schema(cls, values):
        email = values.get("email")
        companyId = values.get("companyId")
        otp = values.get("otp")
        password = values.get("password")
        confirmPassword = values.get("confirmPassword")

        if not email or not companyId or not otp:
            raise AppException(422, f"{"Email" if not email else "companyId" if not companyId else "OTP" if not otp else "Password" if not password else "Confirm Password"} field is missing")

        if len(otp) < 6:
            raise AppException(422, "OTP should be 6 numbers")

        if password != confirmPassword:
            raise AppException(422, "Password and Confirm Password is not same, Please try again")

        rules = {
            "lowercase": any(c.islower() for c in password),
            "uppercase": any(c.isupper() for c in password),
            "digit": any(c.isdigit() for c in password),
            "special": any(c in "@$!%*?&#" for c in password),
            "length": len(password) >= 8,
        }
        
        if not all(rules.values()):
            raise AppException(422,
                "Password must contain uppercase, lowercase, digit, special character and be at least 8 characters long"
            )

        return values


class ResetPasswordByAdminSchema(BaseModel):
    password: Password
    confirmPassword: Password

    @field_validator("password")
    @classmethod
    def strong_password5(cls, v: str):
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
    def strong_password6(cls, v: str):
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
    

class AssignPhoneNumberSchema(BaseModel):
    assignedPhoneNumber: str

    @model_validator(mode="before")
    @classmethod
    def validate_number(cls, values):

        phone = values.get("assignedPhoneNumber")

        if not phone:
            raise AppException(422, "Assigned phone number must required")


        return values

class BulkPermanentDeleteSchema(BaseModel):
    userIds: List[str]

    @field_validator("userIds")
    @classmethod
    def validate_user_ids(cls, v):
        if not v:
            raise ValueError("userIds cannot be empty")
        return v
    

class BulkRestoreUsersSchema(BaseModel):
    userIds: List[str]
 
    @field_validator("userIds")
    @classmethod
    def validate_user_ids(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("userIds cannot be empty")
        return v


class FindMyCompanyId(BaseModel):
    email: EmailStr
    companyName: str

    @model_validator(mode="before")
    @classmethod
    def validate_fields(cls, item):
        email = item.get("email")
        companyName = item.get("companyName")

        if not email or not companyName:
            raise AppException(422, f"{"email" if not email else "companyName"} field required")
    
        return item