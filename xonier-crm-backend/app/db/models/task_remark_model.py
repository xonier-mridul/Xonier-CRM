from beanie import Document, Link, Indexed
from pydantic import Field

from typing import Optional, List
from datetime import datetime, timezone
from app.db.models.user_model import UserModel
from app.db.models.task_model import TaskModel
from pymongo import IndexModel
from app.db.models.base_model import BaseDocument


class TaskRemarkModel(BaseDocument):
    task: Link[TaskModel]
    content: str = Field(..., min_length=1, max_length=5000)
    mentions: Optional[List[Link[UserModel]]] = Field(default_factory=list)
    attachments: Optional[List[str]] = Field(default_factory=list)
    isEdited: bool = False
    createdBy: Link[UserModel]
    acknowledge: bool = False
    acknowledgedBy: Optional[Link[UserModel]] = None
    updatedBy: Optional[Link[UserModel]] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None

    class Settings:
        name = "task_remarks"
        indexes = [
            IndexModel([("task", 1)], name="task_id_index"),
            IndexModel([("createdAt", -1)], name="createdAt_index"),
            IndexModel([("createdBy", 1)], name="createdBy_index"),
        ]