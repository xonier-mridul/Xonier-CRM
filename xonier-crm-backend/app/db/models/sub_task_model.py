from beanie import Document, Link
from pydantic import Field, model_validator
from typing import Dict, Optional, Any, List
from app.db.models.task_model import TaskModel
from app.db.models.user_model import UserModel
from datetime import datetime, timedelta, timezone
from app.utils.custom_exception import AppException
from pymongo import IndexModel
from app.db.models.base_model import BaseDocument


class SubTaskModel(BaseDocument):
    taskId: Link[TaskModel]
    title: str
    isCompleted: bool = False
    dueDate: Optional[datetime] = None
    startDate: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    completedBy: Optional[Link[UserModel]] = None
    actualHours: Optional[float] = None
    createdBy: Link[UserModel]
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updateAt: Optional[datetime] = None
    order: Optional[int] = 0
    
    deletedAt: Optional[datetime] = None

    class Settings:
        name = "sub_tasks"
        indexes = [
            # IndexModel(["taskId",1], name="task_id")
        ]


    @model_validator(mode="before")
    @classmethod
    def validate_fields(cls, data: Any):
        due = data.get("dueDate")
        start = data.get("startDate")

        if due and start and (due < start):
            raise AppException(422, "Dua date must be greater then start date")
        
        return data



    




