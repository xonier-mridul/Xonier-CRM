
from app.repositories.base_repository import BaseRepository
from app.db.models.quotation_history_model import QuotationHistoryModel 

class QuotationHistoryRepository(BaseRepository):
    def __init__(self):
        super().__init__(QuotationHistoryModel)