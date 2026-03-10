from pydantic import BaseModel, model_validator
from app.utils.custom_exception import AppException
import re


class TelephoneRegisterSchema(BaseModel):
    phoneNumber: str
    


    @model_validator(mode="before")
    @classmethod
    def validate_number(cls, values):

        phone = values.get("phoneNumber")

        pattern = r"^\+?[1-9]\d{9,14}$"

        if not re.match(pattern, phone):
            raise AppException(422, "Invalid phone number format")

        return values


    
    
