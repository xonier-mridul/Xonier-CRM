from beanie import Document, Indexed, Link, before_event
from beanie.odm.actions import Save, Replace, Insert
from pydantic import Field, field_validator
from typing import Optional, List, TYPE_CHECKING
from app.core.security import hash_password, hash_value, verify_password

from app.core.crypto import encryptor

from app.core.enums import USER_STATUS
from app.core.config import get_setting

from datetime import datetime, timezone, timedelta
from jose import jwt


EnvSettings = get_setting()

class UserModel(Document):
    firstName: str = Field(..., min_length=5, max_length=49)
    lastName: Optional[str] = Field(None, max_length=49)
    email: str = Field(...)
    hashedEmail: str = Indexed(unique=True)
    phone: str = Field(...)
    hashedPhone: str = Indexed(unique=True) 
    password: str = Field(...)
    isEmailVerified: bool = False
    status: USER_STATUS = Field(default=USER_STATUS.ACTIVE)
    userRole: List[Link["UserRoleModel"]] = Field(default_factory=list)
    company: str = Field(...)
    isActive: bool = False
    lastLogin: Optional[datetime] = None
    refreshToken: Optional[str] = None
    createdBy: Optional[Link["UserModel"]] = None
    updatedBy: Optional[Link["UserModel"]] = None
    deletedBy: Optional[Link["UserModel"]] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None

    class Settings: 
        name = "users"
        use_state_management = True

    

    @before_event(Insert, Replace, Save)
    def hash_password(self):
        if self.password:
            if self.id is None:
                self.password = hash_password(self.password)
                return
            
            if "password" in self.get_changes():
                if not self.password.startswith("$2b$"):
                    self.password = hash_password(self.password)
            

    @before_event(Insert, Replace, Save)
    def encrypt_email(self):
        if not self.email:
            return

        if self.id is None:
            plain_email = self.email.lower()
            self.hashedEmail = hash_value(plain_email)
            self.email = encryptor.encrypt_data(plain_email)
            return

        if "email" in self.get_changes():
            plain_email:str = self.email.lower()
            self.hashedEmail = hash_value(plain_email)
            self.email = encryptor.encrypt_data(plain_email)

    
    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str):
        rules = {
            "lowercase": any(c.islower() for c in v),
            "uppercase": any(c.isupper() for c in v),
            "digit": any(c.isdigit() for c in v),
            "special": any(c in "@$!%*?&#" for c in v),
            "length": len(v) >= 8,
        }

        if not all(rules.values()):
            raise ValueError(
                "Password must contain uppercase, lowercase, digit, special character and be at least 8 characters long"
            )

        return v


    @before_event(Insert, Replace, Save)
    def encrypt_phone(self):
        if not self.phone:
            return
        
        if self.id is None:
            plain_phone = self.phone
            self.phone = encryptor.encrypt_data(plain_phone)
            self.hashedPhone = hash_value(plain_phone)
            return
        
        if "phone" in self.get_changes():
            plain_phone = self.phone
            self.phone = encryptor.encrypt_data(plain_phone)
            self.hashedPhone = hash_value(plain_phone)
            

    @before_event(Save, Replace)
    def update_timestamp_update(self):
        self.updatedAt = datetime.now(timezone.utc)

    def compare_password(self, password: str)-> bool:
        return verify_password(password, self.password)
    
    def generate_access_token(self):
        expire = datetime.now(timezone.utc) + timedelta(days=float(EnvSettings.ACCESS_TOKEN_EXPIRY))
        payload = {
            "_id": str(self.id),
            "hashEmail": self.hashedEmail,
            "iat": datetime.now(timezone.utc),
            "exp": expire,
            "type": "access"
        }

        return jwt.encode(payload, EnvSettings.ACCESS_TOKEN_SECRET, algorithm="HS256")
    
    def generate_refresh_token(self):
        expire = datetime.now(timezone.utc) + timedelta(days=float(EnvSettings.REFRESH_TOKEN_EXPIRY))
        payload = {
            "_id": str(self.id),
            "hashEmail": self.hashedEmail,
            "iat": datetime.now(timezone.utc),
            "exp": expire,
            "type": "refresh"
        }

        return jwt.encode(payload, EnvSettings.REFRESH_TOKEN_SECRET, algorithm="HS256")
    



from app.db.models.user_roles_model import UserRoleModel
UserModel.model_rebuild()



