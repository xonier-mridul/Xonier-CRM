
from app.repositories.base_repository import BaseRepository
from app.db.models.quotation_model import QuotationModel

class QuotationRepository(BaseRepository):
    def __init__(self):
        super().__init__(QuotationModel)

    