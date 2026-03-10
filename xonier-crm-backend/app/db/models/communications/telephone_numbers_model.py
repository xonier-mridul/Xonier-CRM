from typing import Optional, TYPE_CHECKING
from beanie import Document, Link
from pydantic import Field, model_validator
from datetime import datetime, timezone
from app.core.enums import PHONE_NUMBER_STATUS
from app.utils.custom_exception import AppException
import re
from pymongo import IndexModel

if TYPE_CHECKING:
    from app.db.models.user_model import UserModel  


class TelephoneNumbersModel(Document):
    phoneNumber: str
    status: PHONE_NUMBER_STATUS = PHONE_NUMBER_STATUS.ACTIVE
    createdBy: Link["UserModel"]          
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None
    deletedBy: Optional[Link["UserModel"]] = None  

    class Settings:
        name = "telephones"
        use_state_management = True
        indexes = [
            IndexModel(
                [("phoneNumber", 1)],
                unique=True,
                name="unique_phone_number"
            )
        ]

    @model_validator(mode="before")
    @classmethod
    def validate_number(cls, values):
        phone = values.get("phoneNumber")
        pattern = r"^\+?[1-9]\d{5,14}$"
        if not re.match(pattern, phone):
            raise AppException(422, "Invalid phone number format")
        return values



from app.db.models.user_model import UserModel
TelephoneNumbersModel.model_rebuild()