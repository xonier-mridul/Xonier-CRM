import secrets

from app.core.config import get_setting

env = get_setting()

def generate_otp(digit: int = 6) -> int:
    if env.ENV == "development":
        return 123456
    if digit <= 0:
        raise ValueError("digit must be greater than 0")

    start = 10 ** (digit - 1)
    end = (10 ** digit) - 1

    return secrets.randbelow(end - start + 1) + start

