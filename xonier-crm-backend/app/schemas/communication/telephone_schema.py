from pydantic import BaseModel, model_validator
from app.utils.custom_exception import AppException
from app.core.enums import PHONE_NUMBER_STATUS
import re


class TelephoneRegisterSchema(BaseModel):
    phoneNumber: str
    


    @model_validator(mode="before")
    @classmethod
    def validate_number(cls, values):

        phone = values.get("phoneNumber")

        if not phone:
            raise AppException(422, "Phone number field must required")

        pattern = r"^\+?[1-9]\d{6,14}$"

        if not re.match(pattern, phone):
            raise AppException(422, "Invalid phone number format")

        return values


class TelephoneUpdateStatusSchema(BaseModel):
    status: PHONE_NUMBER_STATUS


    @model_validator(mode="before")
    @classmethod
    def validate_status(cls, value):

        status = value.get("status")

        if not status:
            raise AppException(422, "Status field must required")
        
        return value

    
    
