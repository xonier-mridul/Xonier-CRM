from app.repositories.base_repository import BaseRepository
from app.db.models.invoice_model import InvoiceModel


class InvoiceRepository(BaseRepository):
    def __init__(self):
        super().__init__(InvoiceModel)

        