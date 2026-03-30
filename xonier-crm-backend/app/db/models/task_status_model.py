from beanie import Document, Indexed, Link
from typing import Optional
from app.db.models.task_category_model import TaskCategoryModel
from app.db.models.user_model import UserModel
from pydantic import Field, field_validator
from datetime import datetime, timezone, date, timedelta
from app.core.enums import TASK_STATUS_TYPE


class TaskStatusModel(Document):
    status_id: str                     
    name: str                           
    slug: str                           
    color: str                   
    
    category: Link[TaskCategoryModel]   
    
    order: int = 0                      
    
    type: TASK_STATUS_TYPE             
    
    isFinal: bool = False               
    isDefault: bool = False             
    isActive: bool = True

    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    createdAt: datetime =  Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime
    deletedAt: Optional[datetime] = None

    class Settings:
        name = "task_statuses"
        use_state_management = True


   


