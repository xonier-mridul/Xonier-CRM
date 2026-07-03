from datetime import datetime, timezone, timedelta
from app.repositories.event_repository import EventRepository
from app.services.notification_service import NotificationService
from app.core.notification_enum import NOTIFICATION_TYPE, NOTIFICATION_ENTITY_TYPE
from app.core.tenant import bypass_scope
from beanie import PydanticObjectId


async def send_event_reminders():
    try:
        repo = EventRepository()
        notification_service = NotificationService()

        now = datetime.now(timezone.utc)
        reminder_window_start = now + timedelta(minutes=25)
        reminder_window_end = now + timedelta(minutes=35)

        token = bypass_scope.set(True)
        try:
            upcoming_events = await repo.find(
                filter={
                    "start": {
                        "$gte": reminder_window_start,
                        "$lte": reminder_window_end,
                    },
                    "isAllDay": False,
                }
            )
        finally:
            bypass_scope.reset(token)

        for event in upcoming_events:
            await notification_service.send(
                recipient_id=PydanticObjectId(event.createdBy.ref.id),
                notification_type=NOTIFICATION_TYPE.EVENT_REMINDER,
                entity_type=NOTIFICATION_ENTITY_TYPE.EVENT,
                entity_id=PydanticObjectId(event.id),
                variables={
                    "title": event.title,
                    "start": event.start.strftime("%I:%M %p"),
                },
                metadata={
                    "eventType": event.eventType,
                    "start": str(event.start),
                },
            )

    except Exception as e:
        print(f"Event reminder job failed: {e}")