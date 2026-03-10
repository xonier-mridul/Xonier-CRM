from pydantic import BaseModel



class SEND_SMS_SCHEMA(BaseModel):
    send_to: str
    message: str
    


