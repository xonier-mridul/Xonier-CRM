"""Non-secret settings for isolated tests/previews; no real CRM .env is needed."""
import base64
import os


def seed_test_settings():
    defaults = {
        "PROJECT_NAME": "Trakeroo isolated tests", "ENV": "test",
        "MONGO_URI": "mongodb://127.0.0.1:27029", "DATABASE_NAME": "chat_test_unused",
        "CLIENT_URL": "http://localhost:3100", "CHAT_ENABLED": "true",
        "FERNET_SECRET_KEY": base64.urlsafe_b64encode(b"0" * 32).decode(),
        "ACCESS_TOKEN_SECRET": "test-only-access-secret-do-not-use-in-production",
        "ACCESS_TOKEN_EXPIRY": "1", "REFRESH_TOKEN_SECRET": "test-only-refresh-secret",
        "REFRESH_TOKEN_EXPIRY": "1", "ALGORITHM": "HS256", "SECRET_KEY": "test-only",
        "EMAIL_HOST": "localhost", "EMAIL_USER": "test", "EMAIL_PASS": "test",
        "EMAIL_PORT": "1025", "FROM_EMAIL": "test@example.test",
        "REDIS_HOST": "127.0.0.1", "REDIS_PORT": "6379", "CHAT_REDIS_URL": "",
        "TWILIO_ACCOUNT_SID": "test", "TWILIO_ACCOUNT_TOKEN": "test",
        "TWILIO_MESSAGE_SID": "test", "TWILIO_WEBHOOK_URL_FOR_SMS_STATUS": "http://localhost",
        "PAYPAL_CLIENT_ID": "test", "PAYPAL_CLIENT_SECRET": "test", "PAYPAL_WEBHOOK_ID": "test",
        "CHAT_S3_BUCKET": "", "CHAT_CLAMAV_HOST": "",
        "LIVEKIT_URL": "", "LIVEKIT_API_KEY": "", "LIVEKIT_API_SECRET": "",
    }
    for key, value in defaults.items():
        os.environ.setdefault(key, value)
    # Even inherited integration credentials must never enable paid/external
    # services in a synthetic fixture. These changes affect this test process only.
    for key in ("CHAT_S3_BUCKET", "CHAT_CLAMAV_HOST", "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "CHAT_REDIS_URL"):
        os.environ[key] = ""
