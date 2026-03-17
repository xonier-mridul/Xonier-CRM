
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
import re
from app.utils.custom_exception import AppException


def validate_email_format(email: str) -> bool:
    return bool(re.match(r"^[^@]+@[^@]+\.[^@]+$", email))


class SendEmailSchema(BaseModel):
    template_id: str = Field(..., min_length=1)
    variables: Dict[str, Any] = Field(default={})
    to_emails: List[str] = Field(..., min_length=1)
    cc_emails: Optional[List[str]] = Field(default=[])
    bcc_emails: Optional[List[str]] = Field(default=[])
    reply_to: Optional[str] = None
    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    client_id: Optional[str] = None
    invoice_id: Optional[str] = None
    quotation_id: Optional[str] = None
    prospect_id: Optional[str] = None

    @field_validator("to_emails")
    @classmethod
    def validate_to_emails(cls, v: List[str]) -> List[str]:
        if not v:
            raise AppException(422, "At least one recipient email is required")
        if len(v) > 50:
            raise AppException(422, "Maximum 50 recipients allowed")
        for email in v:
            if not validate_email_format(email):
                raise ValueError(f"Invalid email address: {email}")
        return v

    @field_validator("cc_emails", "bcc_emails")
    @classmethod
    def validate_cc_bcc(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v:
            for email in v:
                if not validate_email_format(email):
                    raise ValueError(f"Invalid email address: {email}")
        return v

    @field_validator("reply_to")
    @classmethod
    def validate_reply_to(cls, v: Optional[str]) -> Optional[str]:
        if v and not validate_email_format(v):
            raise ValueError("Invalid reply_to email address")
        return v


class SendBulkEmailSchema(BaseModel):
    template_id: str = Field(..., min_length=1)
    variables: Dict[str, Any] = Field(default={})
    recipients: List[Dict[str, Any]] = Field(..., min_length=1)
   
    cc_emails: Optional[List[str]] = Field(default=[])
    bcc_emails: Optional[List[str]] = Field(default=[])
    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    client_id: Optional[str] = None
    invoice_id: Optional[str] = None
    quotation_id: Optional[str] = None
    prospect_id: Optional[str] = None

    @field_validator("recipients")
    @classmethod
    def validate_recipients(cls, v: List[Dict]) -> List[Dict]:
        if not v:
            raise ValueError("At least one recipient is required")
        if len(v) > 100:
            raise ValueError("Maximum 100 recipients allowed for bulk send")
        for r in v:
            if "email" not in r:
                raise ValueError("Each recipient must have an email field")
            if not validate_email_format(r["email"]):
                raise ValueError(f"Invalid email: {r['email']}")
        return v


class ResendEmailSchema(BaseModel):
    to_emails: Optional[List[str]] = None
    cc_emails: Optional[List[str]] = Field(default=[])
    bcc_emails: Optional[List[str]] = Field(default=[])

    @field_validator("to_emails")
    @classmethod
    def validate_to_emails(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v:
            if len(v) > 50:
                raise ValueError("Maximum 50 recipients allowed")
            for email in v:
                if not validate_email_format(email):
                    raise ValueError(f"Invalid email address: {email}")
        return v


class UpdateEmailSchema(BaseModel):
    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    client_id: Optional[str] = None
    invoice_id: Optional[str] = None
    quotation_id: Optional[str] = None
    prospect_id: Optional[str] = None

    def has_updates(self) -> bool:
        return any(v is not None for v in self.model_dump().values())


class BulkDeleteEmailSchema(BaseModel):
    ids: List[str] = Field(..., min_length=1)

    @field_validator("ids")
    @classmethod
    def validate_ids(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("At least one id is required")
        if len(v) > 100:
            raise ValueError("Maximum 100 ids allowed")
        if len(v) != len(set(v)):
            raise ValueError("Duplicate ids are not allowed")
        return v