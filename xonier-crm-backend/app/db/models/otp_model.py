from datetime import datetime, timezone, timedelta

from beanie import Document, Indexed, before_event, Save, Replace
from typing import Dict, Annotated, Optional
from pydantic import Field
from app.core.enums import OTP_TYPE
from app.core.enums import OTP_EXPIRY
from app.db.models.base_model import BaseDocument


class OtpModel(Document):
    encrypt_mail:str = Field(...)
    email: str = Field(...)
    otp: str = Field(...)
    encrypt_opt:str = Field(...)
    otp_type: OTP_TYPE = Field(...)
    is_used: bool = False
    # Held only in the short-lived OTP challenge; never registered as a device
    # until password and OTP verification both succeed.
    pendingFcmEncrypted: Optional[str] = None
    loginUserId: Optional[str] = None
    loginCompanyId: Optional[str] = None
    expires_at: Annotated[datetime, Indexed(expireAfterSeconds=0)] = Field(
        default_factory=lambda: datetime.now(timezone.utc) + timedelta(minutes=float(OTP_EXPIRY.TEN_MINUTS.value))
    )
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "otps"
        indexes = [
            [("email", 1), ("otp_type", 1), ("createdAt", -1)]
        ]

    @before_event(Save, Replace)
    def update_timestamp(self):
        self.updatedAt = datetime.now(timezone.utc)

