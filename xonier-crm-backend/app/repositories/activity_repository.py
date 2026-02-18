from app.db.models.activity_model import ActivityModel
from app.repositories.base_repository import BaseRepository



class ActivityRepository(BaseRepository):
    def __init__(self):
        super().__init__(ActivityModel)

