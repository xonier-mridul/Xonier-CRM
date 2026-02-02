from beanie import Document, Link, before_event, Insert, Replace, Save
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone, date, timedelta
from pymongo import IndexModel

from app.core.enums import QuotationStatus
from app.db.models.deal_model import DealModel
from app.core.crypto import Encryption
from app.core.security import hash_value
from app.db.models.user_model import UserModel

encryption = Encryption()


class QuotationModel(Document):
    quoteId: str
    title: Optional[str]
    description: Optional[str]

    deal: Link[DealModel]

    customerId: str
    customerName: str

    customerEmail: str
    customerEmailHash: Optional[str] = None

    customerPhone: Optional[str]
    customerPhoneHash: Optional[str] = None

    companyName: Optional[str]

    subTotal: float
    total: float

    quotationStatus: QuotationStatus = QuotationStatus.SENT

    issueDate: date = Field(default_factory=date.today)
    valid: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=60))

    createdBy: Link[UserModel]
    updatedBy: Link[UserModel]

    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "quotations"
        indexes = [
            IndexModel([("quoteId", 1)], unique=True, name="unique_quote_id"),
            IndexModel([("customerEmailHash", 1)], name="email_hash_idx"),
            IndexModel([("customerPhoneHash", 1)], name="phone_hash_idx"),
        ]


    @before_event(Insert, Replace, Save)
    def secure_sensitive_fields(self):
       
        if not self.customerEmail:
            raise ValueError("Customer email is required")

        email_plain = self.customerEmail.lower()

        
        self.customerEmailHash = hash_value(email_plain)

        
        self.customerEmail = encryption.encrypt_data(email_plain)

        
        if self.customerPhone:
            phone_plain = self.customerPhone
            self.customerPhoneHash = hash_value(phone_plain)
            self.customerPhone = encryption.encrypt_data(phone_plain)

    @before_event(Insert, Replace, Save)
    def update_stamp(self):
        self.updatedAt = datetime.now(timezone.utc)

        



    


