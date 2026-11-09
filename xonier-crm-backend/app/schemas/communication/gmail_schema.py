from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class GmailSend(BaseModel):
    requestId: UUID
    to: list[EmailStr] = Field(min_length=1, max_length=20)
    cc: list[EmailStr] = Field(default_factory=list, max_length=20)
    bcc: list[EmailStr] = Field(default_factory=list, max_length=20)
    subject: str = Field(min_length=1, max_length=250)
    body: str = Field(min_length=1, max_length=100000)
    leadId: str | None = Field(default=None, pattern=r"^[a-f0-9]{24}$")

    @field_validator('subject')
    @classmethod
    def safe_subject(cls, value):
        if '\r' in value or '\n' in value or not value.strip():
            raise ValueError('Enter a subject without line breaks')
        return value.strip()

    @field_validator('body')
    @classmethod
    def nonempty_body(cls, value):
        if not value.strip():
            raise ValueError('Enter a message')
        return value

    @model_validator(mode='after')
    def recipient_limit(self):
        if len(self.to) + len(self.cc) + len(self.bcc) > 20:
            raise ValueError('Maximum 20 recipients per email')
        return self
