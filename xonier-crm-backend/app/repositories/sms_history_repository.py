
from app.repositories.base_repository import BaseRepository
from app.db.models.communications.sms_hostory import SMSHistory

class SMSHistoryRepository(BaseRepository):
    def __init__(self):
        super().__init__(SMSHistory)

    