from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict



class EnvSettings(BaseSettings):
    # App
    PROJECT_NAME: str
    ENV: str

    # Database
    MONGO_URI: str
    DATABASE_NAME: str


    # Client
    CLIENT_URL: str
    # CLIENT_URL_ALT: str


    # Security
    FERNET_SECRET_KEY: str


    # jwt
    ACCESS_TOKEN_SECRET:str
    ACCESS_TOKEN_EXPIRY:str
    REFRESH_TOKEN_SECRET:str
    REFRESH_TOKEN_EXPIRY:str
    ALGORITHM:str
    SECRET_KEY:str

    #SMTP
    EMAIL_HOST: str
    EMAIL_USER: str
    EMAIL_PASS: str
    EMAIL_PORT: str
    FROM_EMAIL: str


    # RAdis

    REDIS_HOST:str
    REDIS_PORT:int

    # TWILIO

    TWILIO_ACCOUNT_SID: str
    TWILIO_ACCOUNT_TOKEN: str
    TWILIO_MESSAGE_SID: str
    TWILIO_WEBHOOK_URL_FOR_SMS_STATUS: str


    # PayPal
    PAYPAL_CLIENT_ID: str
    PAYPAL_CLIENT_SECRET: str
    PAYPAL_MODE: str = "sandbox"  # sandbox | live
    PAYPAL_WEBHOOK_ID: str

    # Per-agent Gmail OAuth. Configure once for the CRM, not per agent.
    GMAIL_CLIENT_ID: str = ""
    GMAIL_CLIENT_SECRET: str = ""
    GMAIL_REDIRECT_URI: str = "http://localhost:8000/api/gmail/oauth/callback"

    # One Microsoft app supports Outlook.com/Hotmail/Live and Microsoft 365.
    MICROSOFT_MAIL_CLIENT_ID: str = ""
    MICROSOFT_MAIL_CLIENT_SECRET: str = ""
    MICROSOFT_MAIL_REDIRECT_URI: str = "http://localhost:8000/api/mail/oauth/microsoft/callback"

    # Optional QR-linked WhatsApp worker (private network only).
    WHATSAPP_BRIDGE_URL: str = "http://127.0.0.1:3101"
    WHATSAPP_BRIDGE_SECRET: str = ""

    # Team chat. Media/storage integrations are optional until configured.
    CHAT_ENABLED: bool = True
    CHAT_REDIS_URL: str = ""
    CHAT_ALLOWED_ORIGINS: str = ""
    CHAT_MAX_MEMBERS: int = 100
    CHAT_MAX_FILE_BYTES: int = 25 * 1024 * 1024
    CHAT_S3_BUCKET: str = ""
    CHAT_S3_REGION: str = "ap-south-1"
    CHAT_CLAMAV_HOST: str = ""
    CHAT_CLAMAV_PORT: int = 3310
    LIVEKIT_URL: str = ""
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""
    CHAT_MAX_CALL_PARTICIPANTS: int = 16
# Optional until Google Calendar sync is configured in Google Cloud.
    GOOGLE_CALENDAR_CLIENT_ID: Optional[str] = None
    GOOGLE_CALENDAR_CLIENT_SECRET: Optional[str] = None
    GOOGLE_CALENDAR_REDIRECT_URI: Optional[str] = None
    # Enable only after a rotated service account is installed server-side via
    # GOOGLE_APPLICATION_CREDENTIALS and FCM HTTP v1 is configured.
    FOLLOW_UP_PUSH_ENABLED: bool = True
    FCM_PROJECT_ID: str = "trakeroo"
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None



    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )



@lru_cache
def get_setting()->EnvSettings:
    return EnvSettings()
