from app.config.twilio_client import twilio_client

class SMSManager:
    def __init__(self):
        pass

    async def send_sms(send_to: str, from_to: str, message: str):
        message = twilio_client.messages.create(
                to=send_to,
                body=message,
                from_= from_to
                )
            
            return message.sid