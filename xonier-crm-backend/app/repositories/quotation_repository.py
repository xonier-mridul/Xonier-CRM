
from app.repositories.base_repository import BaseRepository
from app.db.models.enquiry_management_model import EnquiryModel

class QuotationRepository(BaseRepository):
    def __init__(self):
        super().__init__(EnquiryModel)

    