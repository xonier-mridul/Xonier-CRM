from app.repositories.base_repository import BaseRepository
from app.db.models.communications.email_history_model import EmailHistoryModel


class EmailHistoryRepository(BaseRepository):
    def __init__(self):
        super().__init__(EmailHistoryModel)
