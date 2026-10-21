from jose import jwt, ExpiredSignatureError, JWTError
from  app.core.config import get_setting
from app.utils.custom_exception import AppException
from bson import ObjectId


settings = get_setting()

def verify_access_token(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.ACCESS_TOKEN_SECRET,
            algorithms=[settings.ALGORITHM],
        )
        if (payload.get("type") != "access" or not payload.get("sid") or not ObjectId.is_valid(payload.get("_id", ""))
                or payload.get("sessionType") not in {"web", "mobile"}):
            return None
        return payload

    except ExpiredSignatureError:
        return None  

    except JWTError:
        return None
    
def verify_refresh_token(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.REFRESH_TOKEN_SECRET,
            algorithms=[settings.ALGORITHM],
        )
        if (payload.get("type") != "refresh" or not payload.get("sid") or not ObjectId.is_valid(payload.get("_id", ""))
                or payload.get("sessionType") not in {"web", "mobile"}):
            raise AppException(401, "Invalid refresh token", clear_cookies=True, code="SESSION_EXPIRED")
        return payload

    except ExpiredSignatureError:
        raise AppException(401, "Refresh token expired", clear_cookies=True, code="SESSION_EXPIRED")

    except JWTError:
        raise AppException(401, "Invalid refresh token", clear_cookies=True, code="SESSION_EXPIRED")



