from app.db.models.campaign_model import CampaignModel
from app.repositories.base_repository import BaseRepository


class CampaignRepository(BaseRepository):
    def __init__(self):
        super().__init__(CampaignModel)
