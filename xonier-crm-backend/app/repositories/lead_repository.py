from app.db.models.lead_model import LeadsModel
from app.repositories.base_repository import BaseRepository


class LeadRepository(BaseRepository):
    def __init__(self):
        super().__init__(LeadsModel)
        

    