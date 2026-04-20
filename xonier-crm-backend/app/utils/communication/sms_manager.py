from app.config.twilio_client import twilio_client
from app.core.config import get_setting

settings = get_setting()

class SMSManager:
    def __init__(self):
        pass

    async def send_sms(self,send_to: str, from_to: str, message: str):

       
        message = twilio_client.messages.create(
                to=send_to,
                body=message,
                from_= from_to,
                status_callback=settings.TWILIO_WEBHOOK_URL_FOR_SMS_STATUS
                # messaging_service_sid=settings.TWILIO_MESSAGE_SID

                )
        
        response = {
            "account_sid": message.account_sid,
            "sid": message.sid,
            "body": message.body,
            "status": message.status,
            "to": message.to,
            "from": message.from_,
            "date_created": str(message.date_created),
            "direction": message.direction,
            "error_code": message.error_code,
            "error_message": message.error_message,
            "price": message.price,
        }
        
            
        return response