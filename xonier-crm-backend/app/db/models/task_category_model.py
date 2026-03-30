from beanie import Document, Link, Indexed, before_event
from beanie.odm.actions import Save, Replace
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone
from app.db.models.user_model import UserModel
from app.core.enums import CATEGORY_VISIBILITY

 
 
class TaskCategoryModel(Document):
    category_id: str = Indexed(unique=True)
    name: str
    slug: str = Indexed(unique=True)
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    isDefault: bool = False
    isActive: bool = True
    visibility: CATEGORY_VISIBILITY = CATEGORY_VISIBILITY.GLOBAL
    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None
 
    class Settings:
        name = "task_categories"
        use_state_management = True
 
    @before_event(Save, Replace)
    def update_timestamp(self):
        self.updatedAt = datetime.now(timezone.utc)
 