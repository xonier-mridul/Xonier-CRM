from app.core.config import get_setting

settings = get_setting()

JWT_OPTIONS = {
    "httponly": True,
    "secure": True,
    "samesite": "none",
    "path": "/"
}
