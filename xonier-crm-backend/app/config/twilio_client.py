from twilio.rest import Client
from app.core.config import get_setting

settings = get_setting()


twilio_client = Client(
    settings.TWILIO_ACCOUNT_SID, settings.TWILIO_ACCOUNT_TOKEN
)

