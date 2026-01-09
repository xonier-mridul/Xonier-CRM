
from app.core.config import get_setting

EnvSettings = get_setting()

EMAIL_HOST = EnvSettings.EMAIL_HOST
EMAIL_PORT = EnvSettings.EMAIL_PORT
EMAIL_USER = EnvSettings.EMAIL_USER
EMAIL_PASS = EnvSettings.EMAIL_PASS
FROM_EMAIL = EnvSettings.FROM_EMAIL