
from app.repositories.base_repository import BaseRepository
from app.db.models.calender_event_model import CalenderEventModel


class EventRepository(BaseRepository):
    def __init__(self):
        super().__init__(CalenderEventModel)

        