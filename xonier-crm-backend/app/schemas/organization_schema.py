from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


def _clean_nullable_strings(value):
    if not isinstance(value, dict):
        return value
    for k, v in list(value.items()):
        if isinstance(v, str):
            stripped = v.strip()
            value[k] = stripped if stripped else None
    return value


class OrganizationCreateSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    cnpj: Optional[str] = Field(None, max_length=32)
    industry: Optional[str] = Field(None, max_length=100)
    size: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    website: Optional[str] = Field(None, max_length=250)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="before")
    @classmethod
    def clean_empty(cls, value):
        return _clean_nullable_strings(value)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Company name is required")
        return v


class OrganizationUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    cnpj: Optional[str] = Field(None, max_length=32)
    industry: Optional[str] = Field(None, max_length=100)
    size: Optional[str] = Field(None, max_length=50)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    website: Optional[str] = Field(None, max_length=250)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="before")
    @classmethod
    def clean_empty(cls, value):
        return _clean_nullable_strings(value)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("Company name cannot be empty")
        return v


class PersonCreateSchema(BaseModel):
    fullName: str = Field(..., min_length=1, max_length=200)
    organizationId: Optional[str] = None
    title: Optional[str] = Field(None, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    linkedin: Optional[str] = Field(None, max_length=300)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="before")
    @classmethod
    def clean_empty(cls, value):
        return _clean_nullable_strings(value)

    @field_validator("fullName")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Contact name is required")
        return v


class PersonUpdateSchema(BaseModel):
    fullName: Optional[str] = Field(None, min_length=1, max_length=200)
    organizationId: Optional[str] = None
    title: Optional[str] = Field(None, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    linkedin: Optional[str] = Field(None, max_length=300)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="before")
    @classmethod
    def clean_empty(cls, value):
        return _clean_nullable_strings(value)

    @field_validator("fullName")
    @classmethod
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("Contact name cannot be empty")
        return v
