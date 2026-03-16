
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from enum import Enum
import re
from app.core.enums import TemplateCategory, TemplateStatus
from app.utils.custom_exception import AppException




class TemplateVariableSchema(BaseModel):
    key: str = Field(..., min_length=1, max_length=50)
    label: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    default_value: Optional[str] = Field(None, max_length=255)
    is_required: bool = False

    @field_validator("key")
    @classmethod
    def validate_key(cls, v: str) -> str:
        
        if not re.match(r"^[a-z][a-z0-9_]*$", v):
            raise AppException(422,
                "Variable key must be snake_case (e.g: customer_name)"
            )
        return v.strip()



class CreateEmailTemplateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: TemplateCategory = TemplateCategory.CUSTOM
    status: TemplateStatus = TemplateStatus.DRAFT

    subject: str = Field(..., min_length=2, max_length=255)
    html_body: str = Field(..., min_length=10)
    text_body: Optional[str] = Field(None)

    variables: Optional[List[TemplateVariableSchema]] = Field(default=[])

    thumbnail_url: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = Field(default=[])
    is_global: bool = False

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise AppException(422,"Template name cannot be empty")
        return v

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise AppException(422, "Subject cannot be empty")
        return v

    @field_validator("html_body")
    @classmethod
    def validate_html_body(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise AppException(422, "HTML body cannot be empty")
        
        if not re.search(r"<[^>]+>", v):
            raise AppException(422, "HTML body must contain valid HTML")
        return v

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        if len(v) > 10:
            raise AppException(422,"Maximum 10 tags allowed")
        
        return [tag.strip().lower() for tag in v if tag.strip()]

    @field_validator("variables")
    @classmethod
    def validate_variables(cls, v: List[TemplateVariableSchema]) -> List[TemplateVariableSchema]:
        if len(v) > 50:
            raise AppException(422,"Maximum 50 variables allowed")

        
        keys = [var.key for var in v]
        if len(keys) != len(set(keys)):
            raise AppException(422,"Duplicate variable keys are not allowed")

        return v

    @field_validator("thumbnail_url")
    @classmethod
    def validate_thumbnail_url(cls, v: Optional[str]) -> Optional[str]:
        if v and not re.match(r"^https?://", v):
            raise AppException(422,"Thumbnail URL must be a valid URL starting with http/https")
        return v

    @model_validator(mode="after")
    def validate_variables_in_template(self):
        
        if self.variables and self.html_body:
            for var in self.variables:
                pattern = r"\{\{\s*" + re.escape(var.key) + r"\s*\}\}"
                if not re.search(pattern, self.html_body):
                    raise AppException(422,
                        f"Variable '{{{{ {var.key} }}}}' is defined but not used in html_body"
                    )
        return self



class UpdateEmailTemplateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[TemplateCategory] = None
    status: Optional[TemplateStatus] = None


    subject: Optional[str] = Field(None, min_length=2, max_length=255)
    html_body: Optional[str] = Field(None, min_length=10)
    text_body: Optional[str] = None


    variables: Optional[List[TemplateVariableSchema]] = None

    thumbnail_url: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    is_global: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise AppException(422,"Template name cannot be empty")
        return v

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise AppException(422, "Subject cannot be empty")
        return v

    @field_validator("html_body")
    @classmethod
    def validate_html_body(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not re.search(r"<[^>]+>", v):
                raise AppException(422, "HTML body must contain valid HTML")
        return v

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            if len(v) > 10:
                raise AppException(422,"Maximum 10 tags allowed")
            return [tag.strip().lower() for tag in v if tag.strip()]
        return v

    @field_validator("variables")
    @classmethod
    def validate_variables(cls, v: Optional[List[TemplateVariableSchema]]) -> Optional[List[TemplateVariableSchema]]:
        if v is not None:
            if len(v) > 50:
                raise AppException(422, "Maximum 50 variables allowed")
            keys = [var.key for var in v]
            if len(keys) != len(set(keys)):
                raise AppException(422, "Duplicate variable keys are not allowed")
        return v

    @field_validator("thumbnail_url")
    @classmethod
    def validate_thumbnail_url(cls, v: Optional[str]) -> Optional[str]:
        if v and not re.match(r"^https?://", v):
            raise AppException(422, "Thumbnail URL must be a valid URL")
        return v

    @model_validator(mode="after")
    def validate_variables_in_template(self):
        """Check variables exist in html_body only if both are provided in update"""
        if self.variables and self.html_body:
            for var in self.variables:
                pattern = r"\{\{\s*" + re.escape(var.key) + r"\s*\}\}"
                if not re.search(pattern, self.html_body):
                    raise AppException(422,
                        f"Variable '{{{{ {var.key} }}}}' is defined but not used in html_body"
                    )
        return self

    def has_updates(self) -> bool:
        
        return any(v is not None for v in self.model_dump().values())



class SendEmailWithTemplateSchema(BaseModel):
    template_id: str = Field(..., min_length=1)
    variables: dict = Field(default={})
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
            if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
                raise AppException(422, f"Invalid email address: {email}")
        return v

    @field_validator("cc_emails", "bcc_emails")
    @classmethod
    def validate_cc_bcc(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v:
            for email in v:
                if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email):
                    raise AppException(422, f"Invalid email address: {email}")
        return v

    @field_validator("reply_to")
    @classmethod
    def validate_reply_to(cls, v: Optional[str]) -> Optional[str]:
        if v and not re.match(r"^[^@]+@[^@]+\.[^@]+$", v):
            raise AppException(422,"Invalid reply_to email address")
        return v


class BulkDeleteEmailTemplateSchema(BaseModel):
    ids: List[str] = Field(..., min_length=1)

    @field_validator("ids")
    @classmethod
    def validate_ids(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("At least one id is required")
        if len(v) > 100:
            raise ValueError("Maximum 100 ids allowed at once")
        
        if len(v) != len(set(v)):
            raise ValueError("Duplicate ids are not allowed")
        return v