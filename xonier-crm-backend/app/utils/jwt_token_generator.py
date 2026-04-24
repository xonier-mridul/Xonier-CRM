from jose import jwt
from app.core.config import get_setting
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta

settings = get_setting()


def create_token(payload: Dict[str, Any], algorithm: str = settings.ALGORITHM, expiry:Optional[int] = 1, type:Optional[str] = None)->str:
    expire = datetime.now(timezone.utc) + timedelta(days=expiry)
    payload = {
        **payload,
        "iat": datetime.now(timezone.utc),
        "exp": expire,
        "type": type
    }

    
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=algorithm)


def verify_token(token: str, algorithm: str = settings.ALGORITHM):
    return jwt.decode(token=token, key=settings.SECRET_KEY, algorithms=algorithm)