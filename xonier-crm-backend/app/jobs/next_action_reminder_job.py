from datetime import datetime, timezone

from pymongo.errors import DuplicateKeyError

from app.core.notification_enum import (
    NOTIFICATION_ENTITY_TYPE, NOTIFICATION_PRIORITY, NOTIFICATION_TYPE,
)
from app.core.tenant import bypass_scope
from app.db.models.next_action_model import NextActionModel
from app.db.models.notification_model import NotificationModel
from app.db.models.user_model import UserModel


async def send_next_action_reminders():
    """Send one in-app reminder when a commercial action becomes due."""
    token = bypass_scope.set(True)
    try:
        now = datetime.now(timezone.utc)
        actions = await NextActionModel.find({
            "dueAt": {"$lte": now}, "completedAt": None, "remindedAt": None,
        }).limit(100).to_list()
        for action in actions:
            owner = await UserModel.find_one({"_id": action.ownerId, "companyId": action.companyId, "deletedAt": None})
            if not owner:
                continue
            try:
                await NotificationModel(
                    companyId=action.companyId,
                    recipientId=owner,
                    type=NOTIFICATION_TYPE.GENERAL,
                    entityType=(NOTIFICATION_ENTITY_TYPE.LEAD if action.entityType == "lead" else NOTIFICATION_ENTITY_TYPE.DEAL),
                    entityId=action.entityId,
                    title="Next action due",
                    body=action.title,
                    priority=NOTIFICATION_PRIORITY.HIGH,
                    metadata={"nextActionId": str(action.id), "kind": action.kind},
                ).insert()
            except DuplicateKeyError:
                pass
            action.remindedAt = now
            await action.save()
    finally:
        bypass_scope.reset(token)
