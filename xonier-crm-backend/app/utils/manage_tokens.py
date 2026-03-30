from jose import jwt, ExpiredSignatureError, JWTError
from  app.core.config import get_setting
from app.utils.custom_exception import AppException


settings = get_setting()

def verify_access_token(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.ACCESS_TOKEN_SECRET,
            algorithms=[settings.ALGORITHM],
        )
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
        return payload

    except ExpiredSignatureError:
        return AppException(400, "Invalid jwt signature")

    except JWTError:
        return AppException(400, "Invalid refresh token")



