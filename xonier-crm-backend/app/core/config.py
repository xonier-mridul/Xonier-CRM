from functools import lru_cache
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



    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )



@lru_cache
def get_setting()->EnvSettings:
    return EnvSettings()
