from beanie import Document, Link, before_event, Insert, Replace, Save
from pydantic import Field, model_validator
from typing import Optional
from datetime import datetime, timezone, date, timedelta
from pymongo import IndexModel
from typing import List

from app.core.enums import QuotationStatus, TASK_ACTIVITY_ACTION, TASK_ENTITY_TYPE, TASK_PRIORITY, TASK_STATUS_TYPE, RECURRENCE_TYPE
from app.db.models.deal_model import DealModel
from app.core.crypto import Encryption
from app.core.security import hash_value
from app.db.models.user_model import UserModel
from app.db.models.task_category_model import TaskCategoryModel
from app.db.models.task_status_model import TaskStatusModel



class TaskModel(Document):
    task_id: str                        
    title: str
    description: Optional[str] = None

    
    category: Link[TaskCategoryModel]
    status: Link[TaskStatusModel]
    priority: TASK_PRIORITY             

  
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
    
    parentTask: Optional[Link["TaskModel"]] = None   

    order: int = 0                      

    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    createdAt: datetime
    updatedAt: datetime
    deletedAt: Optional[datetime] = None

    class Settings:
        name = "tasks"
        use_state_management = True