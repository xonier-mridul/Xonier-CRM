from enum import Enum


class NOTIFICATION_TYPE(str, Enum):
    EVENT_CREATED = "event_created"
    EVENT_UPDATED = "event_updated"
    EVENT_DELETED = "event_deleted"
    EVENT_REMINDER = "event_reminder"

    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"
    TASK_OVERDUE = "task_overdue"

    DEAL_CREATED = "deal_created"
    DEAL_UPDATED = "deal_updated"
    DEAL_STAGE_CHANGED = "deal_stage_changed"
    DEAL_WON = "deal_won"
    DEAL_LOST = "deal_lost"

    LEAD_CREATED = "lead_created"
    LEAD_ASSIGNED = "lead_assigned"
    LEAD_UPDATED = "lead_updated"
    LEAD_CONVERTED = "lead_converted"

    QUOTATION_CREATED = "quotation_created"
    QUOTATION_SENT = "quotation_sent"
    QUOTATION_ACCEPTED = "quotation_accepted"
    QUOTATION_REJECTED = "quotation_rejected"

    INVOICE_CREATED = "invoice_created"
    INVOICE_PAID = "invoice_paid"
    INVOICE_OVERDUE = "invoice_overdue"

    USER_INVITED = "user_invited"
    USER_REGISTERED = "user_registered"

    GENERAL = "general"
    SYSTEM = "system"


class NOTIFICATION_ENTITY_TYPE(str, Enum):
    EVENT = "event"
    TASK = "task"
    DEAL = "deal"
    LEAD = "lead"
    QUOTATION = "quotation"
    INVOICE = "invoice"
    USER = "user"
    COMPANY = "company"
    GENERAL = "general"
    SYSTEM = "system"


class NOTIFICATION_STATUS(str, Enum):
    UNREAD = "unread"
    READ = "read"
    ARCHIVED = "archived"


class NOTIFICATION_PRIORITY(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"