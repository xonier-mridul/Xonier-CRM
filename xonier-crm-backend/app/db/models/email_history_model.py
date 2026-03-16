from beanie import Document, Link
from pydantic import Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pymongo import IndexModel, DESCENDING
from app.core.enums import EmailStatus

from app.db.models.user_model import UserModel
from app.db.models.email_template_model import EmailTemplateModel



class EmailHistoryModel(Document):

    
    template: Optional[Link[EmailTemplateModel]] = None  

    
    subject: str
    html_body: str
    text_body: Optional[str] = None

    
    variables_used: Dict[str, Any] = {}
    

    
    sent_by: Optional[Link[UserModel]] = None
    from_email: str
    from_name: Optional[str] = None
    to_emails: List[str]                             
    cc_emails: List[str] = []
    bcc_emails: List[str] = []
    reply_to: Optional[str] = None

    
    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    client_id: Optional[str] = None
    invoice_id: Optional[str] = None
    quotation_id: Optional[str] = None
    prospect_id: Optional[str] = None

    
    status: EmailStatus = EmailStatus.QUEUED
    provider: Optional[str] = None                  
    provider_message_id: Optional[str] = None       

    
    error_message: Optional[str] = None
    retry_count: int = 0

    
    opened_count: int = 0
    clicked_count: int = 0
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None

    
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "email_history"
        indexes = [
            IndexModel([("template", 1)], name="template_idx"),
            IndexModel([("sent_by", 1)], name="sent_by_idx"),
            IndexModel([("status", 1)], name="status_idx"),
            IndexModel([("lead_id", 1)], name="lead_idx"),
            IndexModel([("deal_id", 1)], name="deal_idx"),
            IndexModel([("client_id", 1)], name="client_idx"),
            IndexModel([("invoice_id", 1)], name="invoice_idx"),
            IndexModel([("to_emails", 1)], name="to_emails_idx"),
            IndexModel([("created_at", DESCENDING)], name="created_at_idx"),
        ]