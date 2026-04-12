
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List
from datetime import datetime, date
from app.core.enums import TASK_REPORT_STATUS, TASK_ITEM_STATUS, WORK_MOOD


class TaskReportItemCreateSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)
    estimatedHours: Optional[float] = Field(None, gt=0, le=24)
    actualHours: Optional[float] = Field(None, gt=0, le=24)
    status: TASK_ITEM_STATUS = TASK_ITEM_STATUS.PENDING
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    linkedTaskId: Optional[str] = None
    blockerReason: Optional[str] = Field(None, max_length=1000)
    completionPercentage: int = Field(default=0, ge=0, le=100)
    

    @model_validator(mode="after")
    def validate_blocker_reason(self) -> "TaskReportItemCreateSchema":
        if self.status == TASK_ITEM_STATUS.BLOCKED and not self.blockerReason:
            raise ValueError("blockerReason is required when status is 'blocked'")
        return self

    @model_validator(mode="after")
    def validate_actual_hours(self) -> "TaskReportItemCreateSchema":
        if self.actualHours and self.status not in [
            TASK_ITEM_STATUS.COMPLETED,
            TASK_ITEM_STATUS.IN_PROGRESS
        ]:
            raise ValueError("actualHours should only be set for in_progress or completed items")
        return self


class TaskReportItemUpdateSchema(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)
    estimatedHours: Optional[float] = Field(None, gt=0, le=24)
    actualHours: Optional[float] = Field(None, gt=0, le=24)
    status: Optional[TASK_ITEM_STATUS] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    linkedTaskId: Optional[str] = None
    blockerReason: Optional[str] = Field(None, max_length=1000)
    completionPercentage: Optional[int] = Field(None, ge=0, le=100)


class MorningAgendaCreateSchema(BaseModel):
    items: List[TaskReportItemCreateSchema] = Field(..., min_length=1)
    goals: Optional[str] = Field(None, max_length=2000)

    @field_validator("items")
    @classmethod
    def validate_items_limit(cls, v):
        if len(v) > 20:
            raise ValueError("Cannot add more than 20 task items in morning agenda")
        return v


class MorningAgendaUpdateSchema(BaseModel):
    items: Optional[List[TaskReportItemCreateSchema]] = None
    goals: Optional[str] = Field(None, max_length=2000)

    @field_validator("items")
    @classmethod
    def validate_items_limit(cls, v):
        if v and len(v) > 20:
            raise ValueError("Cannot add more than 20 task items in morning agenda")
        return v


class EveningReportCreateSchema(BaseModel):
    completedItems: List[TaskReportItemCreateSchema] = Field(default_factory=list)
    pendingItems: List[TaskReportItemCreateSchema] = Field(default_factory=list)
    blockers: Optional[str] = Field(None, max_length=2000)
    achievements: Optional[str] = Field(None, max_length=2000)
    tomorrowPlan: Optional[str] = Field(None, max_length=2000)
    overallMood: Optional[WORK_MOOD] = None

    @model_validator(mode="after")
    def validate_at_least_one_item(self) -> "EveningReportCreateSchema":
        if not self.completedItems and not self.pendingItems:
            raise ValueError("Evening report must have at least one completed or pending item")
        return self

    @field_validator("completedItems")
    @classmethod
    def validate_completed_items_status(cls, v):
        for item in v:
            if item.status != TASK_ITEM_STATUS.COMPLETED:
                raise ValueError(f"Item '{item.title}' in completedItems must have status 'completed'")
        return v

    @field_validator("pendingItems")
    @classmethod
    def validate_pending_items_status(cls, v):
        for item in v:
            if item.status == TASK_ITEM_STATUS.COMPLETED:
                raise ValueError(f"Item '{item.title}' in pendingItems cannot have status 'completed'")
        return v


class EveningReportUpdateSchema(BaseModel):
    completedItems: Optional[List[TaskReportItemCreateSchema]] = None
    pendingItems: Optional[List[TaskReportItemCreateSchema]] = None
    blockers: Optional[str] = Field(None, max_length=2000)
    achievements: Optional[str] = Field(None, max_length=2000)
    tomorrowPlan: Optional[str] = Field(None, max_length=2000)
    overallMood: Optional[WORK_MOOD] = None


# Morning submit now carries the full agenda — report is auto created from this
class SubmitMorningAgendaSchema(BaseModel):
    morningAgenda: MorningAgendaCreateSchema


class UpdateMorningAgendaSchema(BaseModel):
    morningAgenda: MorningAgendaUpdateSchema


class SubmitEveningReportSchema(BaseModel):
    eveningReport: EveningReportCreateSchema


class UpdateEveningReportSchema(BaseModel):
    eveningReport: EveningReportUpdateSchema


class ManagerReviewSchema(BaseModel):
    managerComment: Optional[str] = Field(None, max_length=2000)
    isReviewed: bool = Field(...)

    @field_validator("isReviewed")
    @classmethod
    def must_be_reviewed(cls, v):
        if not v:
            raise ValueError("isReviewed must be True to submit a review")
        return v


class TaskReportItemResponse(BaseModel):
    title: str
    description: Optional[str]
    estimatedHours: Optional[float]
    actualHours: Optional[float]
    status: TASK_ITEM_STATUS
    priority: Optional[str]
    linkedTaskId: Optional[str]
    blockerReason: Optional[str]
    completionPercentage: int


class MorningAgendaResponse(BaseModel):
    items: List[TaskReportItemResponse]
    goals: Optional[str]
    submittedAt: Optional[datetime]
    isSubmitted: bool


class EveningReportResponse(BaseModel):
    completedItems: List[TaskReportItemResponse]
    pendingItems: List[TaskReportItemResponse]
    blockers: Optional[str]
    achievements: Optional[str]
    tomorrowPlan: Optional[str]
    overallMood: Optional[WORK_MOOD]
    submittedAt: Optional[datetime]
    isSubmitted: bool
    totalCompletedHours: Optional[float]
    totalPendingHours: Optional[float]


class TaskReportResponse(BaseModel):
    id: str = Field(alias="_id")
    reportDate: date
    status: TASK_REPORT_STATUS
    morningAgenda: MorningAgendaResponse
    eveningReport: EveningReportResponse
    managerComment: Optional[str]
    managerReviewedAt: Optional[datetime]
    isReviewed: bool
    createdAt: datetime
    updatedAt: datetime

    model_config = {"populate_by_name": True}



class UserTaskReportQuerySchema(BaseModel):
    userIds: str = Field(..., description="Comma separated user ids: id1,id2,id3")
    fromDate: Optional[str] = None
    toDate: Optional[str] = None
    status: Optional[str] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=10, ge=1, le=100)

    @field_validator("userIds")
    @classmethod
    def validate_user_ids(cls, v):
        ids = [uid.strip() for uid in v.split(",") if uid.strip()]
        if not ids:
            raise ValueError("At least one user id is required")
        if len(ids) > 50:
            raise ValueError("Cannot query more than 50 users at once")
        if len(set(ids)) != len(ids):
            raise ValueError("Duplicate user ids are not allowed")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is None:
            return v
        allowed = [
            "morning_pending",
            "evening_pending",
            "completed_pending_review",
            "reviewed",
            "missed"
        ]
        if v not in allowed:
            raise ValueError(f"Invalid status. Allowed: {', '.join(allowed)}")
        return v