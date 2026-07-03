from pydantic import BaseModel
from app.core.notification_enum import NOTIFICATION_TYPE, NOTIFICATION_PRIORITY


class NotificationTemplate(BaseModel):
    title: str
    body: str
    priority: NOTIFICATION_PRIORITY = NOTIFICATION_PRIORITY.LOW


NOTIFICATION_TEMPLATES: dict[NOTIFICATION_TYPE, NotificationTemplate] = {
    NOTIFICATION_TYPE.EVENT_CREATED: NotificationTemplate(
        title="New Event Created",
        body="A new event '{title}' has been scheduled for {start}.",
        priority=NOTIFICATION_PRIORITY.MEDIUM,
    ),
    NOTIFICATION_TYPE.EVENT_UPDATED: NotificationTemplate(
        title="Event Updated",
        body="The event '{title}' has been updated.",
        priority=NOTIFICATION_PRIORITY.LOW,
    ),
    NOTIFICATION_TYPE.EVENT_DELETED: NotificationTemplate(
        title="Event Deleted",
        body="The event '{title}' has been deleted.",
        priority=NOTIFICATION_PRIORITY.LOW,
    ),
    NOTIFICATION_TYPE.EVENT_REMINDER: NotificationTemplate(
        title="Event Reminder",
        body="Reminder: '{title}' starts at {start}.",
        priority=NOTIFICATION_PRIORITY.HIGH,
    ),
    NOTIFICATION_TYPE.TASK_CREATED: NotificationTemplate(
        title="New Task Created",
        body="A new task '{title}' has been created.",
        priority=NOTIFICATION_PRIORITY.MEDIUM,
    ),
    NOTIFICATION_TYPE.TASK_ASSIGNED: NotificationTemplate(
        title="Task Assigned",
        body="You have been assigned to task '{title}'.",
        priority=NOTIFICATION_PRIORITY.HIGH,
    ),
    NOTIFICATION_TYPE.TASK_COMPLETED: NotificationTemplate(
        title="Task Completed",
        body="Task '{title}' has been marked as completed.",
        priority=NOTIFICATION_PRIORITY.LOW,
    ),
    NOTIFICATION_TYPE.TASK_OVERDUE: NotificationTemplate(
        title="Task Overdue",
        body="Task '{title}' is overdue. Please take action.",
        priority=NOTIFICATION_PRIORITY.URGENT,
    ),
    NOTIFICATION_TYPE.DEAL_CREATED: NotificationTemplate(
        title="New Deal Created",
        body="A new deal '{title}' has been created.",
        priority=NOTIFICATION_PRIORITY.MEDIUM,
    ),
    NOTIFICATION_TYPE.DEAL_STAGE_CHANGED: NotificationTemplate(
        title="Deal Stage Changed",
        body="Deal '{title}' has moved to stage '{stage}'.",
        priority=NOTIFICATION_PRIORITY.MEDIUM,
    ),
    NOTIFICATION_TYPE.DEAL_WON: NotificationTemplate(
        title="Deal Won",
        body="Congratulations! Deal '{title}' has been won.",
        priority=NOTIFICATION_PRIORITY.HIGH,
    ),
    NOTIFICATION_TYPE.DEAL_LOST: NotificationTemplate(
        title="Deal Lost",
        body="Deal '{title}' has been marked as lost.",
        priority=NOTIFICATION_PRIORITY.MEDIUM,
    ),
    NOTIFICATION_TYPE.LEAD_CREATED: NotificationTemplate(
        title="New Lead Created",
        body="A new lead '{title}' has been created.",
        priority=NOTIFICATION_PRIORITY.MEDIUM,
    ),
    NOTIFICATION_TYPE.LEAD_ASSIGNED: NotificationTemplate(
        title="Lead Assigned",
        body="Lead '{title}' has been assigned to you.",
        priority=NOTIFICATION_PRIORITY.HIGH,
    ),
    NOTIFICATION_TYPE.LEAD_CONVERTED: NotificationTemplate(
        title="Lead Converted",
        body="Lead '{title}' has been converted to a deal.",
        priority=NOTIFICATION_PRIORITY.HIGH,
    ),
    NOTIFICATION_TYPE.QUOTATION_SENT: NotificationTemplate(
        title="Quotation Sent",
        body="Quotation '{title}' has been sent to the client.",
        priority=NOTIFICATION_PRIORITY.MEDIUM,
    ),
    NOTIFICATION_TYPE.QUOTATION_ACCEPTED: NotificationTemplate(
        title="Quotation Accepted",
        body="Quotation '{title}' has been accepted.",
        priority=NOTIFICATION_PRIORITY.HIGH,
    ),
    NOTIFICATION_TYPE.QUOTATION_REJECTED: NotificationTemplate(
        title="Quotation Rejected",
        body="Quotation '{title}' has been rejected.",
        priority=NOTIFICATION_PRIORITY.MEDIUM,
    ),
    NOTIFICATION_TYPE.INVOICE_PAID: NotificationTemplate(
        title="Invoice Paid",
        body="Invoice '{title}' has been paid.",
        priority=NOTIFICATION_PRIORITY.HIGH,
    ),
    NOTIFICATION_TYPE.INVOICE_OVERDUE: NotificationTemplate(
        title="Invoice Overdue",
        body="Invoice '{title}' is overdue.",
        priority=NOTIFICATION_PRIORITY.URGENT,
    ),
    NOTIFICATION_TYPE.USER_INVITED: NotificationTemplate(
        title="User Invited",
        body="You have been invited to join the platform.",
        priority=NOTIFICATION_PRIORITY.MEDIUM,
    ),
    NOTIFICATION_TYPE.GENERAL: NotificationTemplate(
        title="Notification",
        body="{body}",
        priority=NOTIFICATION_PRIORITY.LOW,
    ),
    NOTIFICATION_TYPE.SYSTEM: NotificationTemplate(
        title="System Notification",
        body="{body}",
        priority=NOTIFICATION_PRIORITY.HIGH,
    ),
}


def get_notification_template(notification_type: NOTIFICATION_TYPE) -> NotificationTemplate:
    return NOTIFICATION_TEMPLATES.get(
        notification_type,
        NOTIFICATION_TEMPLATES[NOTIFICATION_TYPE.GENERAL],
    )


def render_notification(notification_type: NOTIFICATION_TYPE, variables: dict) -> tuple[str, str]:
    template = get_notification_template(notification_type)
    try:
        title = template.title.format(**variables)
        body = template.body.format(**variables)
    except KeyError:
        title = template.title
        body = template.body
    return title, body