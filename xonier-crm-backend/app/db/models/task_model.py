 
from beanie import Document, Link, Indexed, before_event
from beanie.odm.actions import Save, Replace
from pydantic import Field
from typing import Optional, List
from datetime import datetime, timezone
from app.db.models.user_model import UserModel
from app.db.models.task_category_model import TaskCategoryModel
from app.db.models.task_status_model import TaskStatusModel
from app.core.enums import TASK_PRIORITY, TASK_ENTITY_TYPE, RECURRENCE_TYPE
 
 
class TaskModel(Document):
    task_id: str = Indexed(unique=True)
    title: str
    description: Optional[str] = None
 
    category: Link[TaskCategoryModel]
    status: Link[TaskStatusModel]
    priority: TASK_PRIORITY = TASK_PRIORITY.MEDIUM
 
    entityType: Optional[TASK_ENTITY_TYPE] = None
    entityId: Optional[str] = None
    entityName: Optional[str] = None
 
    assignedTo: Optional[List[Link[UserModel]]] = Field(default_factory=list)
    assignedBy: Optional[Link[UserModel]] = None
    assignedAt: Optional[datetime] = None
 
    dueDate: Optional[datetime] = None
    startDate: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    estimatedHours: Optional[float] = None
    actualHours: Optional[float] = None
 
    isRecurring: bool = False
    recurrenceType: Optional[RECURRENCE_TYPE] = None
    recurrenceEndsAt: Optional[datetime] = None
 
    tags: Optional[List[str]] = Field(default_factory=list)
    watchers: Optional[List[Link[UserModel]]] = Field(default_factory=list)
    attachments: Optional[List[str]] = Field(default_factory=list)
 
    parentTask: Optional[Link["TaskModel"]] = None
    order: int = 0
    isOverdue: bool = False
 
    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None
 
    class Settings:
        name = "tasks"
        use_state_management = True
 
    @before_event(Save, Replace)
    def update_timestamp(self):
        self.updatedAt = datetime.now(timezone.utc)


    
 