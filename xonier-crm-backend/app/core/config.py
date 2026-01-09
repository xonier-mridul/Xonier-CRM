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

    #SMTP
    EMAIL_HOST: str
    EMAIL_USER: str
    EMAIL_PASS: str
    EMAIL_PORT: str
    FROM_EMAIL: str


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    

@lru_cache
def get_setting()->EnvSettings:
    return EnvSettings()
