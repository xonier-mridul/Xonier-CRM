from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from app.core.enums import TASK_PRIORITY, TASK_ENTITY_TYPE, RECURRENCE_TYPE
from app.utils.custom_exception import AppException
from datetime import datetime


def validate_datetime_field(v: Optional[str], field_name: str) -> Optional[str]:
    if v is None:
        return None
    if not isinstance(v, str) or not v.strip():
        raise AppException(422, f"{field_name} must be a valid ISO datetime string or null")
    try:
        datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v
    except (ValueError, TypeError):
        raise AppException(
            422,
            f"Invalid {field_name} format. Expected ISO 8601 datetime (e.g. 2026-04-02T04:16:04.663+00:00) or null"
        )


class CreateTaskSchema(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    status: Optional[str] = None
    priority: TASK_PRIORITY = TASK_PRIORITY.MEDIUM
    entityType: Optional[TASK_ENTITY_TYPE] = None
    entityId: Optional[str] = None
    entityName: Optional[str] = None
    assignedTo: Optional[List[str]] = []
    dueDate: Optional[str] = None
    startDate: Optional[str] = None
    estimatedHours: Optional[float] = None
    isRecurring: bool = False
    recurrenceType: Optional[RECURRENCE_TYPE] = None
    recurrenceEndsAt: Optional[str] = None
    tags: Optional[List[str]] = []
    attachments: Optional[List[str]] = []
    parentTask: Optional[str] = None
    order: Optional[int] = 0

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v or not v.strip():
            raise AppException(422, "title is required")
        return v.strip()

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if not v or not v.strip():
            raise AppException(422, "category is required")
        return v.strip()

    @field_validator("dueDate", mode="before")
    @classmethod
    def validate_due_date(cls, v: Optional[str]) -> Optional[str]:
        return validate_datetime_field(v, "dueDate")

    @field_validator("startDate", mode="before")
    @classmethod
    def validate_start_date(cls, v: Optional[str]) -> Optional[str]:
        return validate_datetime_field(v, "startDate")

    @field_validator("recurrenceEndsAt", mode="before")
    @classmethod
    def validate_recurrence_ends_at(cls, v: Optional[str]) -> Optional[str]:
        return validate_datetime_field(v, "recurrenceEndsAt")

    @model_validator(mode="after")
    def validate_recurring(self):
        if self.isRecurring and not self.recurrenceType:
            raise AppException(422, "recurrenceType is required when isRecurring is true")
        if self.startDate and self.dueDate:
            try:
                start = datetime.fromisoformat(self.startDate.replace("Z", "+00:00"))
                due = datetime.fromisoformat(self.dueDate.replace("Z", "+00:00"))
                if start > due:
                    raise AppException(422, "startDate cannot be after dueDate")
            except AppException:
                raise
            except Exception:
                pass
        return self


class UpdateTaskSchema(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: str
    status: Optional[str] = None
    priority: Optional[TASK_PRIORITY] = None
    status: Optional[str] = None
    dueDate: Optional[str] = None
    assignedTo: Optional[List[str]] = []
    startDate: Optional[str] = None
    estimatedHours: Optional[float] = None
    actualHours: Optional[float] = None
    isRecurring: Optional[bool] = None
    recurrenceType: Optional[RECURRENCE_TYPE] = None
    recurrenceEndsAt: Optional[str] = None
    tags: Optional[List[str]] = None
    attachments: Optional[List[str]] = None
    entityType: Optional[TASK_ENTITY_TYPE] = None
    entityId: Optional[str] = None
    entityName: Optional[str] = None
    order: Optional[int] = 0

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise AppException(422, "title cannot be empty")
        return v.strip() if v else v

    @field_validator("dueDate", mode="before")
    @classmethod
    def validate_due_date(cls, v: Optional[str]) -> Optional[str]:
        return validate_datetime_field(v, "dueDate")

    @field_validator("startDate", mode="before")
    @classmethod
    def validate_start_date(cls, v: Optional[str]) -> Optional[str]:
        return validate_datetime_field(v, "startDate")

    @field_validator("recurrenceEndsAt", mode="before")
    @classmethod
    def validate_recurrence_ends_at(cls, v: Optional[str]) -> Optional[str]:
        return validate_datetime_field(v, "recurrenceEndsAt")

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.startDate and self.dueDate:
            try:
                start = datetime.fromisoformat(self.startDate.replace("Z", "+00:00"))
                due = datetime.fromisoformat(self.dueDate.replace("Z", "+00:00"))
                if start > due:
                    raise AppException(422, "startDate cannot be after dueDate")
            except AppException:
                raise
            except Exception:
                pass
        return self


class UpdateTaskStatusSchema(BaseModel):
    status: str
    category: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if not v or not v.strip():
            raise AppException(422, "status is required")
        return v.strip()


class UpdateTaskPrioritySchema(BaseModel):
    priority: TASK_PRIORITY


class AssignTaskSchema(BaseModel):
    assignedTo: List[str]

    @field_validator("assignedTo")
    @classmethod
    def validate_assigned_to(cls, v: List[str]) -> List[str]:
        if not v:
            raise AppException(422, "assignedTo list cannot be empty")
        return v


class ReorderTaskSchema(BaseModel):
    tasks: List[dict]

    @model_validator(mode="before")
    @classmethod
    def validate_tasks(cls, value):
        tasks = value.get("tasks", [])
        if not tasks:
            raise AppException(422, "tasks list is required")
        for item in tasks:
            if "id" not in item or "order" not in item:
                raise AppException(422, "Each task must have 'id' and 'order' fields")
        return value


class MoveTaskSchema(BaseModel):
    status: str
    order: Optional[int] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if not v or not v.strip():
            raise AppException(422, "status is required")
        return v.strip()


class BulkAssignTaskSchema(BaseModel):
    taskIds: List[str]
    assignedTo: List[str]

    @model_validator(mode="before")
    @classmethod
    def validate(cls, value):
        if not value.get("taskIds"):
            raise AppException(422, "taskIds are required")
        if not value.get("assignedTo"):
            raise AppException(422, "assignedTo is required")
        return value


class BulkStatusUpdateSchema(BaseModel):
    taskIds: List[str]
    status: str

    @model_validator(mode="before")
    @classmethod
    def validate(cls, value):
        if not value.get("taskIds"):
            raise AppException(422, "taskIds are required")
        if not value.get("status"):
            raise AppException(422, "status is required")
        return value


class AddWatcherSchema(BaseModel):
    userId: str

    @field_validator("userId")
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise AppException(422, "userId is required")
        return v.strip()