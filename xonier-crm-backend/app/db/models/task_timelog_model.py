
from beanie import Document, Link, before_event, Insert, Save
from pydantic import Field, BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from pymongo import IndexModel
from app.db.models.task_model import TaskModel
from app.db.models.user_model import UserModel
from app.core.enums import TIMELOG_STATUS
from app.db.models.base_model import BaseDocument


class TimeSegment(BaseModel):
    startedAt: datetime
    pausedAt: Optional[datetime] = None
    durationSeconds: int = 0


class TaskTimeLogModel(BaseDocument):
    task: Link[TaskModel]
    user: Link[UserModel]

    status: TIMELOG_STATUS = TIMELOG_STATUS.PAUSED

    segments: List[TimeSegment] = Field(default_factory=list)

    totalSeconds: int = Field(default=0)

    startedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pausedAt: Optional[datetime] = None
    resumedAt: Optional[datetime] = None
    stoppedAt: Optional[datetime] = None

    note: Optional[str] = None

    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "task_timelogs"
        indexes = [
            IndexModel([("task", 1)], name="task_idx"),
            IndexModel([("user", 1)], name="user_idx"),
            IndexModel([("status", 1)], name="status_idx"),
            IndexModel([("task", 1), ("user", 1), ("status", 1)], name="task_user_status_idx"),
            IndexModel([("createdAt", -1)], name="created_at_idx"),
        ]

    @before_event(Insert, Save)
    def update_stamp(self):
        self.updatedAt = datetime.now(timezone.utc)