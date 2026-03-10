from app.config.twilio_client import twilio_client
from app.utils.custom_exception import AppException


class TwilioClient:
    def __init__(self):
        pass

    async def send_sms(self, send_to:str, from_to: str, message: str):
        try:
            message = twilio_client.messages.create(
                to=send_to,
                body=message,
                from_= from_to
                )
            
            return message.sid
        

        
        except Exception as e:
            raise e

