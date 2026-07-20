

from pydantic import BaseModel
from typing import Optional, Dict, List



class MonthlyTrendItem(BaseModel):
    month: str
    tasksCompleted: int
    onTimeRate: float
    avgRating: Optional[float] = None


class UserRatingStats(BaseModel):
    totalTasksDone: int
    ratedTasksCount: int
    unratedTasksCount: int
    onTimeTasksCount: int
    overdueTasksCount: int
    onTimeRate: float
    ratingRate: float
    overallRating: Optional[float] = None
    avgActualHours: float
    efficiencyRate: Optional[float] = None
    ratingDistribution: Dict[str, int]
    monthlyTrend: List[MonthlyTrendItem]