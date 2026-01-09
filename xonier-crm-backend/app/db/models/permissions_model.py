
from beanie import Document, Indexed
from pydantic import Field
from datetime import datetime, timezone
from typing import Optional

class PermissionModel(Document):
    code: str = Indexed(unique=True)   
    module: str                        
    action: str  
    title: str                     
    description: str
    is_active: bool = True
    deleted_at: Optional[datetime] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "permissions"
        indexes = [
        "module",
        "is_active"
    ]
