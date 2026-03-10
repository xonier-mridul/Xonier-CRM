from pydantic import BaseModel, model_validator

from app.utils.custom_exception import AppException



class SEND_SMS_SCHEMA(BaseModel):
    sendTo: str
    message: str


    @model_validator(mode="before")
    @classmethod
    def validate_send_to(cls, value):
        sender = value.get("sendTo")
        message = value.get("message")

        if not sender and not message:
            raise AppException(422, "sendTo field is required")
        
        
        return value
        
        
    


