import asyncio
import logging
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from bson import ObjectId
from beanie import PydanticObjectId
from app.db.models.task_model import TaskModel
from app.db.models.task_activity_model import TaskActivityModel
from app.utils.enquiry_id_generator import generate_enquiry_id
from app.core.enums import RECURRENCE_TYPE, TASK_ACTIVITY_ACTION

logger = logging.getLogger(__name__)




def calculate_next_date(current_date: datetime, recurrence_type: str) -> datetime:
    if recurrence_type == RECURRENCE_TYPE.DAILY:
        return current_date + timedelta(days=1)
    elif recurrence_type == RECURRENCE_TYPE.WEEKLY:
        return current_date + timedelta(weeks=1)
    elif recurrence_type == RECURRENCE_TYPE.MONTHLY:
        return current_date + relativedelta(months=1)
    else:
        raise ValueError(f"Unknown recurrence type: {recurrence_type}")


def calculate_duration(start: datetime, due: datetime) -> timedelta:
    return due - start




async def process_recurring_tasks():
    logger.info("Starting recurring task scheduler job...")

    now = datetime.now(timezone.utc)
    collection = TaskModel.get_pymongo_collection()
    activity_collection = TaskActivityModel.get_pymongo_collection()

    try:
        
        query = {
            "isRecurring": True,
            "deletedAt": None,
            "dueDate": {"$lt": now},
            "$or": [
                {"recurrenceEndsAt": None},
                {"recurrenceEndsAt": {"$gt": now}}
            ],
            
            "recurringProcessed": {"$ne": True}
        }

        tasks = await collection.find(query).to_list(length=None)
        logger.info(f"Found {len(tasks)} recurring tasks to process")

        created_count = 0
        skipped_count = 0
        error_count = 0

        for task in tasks:
            try:
                task_id = task["_id"]
                recurrence_type = task.get("recurrenceType")
                due_date = task.get("dueDate")
                start_date = task.get("startDate")
                recurrence_ends_at = task.get("recurrenceEndsAt")

                if not recurrence_type or not due_date:
                    logger.warning(f"Task {task_id} missing recurrenceType or dueDate, skipping")
                    skipped_count += 1
                    continue

                
                if due_date.tzinfo is None:
                    due_date = due_date.replace(tzinfo=timezone.utc)

                
                next_due_date = calculate_next_date(due_date, recurrence_type)

                next_start_date = None
                if start_date:
                    if start_date.tzinfo is None:
                        start_date = start_date.replace(tzinfo=timezone.utc)
                    duration = calculate_duration(start_date, due_date)
                    next_start_date = next_due_date - duration

                
                if recurrence_ends_at:
                    if recurrence_ends_at.tzinfo is None:
                        recurrence_ends_at = recurrence_ends_at.replace(tzinfo=timezone.utc)
                    if next_due_date > recurrence_ends_at:
                        logger.info(f"Task {task_id} recurrence has ended, marking as non-recurring")
                        await collection.update_one(
                            {"_id": task_id},
                            {"$set": {
                                "isRecurring": False,
                                "recurringProcessed": True,
                                "updatedAt": now
                            }}
                        )
                        skipped_count += 1
                        continue

                
                existing_next = await collection.find_one({
                    "parentRecurringId": task_id,
                    "dueDate": next_due_date,
                    "deletedAt": None
                })

                if existing_next:
                    logger.info(f"Next occurrence for task {task_id} already exists, skipping")
                    await collection.update_one(
                        {"_id": task_id},
                        {"$set": {"recurringProcessed": True, "updatedAt": now}}
                    )
                    skipped_count += 1
                    continue

                
                new_task_id = generate_enquiry_id("TASK")

                new_task = {
                    "task_id": new_task_id,
                    "title": task.get("title"),
                    "description": task.get("description"),
                    "category": task.get("category"),
                    "status": task.get("status"),
                    "priority": task.get("priority"),
                    "entityType": task.get("entityType"),
                    "entityId": task.get("entityId"),
                    "entityName": task.get("entityName"),
                    "assignedTo": task.get("assignedTo", []),
                    "assignedBy": task.get("assignedBy"),
                    "assignedAt": task.get("assignedAt"),
                    "dueDate": next_due_date,
                    "startDate": next_start_date,
                    "estimatedHours": task.get("estimatedHours"),
                    "isRecurring": True,
                    "recurrenceType": recurrence_type,
                    "recurrenceEndsAt": task.get("recurrenceEndsAt"),
                    "tags": task.get("tags", []),
                    "watchers": task.get("watchers", []),
                    "attachments": task.get("attachments", []),
                    "parentTask": task.get("parentTask"),
                    "parentRecurringId": task_id,  # track origin
                    "order": task.get("order", 0),
                    "isOverdue": False,
                    "completedAt": None,
                    "actualHours": None,
                    "actualDays": None,
                    "rating": None,
                    "createdBy": task.get("createdBy"),
                    "updatedBy": None,
                    "createdAt": now,
                    "updatedAt": now,
                    "deletedAt": None,
                    "recurringProcessed": False,
                }

                
                await collection.insert_one(new_task)

                
                await collection.update_one(
                    {"_id": task_id},
                    {"$set": {
                        "recurringProcessed": True,
                        "updatedAt": now
                    }}
                )

                
                await activity_collection.insert_one({
                    "task": task_id,
                    "action": TASK_ACTIVITY_ACTION.RECURRING_CREATED,
                    "field": None,
                    "oldValue": None,
                    "newValue": new_task_id,
                    "description": f"Recurring task auto-created: {new_task_id}",
                    "metadata": {
                        "originalTaskId": str(task_id),
                        "newTaskId": new_task_id,
                        "recurrenceType": recurrence_type,
                        "nextDueDate": next_due_date.isoformat()
                    },
                    "performedBy": task.get("createdBy"),
                    "createdAt": now
                })

                created_count += 1
                logger.info(f"Created recurring task {new_task_id} from {task_id}")

            except Exception as task_error:
                error_count += 1
                logger.error(f"Error processing recurring task {task.get('_id')}: {task_error}")
                continue

        logger.info(
            f"Recurring task job completed — "
            f"created: {created_count}, skipped: {skipped_count}, errors: {error_count}"
        )

    except Exception as e:
        logger.error(f"Recurring task scheduler job failed: {e}")
        raise




async def handle_recurring_on_completion(task: dict, now: datetime):
    """
    Call this from move_task service when isFinal=True and task.isRecurring=True
    This creates the next occurrence immediately on completion
    rather than waiting for the nightly scheduler.
    """
    collection = TaskModel.get_pymongo_collection()
    activity_collection = TaskActivityModel.get_pymongo_collection()

    recurrence_type = task.get("recurrenceType")
    due_date = task.get("dueDate")
    recurrence_ends_at = task.get("recurrenceEndsAt")

    if not recurrence_type or not due_date:
        return

    if due_date.tzinfo is None:
        due_date = due_date.replace(tzinfo=timezone.utc)

    next_due_date = calculate_next_date(due_date, recurrence_type)

    if recurrence_ends_at:
        if recurrence_ends_at.tzinfo is None:
            recurrence_ends_at = recurrence_ends_at.replace(tzinfo=timezone.utc)
        if next_due_date > recurrence_ends_at:
            await collection.update_one(
                {"_id": task["_id"]},
                {"$set": {"isRecurring": False, "updatedAt": now}}
            )
            return

    existing_next = await collection.find_one({
        "parentRecurringId": task["_id"],
        "dueDate": next_due_date,
        "deletedAt": None
    })

    if existing_next:
        return

    start_date = task.get("startDate")
    next_start_date = None
    if start_date:
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        duration = calculate_duration(start_date, due_date)
        next_start_date = next_due_date - duration

    new_task_id = generate_enquiry_id("TASK")

    new_task = {
        "task_id": new_task_id,
        "title": task.get("title"),
        "description": task.get("description"),
        "category": task.get("category"),
        "status": task.get("status"),
        "priority": task.get("priority"),
        "entityType": task.get("entityType"),
        "entityId": task.get("entityId"),
        "entityName": task.get("entityName"),
        "assignedTo": task.get("assignedTo", []),
        "assignedBy": task.get("assignedBy"),
        "assignedAt": task.get("assignedAt"),
        "dueDate": next_due_date,
        "startDate": next_start_date,
        "estimatedHours": task.get("estimatedHours"),
        "isRecurring": True,
        "recurrenceType": recurrence_type,
        "recurrenceEndsAt": task.get("recurrenceEndsAt"),
        "tags": task.get("tags", []),
        "watchers": task.get("watchers", []),
        "attachments": task.get("attachments", []),
        "parentTask": task.get("parentTask"),
        "parentRecurringId": task["_id"],
        "order": task.get("order", 0),
        "isOverdue": False,
        "completedAt": None,
        "actualHours": None,
        "actualDays": None,
        "rating": None,
        "createdBy": task.get("createdBy"),
        "updatedBy": None,
        "createdAt": now,
        "updatedAt": now,
        "deletedAt": None,
        "recurringProcessed": False,
    }

    await collection.insert_one(new_task)

    await collection.update_one(
        {"_id": task["_id"]},
        {"$set": {"recurringProcessed": True, "updatedAt": now}}
    )

    await activity_collection.insert_one({
        "task": task["_id"],
        "action": TASK_ACTIVITY_ACTION.RECURRING_CREATED,
        "field": None,
        "oldValue": None,
        "newValue": new_task_id,
        "description": f"Next recurring task auto-created on completion: {new_task_id}",
        "metadata": {
            "originalTaskId": str(task["_id"]),
            "newTaskId": new_task_id,
            "recurrenceType": recurrence_type,
            "nextDueDate": next_due_date.isoformat(),
            "triggeredBy": "completion"
        },
        "performedBy": task.get("createdBy"),
        "createdAt": now
    })

    logger.info(f"Recurring task {new_task_id} created on completion of {task['_id']}")



class RecurringTaskScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler(timezone="UTC")

    def start(self):
        
        self.scheduler.add_job(
            process_recurring_tasks,
            trigger=CronTrigger(hour=0, minute=0, second=0),
            id="recurring_task_job",
            name="Process Recurring Tasks",
            replace_existing=True,
            max_instances=1,  
            misfire_grace_time=3600  
        )

        
        self.scheduler.add_job(
            process_recurring_tasks,
            trigger=CronTrigger(hour=12, minute=0, second=0),
            id="recurring_task_job_noon",
            name="Process Recurring Tasks (Noon Safety Net)",
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=3600
        )

        self.scheduler.start()
        logger.info("Recurring task scheduler started")

    def stop(self):
        self.scheduler.shutdown(wait=False)
        logger.info("Recurring task scheduler stopped")


recurring_scheduler = RecurringTaskScheduler()