from beanie import Document, Link, before_event, Insert, Replace, Save
from pydantic import Field, model_validator
from typing import Optional
from datetime import datetime, timezone, date, timedelta
from pymongo import IndexModel


from app.core.enums import QuotationStatus
from app.db.models.deal_model import DealModel
from app.core.crypto import Encryption
from app.core.security import hash_value
from app.db.models.user_model import UserModel


class TaskModel(Document):
    task_id: str                          
    title: str
    description: Optional[str] = None

    # Entity anchor — what this task is about
    entityType: TASK_ENTITY_TYPE          # lead | deal | enquiry | contact | general
    entityId: Optional[str] = None        # the actual lead/deal/enquiry ObjectId
    entityName: Optional[str] = None      # denormalized for display without joins

    # Assignment
    assignedTo: Optional[Link[UserModel]] = None
    assignedBy: Optional[Link[UserModel]] = None
    assignedAt: Optional[datetime] = None

    # Scheduling
    dueDate: Optional[datetime] = None
    reminderAt: Optional[datetime] = None
    completedAt: Optional[datetime] = None

    # Classification
    priority: TASK_PRIORITY               # low | medium | high | urgent
    status: TASK_STATUS                   # todo | in_progress | completed | cancelled | overdue
    category: TASK_CATEGORY               # call | email | meeting | follow_up | demo | proposal | other

    # Recurrence (optional but powerful for follow-ups)
    isRecurring: bool = False
    recurrenceRule: Optional[str] = None  # daily | weekly | monthly

    # Relations
    tags: Optional[List[str]] = []
    attachments: Optional[List[str]] = []  # file URLs

    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    createdAt: datetime
    updatedAt: datetime
    deletedAt: Optional[datetime] = None

    class Settings:
        name = "tasks"
        use_state_management = True