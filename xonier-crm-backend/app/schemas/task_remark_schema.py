from pydantic import model_validator, field_validator, Field
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from app.utils.custom_exception import AppException



class CreateTaskRemarkSchema(BaseModel):
    
    content: str 
    mentions: Optional[List[str]] = Field(default_factory=list)
    attachments: Optional[List[str]] = Field(default_factory=list)
   
    



    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Content cannot be empty or whitespace")
        return v.strip()

    @field_validator("mentions")
    @classmethod
    def validate_mentions(cls, v: List[str]) -> List[str]:
        from bson import ObjectId
        for item in v:
            if not ObjectId.is_valid(item):
                raise ValueError(f"Invalid mention user id: {item}")
        return v

    @field_validator("attachments")
    @classmethod
    def validate_attachments(cls, v: List[str]) -> List[str]:
        for item in v:
            if not item.strip():
                raise ValueError("Attachment path cannot be empty")
        return v
    
class UpdateAcknowledgeRemark(BaseModel):
    acknowledge: bool

    @model_validator(mode="before")
    @classmethod
    def validate_acknowledge(cls, values):
        if values.get("acknowledge") is not True:
            raise ValueError("Acknowledge must be true")
        return values