from beanie import Document, Link, Indexed, before_event
from beanie.odm.actions import Save, Replace
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone
from app.db.models.user_model import UserModel
from app.db.models.task_category_model import TaskCategoryModel
from app.core.enums import TASK_STATUS_TYPE
 
 
class TaskStatusModel(Document):
    status_id: str = Indexed(unique=True)
    name: str
    slug: str
    color: str = "#6B7280"
    category: Link[TaskCategoryModel]
    order: int = 0
    type: TASK_STATUS_TYPE = TASK_STATUS_TYPE.NOT_STARTED
    isFinal: bool = False
    isDefault: bool = False
    isActive: bool = True
    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None
 
    class Settings:
        name = "task_statuses"
        use_state_management = True
 
    @before_event(Save, Replace)
    def update_timestamp(self):
        self.updatedAt = datetime.now(timezone.utc)
 
