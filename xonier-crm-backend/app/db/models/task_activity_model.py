from beanie import Document, Link
from pydantic import Field
from app.db.models.task_model import TaskModel
from typing import Optional, Dict, Any
from app.core.enums import TASK_ACTIVITY_ACTION
from app.db.models.user_model import UserModel
from datetime import datetime, timezone
 
 
class TaskActivityModel(Document):
    task: Link[TaskModel]
    action: TASK_ACTIVITY_ACTION
    field: Optional[str] = None
    oldValue: Optional[str] = None
    newValue: Optional[str] = None
    description: str
    metadata: Optional[Dict[str, Any]] = None
    performedBy: Link[UserModel]
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
 
    class Settings:
        name = "task_activities"