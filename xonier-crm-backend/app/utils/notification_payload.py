from typing import Optional, Dict, Any
from beanie import PydanticObjectId
from app.core.notification_enum import (
    NOTIFICATION_TYPE,
    NOTIFICATION_ENTITY_TYPE,
    NOTIFICATION_PRIORITY,
)
from app.config.notification_config import render_notification


def build_notification_payload(
    recipient_id: PydanticObjectId,
    notification_type: NOTIFICATION_TYPE,
    entity_type: NOTIFICATION_ENTITY_TYPE,
    variables: Optional[Dict[str, Any]] = None,
    sender_id: Optional[PydanticObjectId] = None,
    entity_id: Optional[PydanticObjectId] = None,
    priority: Optional[NOTIFICATION_PRIORITY] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    variables = variables or {}
    title, body = render_notification(notification_type, variables)

    from app.config.notification_config import get_notification_template
    template = get_notification_template(notification_type)

    return {
        "recipientId": recipient_id,
        "senderId": sender_id,
        "type": notification_type,
        "entityType": entity_type,
        "entityId": entity_id,
        "title": title,
        "body": body,
        "priority": priority or template.priority,
        "metadata": metadata,
    }


def build_bulk_notification_payloads(
    recipient_ids: list[PydanticObjectId],
    notification_type: NOTIFICATION_TYPE,
    entity_type: NOTIFICATION_ENTITY_TYPE,
    variables: Optional[Dict[str, Any]] = None,
    sender_id: Optional[PydanticObjectId] = None,
    entity_id: Optional[PydanticObjectId] = None,
    priority: Optional[NOTIFICATION_PRIORITY] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> list[Dict[str, Any]]:
    return [
        build_notification_payload(
            recipient_id=rid,
            notification_type=notification_type,
            entity_type=entity_type,
            variables=variables,
            sender_id=sender_id,
            entity_id=entity_id,
            priority=priority,
            metadata=metadata,
        )
        for rid in recipient_ids
    ]