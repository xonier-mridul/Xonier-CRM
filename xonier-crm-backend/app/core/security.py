from passlib.context import CryptContext
import hashlib

context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# passwords

def hash_password(password: str)-> str:
    return context.hash(password)

def verify_password(password: str, hashed: str)-> str:
    return context.verify(password, hashed)


# hash values

def hash_value(value: str)->str:
    return hashlib.sha256(value.lower().encode()).hexdigest()

