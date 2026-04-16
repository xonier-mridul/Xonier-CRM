from beanie import Document, Link
from pydantic import Field, model_validator
from typing import Dict, Optional, Any, List
from app.db.models.task_model import TaskModel
from app.db.models.user_model import UserModel
from datetime import datetime, timedelta, timezone
from app.utils.custom_exception import AppException


class SubTaskModel(Document):
    taskId: Link[TaskModel]
    title: str
    isCompleted: bool = False
    dueDate: Optional[datetime] = None
    startDate: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    actualHours: Optional[float] = None
    createdBy: Link[UserModel]
    createdAt: datetime = Field(default_factory=lambda: datetime.new(timezone.utc))
    updateAt: Optional[datetime] = None
    order: Optional[int] = 0
    
    deletedAt: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def validate_fields(cls, data: Any):
        due = data.get("dueDate")
        start = data.get("startDate")

        if due and start and (due < start):
            raise AppException(422, "Dua date must be greater then start date")
        
        return data



    




