from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone
from app.db import db  
from app.utils.recurring import should_generate, create_new_task_instance  

scheduler = BackgroundScheduler()


async def generate_recurring_tasks():
    print("Running recurring task job...")

    now = datetime.now(timezone.utc)

    tasks = await db.tasks.find({"recurring": True}).to_list(None)

    created_count = 0

    for task in tasks:
        if should_generate(task, now):
            await create_new_task_instance(task)
            created_count += 1

    print(f"Created {created_count} recurring tasks")


def start_scheduler():
    scheduler.add_job(
        lambda: run_async(generate_recurring_tasks),
        trigger="cron",
        hour=0,
        minute=0,
    )
    scheduler.start()


# Helper to run async in scheduler
import asyncio

def run_async(func):
    loop = asyncio.get_event_loop()
    if loop.is_running():
        asyncio.create_task(func())
    else:
        loop.run_until_complete(func())