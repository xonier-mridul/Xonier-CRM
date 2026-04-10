from beanie import Document, Link, Indexed, before_event
from beanie.odm.actions import Save, Replace
from pydantic import Field, field_validator, BaseModel
from typing import Optional, List
from datetime import datetime, timezone, date
from app.db.models.user_model import UserModel
from app.core.enums import TASK_REPORT_STATUS, TASK_ITEM_STATUS ,WORK_MOOD
from pymongo import IndexModel


class TaskReportItem(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)
    estimatedHours: Optional[float] = Field(None, gt=0, le=24)
    actualHours: Optional[float] = Field(None, gt=0, le=24)
    status: TASK_ITEM_STATUS = TASK_ITEM_STATUS.PENDING
    priority: Optional[str] = None
    linkedTaskId: Optional[str] = None
    blockerReason: Optional[str] = None
    completionPercentage: int = Field(default=0, ge=0, le=100)


class MorningAgenda(BaseModel):
    items: List[TaskReportItem] = Field(default_factory=list)
    goals: Optional[str] = Field(None, max_length=2000)
    submittedAt: Optional[datetime] = None
    isSubmitted: bool = False


class EveningReport(BaseModel):
    completedItems: List[TaskReportItem] = Field(default_factory=list)
    pendingItems: List[TaskReportItem] = Field(default_factory=list)
    blockers: Optional[str] = Field(None, max_length=2000)
    achievements: Optional[str] = Field(None, max_length=2000)
    tomorrowPlan: Optional[str] = Field(None, max_length=2000)
    overallMood: Optional[WORK_MOOD] = None
    submittedAt: Optional[datetime] = None
    isSubmitted: bool = False
    totalCompletedHours: Optional[float] = None
    totalPendingHours: Optional[float] = None


class TaskReportModel(Document):
    reportDate: date
    user: Link[UserModel]

    morningAgenda: MorningAgenda = Field(default_factory=MorningAgenda)
    eveningReport: EveningReport = Field(default_factory=EveningReport)

    status: TASK_REPORT_STATUS = TASK_REPORT_STATUS.MORNING_PENDING

    managerComment: Optional[str] = Field(None, max_length=2000)
    managerReviewedAt: Optional[datetime] = None
    reviewedBy: Optional[Link[UserModel]] = None
    isReviewed: bool = False

    createdBy: Link[UserModel]
    updatedBy: Optional[Link[UserModel]] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deletedAt: Optional[datetime] = None

    class Settings:
        name = "task_reports"
        use_state_management = True
        indexes = [
            IndexModel(
                [("user", 1), ("reportDate", 1)],
                unique=True,
                name="unique_user_report_per_day"
            ),
            IndexModel([("reportDate", -1)], name="reportDate_index"),
            IndexModel([("status", 1)], name="status_index"),
            IndexModel([("user", 1), ("status", 1)], name="user_status_index"),
            IndexModel([("isReviewed", 1)], name="isReviewed_index"),
        ]

    @before_event(Save, Replace)
    def update_timestamp(self):
        self.updatedAt = datetime.now(timezone.utc)

    @before_event(Save, Replace)
    def compute_hours(self):
        if self.eveningReport:
            completed = self.eveningReport.completedItems or []
            pending = self.eveningReport.pendingItems or []
            self.eveningReport.totalCompletedHours = round(
                sum(item.actualHours or 0 for item in completed), 2
            )
            self.eveningReport.totalPendingHours = round(
                sum(item.estimatedHours or 0 for item in pending), 2
            )

    @before_event(Save, Replace)
    def compute_status(self):
        morning_submitted = self.morningAgenda.isSubmitted
        evening_submitted = self.eveningReport.isSubmitted

        if not morning_submitted:
            self.status = TASK_REPORT_STATUS.MORNING_PENDING
        elif morning_submitted and not evening_submitted:
            self.status = TASK_REPORT_STATUS.EVENING_PENDING
        elif morning_submitted and evening_submitted and not self.isReviewed:
            self.status = TASK_REPORT_STATUS.COMPLETED_PENDING_REVIEW
        elif self.isReviewed:
            self.status = TASK_REPORT_STATUS.REVIEWED