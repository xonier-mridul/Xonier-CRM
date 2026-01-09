from jose import jwt, ExpiredSignatureError, JWTError
from  app.core.config import get_setting


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



