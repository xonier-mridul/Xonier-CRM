import calendar
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict, Any, List
from app.utils.custom_exception import AppException


def compute_date_range(
    date_filter: Optional[str],
    start_date_str: Optional[str],
    end_date_str: Optional[str],
) -> Tuple[Optional[datetime], Optional[datetime]]:
    now = datetime.now(timezone.utc)

    if date_filter == "today":
        start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
        return start, now

    if date_filter == "week":
        return now - timedelta(days=7), now

    if date_filter == "month":
        return datetime(now.year, now.month, 1, tzinfo=timezone.utc), now

    if date_filter == "year":
        return datetime(now.year, 1, 1, tzinfo=timezone.utc), now

    if date_filter == "custom":
        if not start_date_str or not end_date_str:
            raise AppException(400, "startDate and endDate are required for custom filter")
        try:
            start = datetime.fromisoformat(start_date_str).replace(tzinfo=timezone.utc)
            end = datetime.fromisoformat(end_date_str).replace(tzinfo=timezone.utc)
        except ValueError:
            raise AppException(400, "Invalid date format. Use YYYY-MM-DD")

        if start > end:
            raise AppException(400, "startDate cannot be after endDate")

        return start, end

    return None, None  # "all"


def apply_rating_filter(task_filter: Dict[str, Any], rating_filter: Optional[str]) -> None:
    if not rating_filter or rating_filter == "all":
        return
    if rating_filter == "rated":
        task_filter["rating"] = {"$ne": None}
    elif rating_filter == "unrated":
        task_filter["rating"] = None
    elif rating_filter in {"1", "2", "3", "4", "5"}:
        task_filter["rating"] = int(rating_filter)


def apply_on_time_filter(task_filter: Dict[str, Any], on_time_filter: Optional[str]) -> None:
    if not on_time_filter or on_time_filter == "all":
        return
    task_filter["isOverdue"] = on_time_filter == "overdue"


def _add_months(dt: datetime, months: int) -> datetime:
    month_index = dt.month - 1 + months
    year = dt.year + month_index // 12
    month = month_index % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def generate_month_buckets(months_back: int) -> List[str]:
    now = datetime.now(timezone.utc)
    start = _add_months(now.replace(day=1), -(months_back - 1))
    buckets = []
    cursor = start
    for _ in range(months_back):
        buckets.append(cursor.strftime("%Y-%m"))
        cursor = _add_months(cursor, 1)
    return buckets


def get_trend_start_date(months_back: int) -> datetime:
    now = datetime.now(timezone.utc)
    return _add_months(now.replace(day=1), -(months_back - 1))