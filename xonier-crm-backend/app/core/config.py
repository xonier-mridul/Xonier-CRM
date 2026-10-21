from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator
from typing import Literal



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
    AUTH_ACCESS_SECONDS: int = Field(900, ge=60, le=3600)
    AUTH_OTP_SECONDS: int = Field(600, ge=60, le=900)
    AUTH_OTP_MAX_ATTEMPTS: int = Field(5, ge=1, le=10)
    AUTH_TAKEOVER_COOLDOWN_SECONDS: int = Field(300, ge=0)
    AUTH_TAKEOVER_WINDOW_SECONDS: int = Field(1800, ge=60)
    AUTH_TAKEOVER_MAX: int = Field(3, ge=1, le=100)
    AUTH_TAKEOVER_LOCK_SECONDS: int = Field(1800, ge=0)
    AUTH_REFRESH_GRACE_SECONDS: int = Field(10, ge=0, le=30)

    # Durable MongoDB outbox. Local dev runs consumers with the API; production
    # uses independently supervised worker processes.
    MAIL_WORKER_MODE: Literal["auto", "external", "embedded"] = "auto"
    # auto captures locally in development, real TLS SMTP everywhere else.
    MAIL_DELIVERY_MODE: Literal["auto", "smtp", "mailpit"] = "auto"
    MAIL_DEV_SMTP_PORT: int = Field(1025, ge=1, le=65535)
    MAIL_SMTP_TLS: Literal["auto", "tls", "starttls"] = "auto"
    MAIL_SMTP_TIMEOUT_SECONDS: int = Field(30, ge=5, le=120)
    MAIL_LEASE_SECONDS: int = Field(180, ge=30)
    MAIL_MAX_ATTEMPTS: int = Field(6, ge=1, le=20)
    MAIL_MAX_MESSAGE_BYTES: int = Field(1024 * 1024, ge=1024, le=10 * 1024 * 1024)
    MAIL_RATE_PER_SECOND: int = Field(5, ge=1)
    MAIL_WORKER_CONCURRENCY: int = Field(2, ge=1, le=20)
    MAIL_RETENTION_DAYS: int = Field(30, ge=1, le=365)

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

    @model_validator(mode="after")
    def validate_development_mail(self):
        development = self.ENV.strip().lower() in {"development", "dev", "local"}
        if not development and self.MAIL_DELIVERY_MODE == "mailpit":
            raise ValueError("Mailpit is development-only; use MAIL_DELIVERY_MODE=smtp in production")
        if not development and self.MAIL_WORKER_MODE == "embedded":
            raise ValueError("Embedded mail workers are development-only; use MAIL_WORKER_MODE=external in production")
        return self



    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )



@lru_cache
def get_setting()->EnvSettings:
    return EnvSettings()
