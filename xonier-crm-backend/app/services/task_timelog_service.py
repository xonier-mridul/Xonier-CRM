from app.repositories.task_timelog_repository import TaskTimeLogRepository
from app.repositories.task_repository import TaskRepository
from app.repositories.task_activity_repository import TaskActivityRepository
from beanie import PydanticObjectId
from bson import ObjectId
from app.core.enums import TIMELOG_STATUS, TASK_ACTIVITY_ACTION
from typing import Dict, Any, Optional
from app.utils.custom_exception import AppException
from datetime import datetime, timezone
from app.db.models.task_timelog_model import TaskTimeLogModel, TimeSegment


def _timer_activity(task_id, action, performer_id, description, old_val=None, new_val=None, metadata=None):
    return {
        "task": PydanticObjectId(task_id),
        "action": action,
        "field": "timer",
        "oldValue": str(old_val) if old_val is not None else None,
        "newValue": str(new_val) if new_val is not None else None,
        "description": description,
        "metadata": metadata,
        "performedBy": PydanticObjectId(performer_id),
    }


def _format_seconds(total_seconds: int) -> str:
    h = total_seconds // 3600
    m = (total_seconds % 3600) // 60
    s = total_seconds % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def _extract_id(assignee) -> str:
    # Beanie Link (not yet fetched): exposes ref.id which is the raw ObjectId
    if hasattr(assignee, "ref") and hasattr(assignee.ref, "id"):
        return str(assignee.ref.id)
    # Fully populated Beanie Document: has .id directly
    if hasattr(assignee, "id") and assignee.id is not None:
        return str(assignee.id)
    # Raw ObjectId or string fallback
    return str(assignee)


def _is_assigned(task, user_id: str) -> bool:
    for assignee in (task.assignedTo or []):
        if _extract_id(assignee) == str(user_id):
            return True
    return False


class TimeLogService:
    def __init__(self):
        self.repo = TaskTimeLogRepository()
        self.taskRepo = TaskRepository()
        self.activityRepo = TaskActivityRepository()

    async def start(self, task_id: str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(task_id):
                raise AppException(400, "Invalid task id")

            task = await self.taskRepo.find_by_id(PydanticObjectId(task_id))
            if not task:
                raise AppException(404, "Task not found")

            if not _is_assigned(task, user["_id"]):
                raise AppException(403, "Only assigned users can start a timer on this task")

            existing = await self.repo.find_one({
                "task.$id": PydanticObjectId(task_id),
                "user.$id": PydanticObjectId(user["_id"]),
                "status": {"$in": [TIMELOG_STATUS.RUNNING.value, TIMELOG_STATUS.PAUSED.value]}
            })

            if existing:
                raise AppException(400, "Timer already active for this task — pause or stop it first")

            now = datetime.now(timezone.utc)

            log = TaskTimeLogModel(
                task=PydanticObjectId(task_id),
                user=PydanticObjectId(user["_id"]),
                status=TIMELOG_STATUS.RUNNING,
                startedAt=now,
                segments=[TimeSegment(startedAt=now)]
            )

            await log.insert()

            activity = _timer_activity(
                task_id=task_id,
                action=TASK_ACTIVITY_ACTION.TIMER_STARTED,
                performer_id=user["_id"],
                description=f"Timer started on task '{task.title}'",
                new_val=TIMELOG_STATUS.RUNNING.value,
                metadata={
                    "logId": str(log.id),
                    "startedAt": now.isoformat(),
                }
            )
            await self.activityRepo.create(data=activity)

            return log.model_dump(mode="json")

        except AppException as e:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")


    async def pause(self, log_id: str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(log_id):
                raise AppException(400, "Invalid log id")

            log = await self.repo.find_by_id(PydanticObjectId(log_id), populate=["task", "user"])

            if not log:
                raise AppException(404, "Timer not found")

            if str(log.user.id) != str(user["_id"]):
                raise AppException(403, "Permission denied")

            if not _is_assigned(log.task, user["_id"]):
                raise AppException(403, "Only assigned users can pause a timer on this task")

            if log.status == TIMELOG_STATUS.PAUSED:
                raise AppException(400, "Timer is already paused")

            if log.status == TIMELOG_STATUS.STOPPED:
                raise AppException(400, "Timer is already stopped")

            if log.status != TIMELOG_STATUS.RUNNING:
                raise AppException(400, "Timer is not running")

            now = datetime.now(timezone.utc)

            if log.segments:
                last = log.segments[-1]
                if last.pausedAt is None:
                    last.pausedAt = now
                    started_at = last.startedAt
                    if started_at.tzinfo is None:
                        started_at = started_at.replace(tzinfo=timezone.utc)
                    last.durationSeconds = int((now - started_at).total_seconds())

            log.status = TIMELOG_STATUS.PAUSED
            log.pausedAt = now
            log.totalSeconds = sum(s.durationSeconds for s in log.segments)

            await log.save()

            task_id = str(log.task.id) if hasattr(log.task, "id") else str(log.task)
            task_title = log.task.title if hasattr(log.task, "title") else "Unknown"

            activity = _timer_activity(
                task_id=task_id,
                action=TASK_ACTIVITY_ACTION.TIMER_PAUSED,
                performer_id=user["_id"],
                description=f"Timer paused on task '{task_title}'",
                old_val=TIMELOG_STATUS.RUNNING.value,
                new_val=TIMELOG_STATUS.PAUSED.value,
                metadata={
                    "logId": log_id,
                    "pausedAt": now.isoformat(),
                    "elapsedSeconds": log.totalSeconds,
                    "formattedElapsed": _format_seconds(log.totalSeconds),
                }
            )
            await self.activityRepo.create(data=activity)

            return log.model_dump(mode="json")

        except AppException as e:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")


    async def resume(self, log_id: str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(log_id):
                raise AppException(400, "Invalid log id")

            log = await self.repo.find_by_id(PydanticObjectId(log_id), populate=["task", "user"])

            if not log:
                raise AppException(404, "Timer not found")

            if str(log.user.id) != str(user["_id"]):
                raise AppException(403, "Permission denied")

            if not _is_assigned(log.task, user["_id"]):
                raise AppException(403, "Only assigned users can resume a timer on this task")

            if log.status == TIMELOG_STATUS.RUNNING:
                raise AppException(400, "Timer is already running")

            if log.status == TIMELOG_STATUS.STOPPED:
                raise AppException(400, "Cannot resume a stopped timer")

            if log.status != TIMELOG_STATUS.PAUSED:
                raise AppException(400, "Timer is not paused")

            now = datetime.now(timezone.utc)

            log.segments.append(TimeSegment(startedAt=now))
            log.status = TIMELOG_STATUS.RUNNING
            log.resumedAt = now
            log.pausedAt = None

            await log.save()

            task_id = str(log.task.id) if hasattr(log.task, "id") else str(log.task)
            task_title = log.task.title if hasattr(log.task, "title") else "Unknown"

            activity = _timer_activity(
                task_id=task_id,
                action=TASK_ACTIVITY_ACTION.TIMER_RESUMED,
                performer_id=user["_id"],
                description=f"Timer resumed on task '{task_title}'",
                old_val=TIMELOG_STATUS.PAUSED.value,
                new_val=TIMELOG_STATUS.RUNNING.value,
                metadata={
                    "logId": log_id,
                    "resumedAt": now.isoformat(),
                    "committedSeconds": log.totalSeconds,
                    "formattedCommitted": _format_seconds(log.totalSeconds),
                    "sessionCount": len(log.segments),
                }
            )
            await self.activityRepo.create(data=activity)

            return log.model_dump(mode="json")

        except AppException as e:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")


    async def stop(self, log_id: str, user: Dict[str, Any], note: Optional[str] = None):
        try:
            if not ObjectId.is_valid(log_id):
                raise AppException(400, "Invalid log id")

            log = await self.repo.find_by_id(PydanticObjectId(log_id), populate=["task", "user"])

            if not log:
                raise AppException(404, "Timer not found")

            if str(log.user.id) != str(user["_id"]):
                raise AppException(403, "Permission denied")

            if not _is_assigned(log.task, user["_id"]):
                raise AppException(403, "Only assigned users can stop a timer on this task")

            if log.status == TIMELOG_STATUS.STOPPED:
                raise AppException(400, "Timer is already stopped")

            now = datetime.now(timezone.utc)
            
            if log.status == TIMELOG_STATUS.RUNNING and log.segments:
                last = log.segments[-1]
                if last.pausedAt is None:
                    last.pausedAt = now

                    started_at = last.startedAt
                    if started_at.tzinfo is None:
                        started_at = started_at.replace(tzinfo=timezone.utc)

                    last.durationSeconds = int((now - started_at).total_seconds())
            
            log.status = TIMELOG_STATUS.STOPPED
            log.stoppedAt = now
            log.totalSeconds = sum(s.durationSeconds for s in log.segments)
           
            if note and note.strip():
                log.note = note.strip()

            await log.save()

            task_id = str(log.task.id) if hasattr(log.task, "id") else str(log.task)
            task_title = log.task.title if hasattr(log.task, "title") else "Unknown"
            formatted = _format_seconds(log.totalSeconds)

            activity = _timer_activity(
                task_id=task_id,
                action=TASK_ACTIVITY_ACTION.TIMER_STOPPED,
                performer_id=user["_id"],
                description=f"Timer stopped on task '{task_title}' — {formatted} logged",
                old_val=TIMELOG_STATUS.RUNNING.value,
                new_val=TIMELOG_STATUS.STOPPED.value,
                metadata={
                    "logId": log_id,
                    "stoppedAt": now.isoformat(),
                    "totalSeconds": log.totalSeconds,
                    "formattedTotal": formatted,
                    "sessionCount": len(log.segments),
                    "note": log.note,
                }
            )
            await self.activityRepo.create(data=activity)

            result = log.model_dump(mode="json")
            result["formattedTotal"] = formatted

            return result

        except AppException as e:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")


    async def get_by_task(self, task_id: str):
        try:
            if not ObjectId.is_valid(task_id):
                raise AppException(400, "Invalid task id")

            task = await self.taskRepo.find_by_id(PydanticObjectId(task_id))
            if not task:
                raise AppException(404, "Task not found")

            logs = await TaskTimeLogModel.find(
                {"task.$id": PydanticObjectId(task_id)},
                fetch_links=True
            ).sort("-createdAt").to_list()

            total_seconds = sum(log.totalSeconds for log in logs)

            serialized = []
            for log in logs:
                entry = log.model_dump(mode="json")
                entry["formattedTotal"] = _format_seconds(log.totalSeconds)
                serialized.append(entry)

            return {
                "logs": serialized,
                "totalSeconds": total_seconds,
                "formattedTotal": _format_seconds(total_seconds),
                "totalSessions": len(logs),
            }

        except AppException as e:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")


    async def get_active_timer(self, task_id: str, user: Dict[str, Any]):
        try:
            if not ObjectId.is_valid(task_id):
                raise AppException(400, "Invalid task id")

            log = await self.repo.find_one(
                filter={
                    "task.$id": PydanticObjectId(task_id),
                    "user.$id": PydanticObjectId(user["_id"]),
                    "status": {"$in": [TIMELOG_STATUS.RUNNING.value, TIMELOG_STATUS.PAUSED.value, TIMELOG_STATUS.STOPPED.value]}
                },
                populate=["user", "task"]
            )

            if isinstance(log, list):
                log = log[0] if log else None

            if not log:
                return None

            result = log.model_dump(mode="json")

            def to_utc(dt: datetime) -> datetime:
                if dt.tzinfo is None:
                    return dt.replace(tzinfo=timezone.utc)
                return dt

            if log.status == TIMELOG_STATUS.RUNNING and log.segments:
                last = log.segments[-1]
                started_at = to_utc(last.startedAt)
                live_seconds = int(
                    (datetime.now(timezone.utc) - started_at).total_seconds()
                )
                current_total = log.totalSeconds + live_seconds
            else:
                current_total = log.totalSeconds

            result["currentSeconds"] = current_total
            result["formattedCurrent"] = _format_seconds(current_total)

            return result

        except AppException as e:
            raise

        except Exception as e:
            raise AppException(500, f"Internal server error: {e}")