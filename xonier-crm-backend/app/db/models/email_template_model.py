
from beanie import Document, Link, before_event, Insert, Replace, Save
from pydantic import Field, field_validator, BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pymongo import IndexModel
from enum import Enum

from app.db.models.user_model import UserModel
from app.core.enums import TemplateCategory, TemplateStatus, TemplateVariable
from app.db.models.base_model import BaseDocument



class EmailTemplateModel(BaseDocument):
    name: str                                        
    slug: str                                        
    description: Optional[str] = None
    category: TemplateCategory = TemplateCategory.CUSTOM
    status: TemplateStatus = TemplateStatus.DRAFT
    subject: str                                     
    html_body: str                                   
    text_body: Optional[str] = None                  
    variables: List[TemplateVariable] = []
    thumbnail_url: Optional[str] = None              
    tags: List[str] = []                            
    usage_count: int = 0                             
    last_used_at: Optional[datetime] = None
    is_global: bool = False                          
    created_by: Link[UserModel]
    updated_by: Optional[Link[UserModel]] = None

    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_by: Optional[Link[UserModel]] = None
    deleted_at: Optional[datetime] = None

    class Settings:
        name = "email_templates"
        indexes = [
            IndexModel([("slug", 1)], unique=True, name="unique_slug"),
            IndexModel([("category", 1)], name="category_idx"),
            IndexModel([("status", 1)], name="status_idx"),
            IndexModel([("is_global", 1)], name="global_idx"),
            IndexModel([("created_by", 1)], name="created_by_idx"),
            IndexModel([("tags", 1)], name="tags_idx"),
            IndexModel([("created_at", -1)], name="created_at_idx"),
        ]

    @field_validator("slug", mode="before")
    @classmethod
    def generate_slug(cls, v, values):
        if not v and "name" in values.data:
            
            return values.data["name"].lower().replace(" ", "-").strip()
        return v

    @before_event(Insert, Replace, Save)
    def update_stamp(self):
        self.updated_at = datetime.now(timezone.utc)