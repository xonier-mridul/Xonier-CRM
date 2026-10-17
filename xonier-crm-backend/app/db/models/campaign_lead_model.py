from beanie import Link, before_event, Save, Replace
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone
from pymongo import IndexModel
from app.core.enums import CAMPAIGN_LEAD_STATUS
from app.db.models.base_model import BaseDocument


class CampaignLeadModel(BaseDocument):
    """
    Junction document linking a Campaign to an existing Lead.

    A Lead may appear in multiple campaigns; each appearance produces one
    CampaignLeadModel document, uniquely constrained by (campaignId, leadId).

    Campaign-specific state (assignment, status) lives here and is fully
    independent of LeadsModel.assignedTo / LeadsModel.status.
    """

    campaignId: Link["CampaignModel"]
    leadId: Link["LeadsModel"]

    # Campaign-context assignment — single agent per lead per campaign.
    # Independent from LeadsModel.assignedTo (global assignment).
    assignedTo: Optional[Link["UserModel"]] = None
    assignedAt: Optional[datetime] = None
    assignedBy: Optional[Link["UserModel"]] = None

    # ON DEMAND: set when an agent atomically claims this lead.
    claimedAt: Optional[datetime] = None

    campaignStatus: CAMPAIGN_LEAD_STATUS = CAMPAIGN_LEAD_STATUS.UNASSIGNED

    # Extensible for future telephony/WhatsApp integration.
    notes: Optional[str] = Field(None, max_length=1000)
    lastContactedAt: Optional[datetime] = None

    # Import traceability — UUID per import batch operation.
    importBatch: Optional[str] = None
    importedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    importedBy: Link["UserModel"]

    completedAt: Optional[datetime] = None

    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "campaign_leads"
        use_state_management = True
        indexes = [
            # Core constraint: a lead can appear only once per campaign.
            IndexModel(
                [("campaignId.$id", 1), ("leadId.$id", 1)],
                unique=True,
                name="unique_campaign_lead"
            ),
            # Fast paginated lead listing per campaign, filtered by status.
            IndexModel(
                [("campaignId.$id", 1), ("campaignStatus", 1)],
                name="idx_cl_campaign_status"
            ),
            # Agent-specific lead listing within a campaign.
            IndexModel(
                [("campaignId.$id", 1), ("assignedTo.$id", 1)],
                name="idx_cl_campaign_agent"
            ),
            # Reverse lookup: all campaigns a specific lead belongs to.
            IndexModel(
                [("leadId.$id", 1)],
                name="idx_cl_lead"
            ),
            # Tenant-scoped campaign lookup.
            IndexModel(
                [("companyId", 1), ("campaignId.$id", 1)],
                name="idx_cl_company_campaign"
            ),
            # ON DEMAND atomic claim: find the oldest unassigned lead quickly.
            IndexModel(
                [("campaignId.$id", 1), ("campaignStatus", 1), ("importedAt", 1)],
                name="idx_cl_on_demand_claim"
            ),
        ]

    @before_event(Save, Replace)
    def update_timestamp(self):
        self.updatedAt = datetime.now(timezone.utc)


from app.db.models.campaign_model import CampaignModel
from app.db.models.lead_model import LeadsModel
from app.db.models.user_model import UserModel
CampaignLeadModel.model_rebuild()
