from app.db.models.campaign_lead_model import CampaignLeadModel
from app.repositories.base_repository import BaseRepository


class CampaignLeadRepository(BaseRepository):
    def __init__(self):
        super().__init__(CampaignLeadModel)
