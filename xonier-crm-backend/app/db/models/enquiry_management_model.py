from beanie import Document, Link, before_event,Save, Replace, Insert, Indexed
from typing import Optional, Annotated
from app.core.enums import PROJECT_TYPES, SALES_STATUS, PRIORITY, SOURCE
from app.db.models.user_model import UserModel
from datetime import datetime, timedelta, timezone
from pydantic import Field, EmailStr, StringConstraints
from app.core.security import hash_value
from app.core.crypto import encryptor

PhoneNumber = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=10,
        max_length=15,
        pattern=r"^\+?[1-9]\d{9,14}$"
    )
]

class EnquiryModel(Document):
    enquiry_id: str = Indexed(unique=True)
    fullName: str
    email: EmailStr
    phone: PhoneNumber
    companyName: Optional[str] = None
    projectType: PROJECT_TYPES
    status: SALES_STATUS = SALES_STATUS.NEW
    isActive: bool = True
    priority: PRIORITY
    source: SOURCE
    message: Optional[str] = None
    assignTo: Optional[Link[UserModel]] = None
    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None

    class Settings: 
        name = "enquiries"
        use_state_management = True


    @before_event(Save, Replace)
    def update_timestamp_update(self):
        self.updatedAt = datetime.now(timezone.utc)
